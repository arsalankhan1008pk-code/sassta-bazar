const categories=[
{name:"Girls Fabric",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=85"},
{name:"Restaurant",image:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=85"},
{name:"Boys Fabric",image:"https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=800&q=85"},
{name:"Shop",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=85"},
{name:"Home Food",image:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85"},
{name:"Accessories",image:"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=85"}
];

async function ensureFollowerAuth(){
 if(!auth)throw new Error("Customer Authentication is unavailable.");
 if(auth.currentUser)return auth.currentUser;
 throw new Error("Please sign in to your customer account before following a shop.");
}
function followerRef(sellerId,followerId){
 if(!db)throw new Error("Customer database is unavailable.");
 return db.collection("followers").doc(String(sellerId)+"_"+String(followerId));
}
async function getFollowerCount(sellerId){
 if(!db)throw new Error("Customer database is unavailable.");
 const snapshot=await db.collection("followers").where("sellerId","==",String(sellerId)).get();
 return snapshot.size;
}
async function refreshCustomerFollow(sellerId,button,countElement){
 try{
  const count=await getFollowerCount(sellerId);
  if(countElement)countElement.textContent="Followers: "+count;
  const user=auth&&auth.currentUser;
  const shop=sellers.find(s=>String(s.id)===String(sellerId));
  const isOwnShop=user&&shop&&isOwnedByUser(shop,user.uid);
  if(user&&!isOwnShop){
   const doc=await followerRef(sellerId,user.uid).get();
   if(button){button.textContent=doc.exists?"Following ✓":"Follow";button.classList.toggle("followed",doc.exists)}
  }else if(button){button.textContent=isOwnShop?"Your Shop":"Follow";button.classList.remove("followed");button.disabled=!!isOwnShop}
 }catch(error){
  console.error("Unable to load follower information:",error);
  if(countElement)countElement.textContent="Followers unavailable";
  if(button){button.disabled=false;button.textContent="Follow"}
 }
}
async function toggleFollow(sellerId,button,countElement){
 if(!sellerId||!button)return;
 const originalText=button.textContent;button.disabled=true;button.textContent="Please wait...";
 try{
  const user=await ensureFollowerAuth();
  const shop=sellers.find(s=>String(s.id)===String(sellerId));
  if(shop&&isOwnedByUser(shop,user.uid)){alert("You cannot follow your own shop.");return}
  const ref=followerRef(sellerId,user.uid);
  const existing=await ref.get();
  if(existing.exists)await ref.delete();
  else await ref.set({sellerId:String(sellerId),uid:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  await refreshCustomerFollow(sellerId,button,countElement);
 }catch(error){showError("Unable to update Follow",error);button.textContent=originalText}
 finally{button.disabled=false}
}
async function refreshOwnerFollowers(){
 if(!currentSellerId)return;
 const button=document.getElementById("ownerFollow");button.textContent="Loading...";
 try{const count=await getFollowerCount(currentSellerId);button.textContent="Followers: "+count}
 catch(error){console.error("Unable to load followers:",error);button.textContent="Followers unavailable"}
}
function watchOwnerFollowers(){
 if(followCountUnsubscribe){followCountUnsubscribe();followCountUnsubscribe=null}
 if(!db||!currentSellerId)return;
 const button=document.getElementById("ownerFollow");button.textContent="Followers: ...";
 followCountUnsubscribe=db.collection("followers").where("sellerId","==",String(currentSellerId)).onSnapshot(snapshot=>{
  button.textContent="Followers: "+snapshot.size;
 },error=>{console.error("Follower count listener error:",error);button.textContent="Followers unavailable"});
}

document.getElementById("profileImageFile").addEventListener("change",async function(){
 const preview=document.getElementById("profileImagePreview");selectedProfileImage="";
 if(!this.files||!this.files[0]){preview.classList.add("hidden");return}
 try{selectedProfileImage=await compressImage(this.files[0]);preview.src=selectedProfileImage;preview.classList.remove("hidden")}
 catch(error){this.value="";preview.classList.add("hidden");alert(error.message)}
});
document.getElementById("productImageFile").addEventListener("change",async function(){
 const preview=document.getElementById("productImagePreview");selectedProductImage="";
 if(!this.files||!this.files[0]){preview.classList.add("hidden");return}
 try{selectedProductImage=await compressImage(this.files[0]);preview.src=selectedProductImage;preview.classList.remove("hidden")}
 catch(error){this.value="";preview.classList.add("hidden");alert(error.message)}
});

async function loadAllSellers(){
 if(!db){
  sellers=[];
  document.getElementById("sellerList").innerHTML='<div class="panel">Online shops are temporarily unavailable. Please check your internet connection and try again.</div>';
  return [];
 }
 const snapshot=await db.collection("sellers").get();
 const productSnapshot=await db.collection("products").get();
 const allProducts=productSnapshot.docs.map(p=>({id:p.id,...p.data()}));
 const publicResults=[];
 const ownerSeen=new Set();

 for(const doc of snapshot.docs){
  const data=doc.data()||{};
  const ownerKey=String(data.ownerUid||data.uid||doc.id);
  if(ownerSeen.has(ownerKey))continue;
  ownerSeen.add(ownerKey);
  const products=allProducts.filter(p=>String(p.sellerId||"")===String(doc.id));
  publicResults.push({
   id:doc.id,firebaseUid:ownerKey,
   ownerUid:ownerKey,
   category:data.category||"",name:data.name||"",bio:data.bio||"",
   dp:data.dp||"",offer:data.offer||"",products
  });
 }
 const owner=sellerAuth&&sellerAuth.currentUser;
 if(owner){
  const ownerShops=getMyShops(owner.uid);
  ownerShops.forEach(shop=>{
   const index=publicResults.findIndex(item=>String(item.id)===String(shop.id));
   if(index>=0)publicResults[index]={...publicResults[index],...shop};
   else if(!ownerSeen.has(String(owner.uid)))publicResults.push(shop);
  });
 }
 sellers=publicResults;
 if(activeCategory)renderSellerList(document.getElementById("sellerSearch").value||"");
 return sellers;
}

function renderCategories(){
 const box=document.getElementById("categories");box.innerHTML="";
 categories.forEach(function(c){
  const b=document.createElement("button");b.type="button";b.className="category";
  const pic=document.createElement("div");pic.className="catpic";
  const img=document.createElement("img");img.src=c.image;img.alt=c.name;img.loading="lazy";
  pic.appendChild(img);
  const title=document.createElement("strong");title.textContent=c.name;
  b.append(pic,title);b.onclick=()=>showCategory(c.name);box.appendChild(b);
 });
 document.getElementById("regCategory").innerHTML=categories.map(c=>'<option value="'+c.name+'">'+c.name+'</option>').join("");
 renderRegistrationCategories();
}
function renderRegistrationCategories(){
 const box=document.getElementById("registrationCategories");box.innerHTML="";
 const registrationLabels={"Girls Fabric":"Girls Fabric Registration","Boys Fabric":"Boys Fabric Registration","Home Food":"Home Food Registration","Shop":"Shop Registration","Restaurant":"Restaurant Registration","Accessories":"Accessories Registration"};
 categories.forEach(function(c){
  const b=document.createElement("button");b.type="button";b.className="registration-option";
  b.textContent=registrationLabels[c.name]||c.name+" Registration";
  b.onclick=()=>{activeCategory=c.name;document.getElementById("regCategory").value=c.name;startCategoryRegistration()};
  box.appendChild(b);
 });
}

function showSection(id){
 ["customerLogin","customerRegistration","home","registrationCategory","shopChooser","listing","detail","login","registration","dashboard","productUpload","complaint"].forEach(s=>{
  document.getElementById(s).classList.toggle("hidden",s!==id);
 });
 document.getElementById("headerBack").style.display=id==="home"||id==="customerLogin"||id==="customerRegistration"?"none":"block";
 document.getElementById("settingsButton").style.display=id==="customerLogin"||id==="customerRegistration"?"none":"block";
 updateRoleUI();
 window.scrollTo(0,0);
}
function headerBackAction(){
 const visible=id=>!document.getElementById(id).classList.contains("hidden");
 if(visible("listing"))goHome();
 else if(visible("registrationCategory"))goHome();
 else if(visible("shopChooser"))goHome();
 else if(visible("detail"))goListing();
 else if(visible("login"))registrationBack();
 else if(visible("registration"))registrationBack();
 else if(visible("dashboard"))goHome();
 else if(visible("productUpload"))showDashboard();
 else if(visible("complaint"))goHome();
}
function openSettings(){document.getElementById("settings").style.display="block"}
function closeSettings(){document.getElementById("settings").style.display="none"}
function openSection(id){closeSettings();showSection(id)}
function goHome(){showSection("home")}
function goListing(){showCategory(activeCategory)}
function openRegistrationCategories(){closeSettings();sellerRegistrationPending=false;renderRegistrationCategories();showSection("registrationCategory")}

function resetRegistration(){
 document.getElementById("regForm").reset();
 document.getElementById("regCategory").value=activeCategory;
 document.getElementById("regMessage").textContent="";
 selectedProfileImage="";editingProfile=false;
 document.getElementById("profileImagePreview").classList.add("hidden");
 document.getElementById("registrationHeading").textContent="Seller Registration";
}
function showCategory(category){
 activeCategory=category;
 document.getElementById("listTitle").textContent=category;
 document.getElementById("sellerSearch").value="";
 document.getElementById("sellerList").innerHTML='<div class="panel">Loading shops...</div>';
 showSection("listing");
 loadAllSellers().catch(error=>showError("Unable to load shops",error));
}
function runSearch(){renderSellerList(document.getElementById("sellerSearch").value)}
document.getElementById("sellerSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();runSearch()}});

async function startCategoryRegistration(){
 closeSettings();resetRegistration();
 creatingNewShop=true;currentSellerId=null;editingProfile=false;sellerRegistrationPending=true;
 document.getElementById("regCategory").value=activeCategory;
 document.getElementById("registrationHeading").textContent="Seller Registration";
 document.getElementById("loginMessage").textContent="Choose Google or Facebook to continue with your seller account.";
 showSection("login");
}

function renderSellerList(query){
 const term=(query||"").trim().toLowerCase();
 const found=sellers.filter(s=>s.category===activeCategory&&(!term||
  (s.name||"").toLowerCase().includes(term)||(s.bio||"").toLowerCase().includes(term)||
  (s.products||[]).some(p=>(p.name||"").toLowerCase().includes(term))));
 const box=document.getElementById("sellerList");box.innerHTML="";
 if(!found.length){box.innerHTML='<div class="panel">No matching shops or products found in this category.</div>';return}
 found.forEach(s=>{
  const el=document.createElement("div");el.className="item";
  el.innerHTML=makeImage(s.dp,"🏪")+'<div style="min-width:0;flex:1"><h3></h3><p></p><p></p><button type="button" class="green">View Profile</button></div>';
  el.querySelector("h3").textContent=s.name;
  el.querySelectorAll("p")[0].textContent="Category: "+s.category;
  el.querySelectorAll("p")[1].textContent=(s.bio||"").slice(0,75)+(s.bio&&s.bio.length>75?"…":"");
  el.querySelector("button").onclick=()=>showSeller(s.id);
  box.appendChild(el);
 });
}
function showSeller(id){
 activeSeller=sellers.find(s=>String(s.id)===String(id));if(!activeSeller)return;
 const s=activeSeller;const d=document.getElementById("sellerDetail");d.innerHTML="";
 const card=document.createElement("div");card.className="panel profile-card";
 card.innerHTML='<div class="profile-top"><div id="customerPhoto"></div><div class="profile-info"><h2 id="customerName"></h2><p id="customerCategory"></p></div></div><button id="customerBio" class="bio-toggle" type="button"></button><div id="customerOffer" class="offer-text hidden"></div><div class="profile-actions"><button type="button" id="followBtn" class="light">Follow</button><div id="customerFollowerCount" class="follow-count">Followers: Loading...</div><button type="button" class="light iconbtn" aria-label="Share" onclick="shareCurrentSeller()">↗</button><button type="button" class="green iconbtn" aria-label="Messenger" onclick="messageSeller()">💬</button></div>';
 d.appendChild(card);
 document.getElementById("customerPhoto").innerHTML=safeImage(s.dp)?'<img class="profile-photo" src="'+s.dp+'" alt="Business profile">':'<div class="profile-placeholder">🏪</div>';
 document.getElementById("customerName").textContent=s.name||"";
 document.getElementById("customerCategory").textContent=s.category||"";
 const bio=document.getElementById("customerBio");bio.dataset.expanded="false";
 bio.textContent=(s.bio||"").slice(0,100)+(s.bio&&s.bio.length>100?"…":"");
 bio.onclick=()=>{const full=bio.dataset.expanded!=="true";bio.dataset.expanded=String(full);bio.textContent=full?(s.bio||""):(s.bio||"").slice(0,100)+(s.bio&&s.bio.length>100?"…":"")};
 const offer=document.getElementById("customerOffer");
 if(s.offer){offer.textContent="🎉 Offer: "+s.offer;offer.classList.remove("hidden")}
 const fb=document.getElementById("followBtn");const countBox=document.getElementById("customerFollowerCount");
 fb.onclick=()=>toggleFollow(s.id,fb,countBox);
 refreshCustomerFollow(s.id,fb,countBox);renderCustomerProducts(s);showSection("detail");
}
function renderCustomerProducts(s){
 const box=document.getElementById("productList");box.innerHTML="";
 if(!s.products||!s.products.length)return;
 s.products.forEach(p=>{
  const row=document.createElement("div");row.className="item";
  row.innerHTML=makeImage(p.image,"📦")+'<div style="flex:1;min-width:0"><h3></h3><p class="price"></p><p class="qty"></p></div><button type="button" class="green" style="font-size:12px;padding:7px 10px;">Add to Cart</button>';
  row.querySelector("h3").textContent=p.name||"";
  row.querySelector(".price").textContent="Rs. "+p.price;
  row.querySelector(".qty").textContent="Quantity: "+(p.quantity||"Not specified");
  row.querySelector("button").onclick=()=>addToCart(p,s);
  box.appendChild(row);
 });
}

async function shareSellerProfile(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s){alert("Save your profile first.");return}
 await shareProfile(s);
}
async function shareCurrentSeller(){if(activeSeller)await shareProfile(activeSeller)}
async function shareProfile(s){
 const link=window.location.origin+window.location.pathname+"?seller="+encodeURIComponent(s.id);
 try{
  if(navigator.share)await navigator.share({title:s.name||"Sassta Bazar",text:(s.name||"Sassta Bazar")+" profile",url:link});
  else if(navigator.clipboard){await navigator.clipboard.writeText(link);alert("Profile link copied.")}
  else prompt("Copy profile link:",link);
 }catch(e){if(e.name!=="AbortError")alert("Unable to share. Please try again.")}
}
function toggleBio(id){
 const el=document.getElementById(id);const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s)return;
 const expanded=el.dataset.expanded!=="true";el.dataset.expanded=String(expanded);
 el.textContent=expanded?(s.bio||""):(s.bio||"").slice(0,100)+(s.bio&&s.bio.length>100?"…":"");
}

document.getElementById("regForm").addEventListener("submit",async function(e){
 e.preventDefault();
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user||user.isAnonymous){document.getElementById("regMessage").textContent="Please sign in with Google or Facebook first.";showSection("login");return}
 if(!sellerDb){document.getElementById("regMessage").textContent="Seller database is unavailable. Please try again later.";return}
 const saveButton=document.getElementById("saveProfileButton");saveButton.disabled=true;saveButton.textContent="Saving...";
 try{
  const owned=await loadMyShops(user.uid);
  let ref,oldData=null;

  if(editingProfile&&currentSellerId){
   const selectedShop=owned.find(s=>String(s.id)===String(currentSellerId));
   if(!selectedShop)throw new Error("This shop does not belong to your signed-in account.");
   ref=sellerRef(currentSellerId);
   const oldDoc=await ref.get();
   if(!oldDoc.exists)throw new Error("Your shop profile could not be found.");
   oldData=oldDoc.data()||{};
  }else{
   if(owned.length>=1){
    currentSellerId=owned[0].id;
    rememberLastShop(user.uid,currentSellerId);
    alert("This Google or Facebook account already has its one shop. You can edit the saved shop profile.");
    showDashboard();
    return;
   }
   ref=sellerRef(user.uid);
   const existingDoc=await ref.get();
   if(existingDoc.exists){
    const existingData=existingDoc.data()||{};
    if(!isOwnedByUser({...existingData,id:existingDoc.id},user.uid)){
     throw new Error("This shop ID is already in use by another account. Please contact support.");
    }
    oldData=existingData;
   }
  }

  const selectedCategory=document.getElementById("regCategory").value||activeCategory;
  const sellerData={
   uid:user.uid,ownerUid:user.uid,
   category:oldData?(oldData.category||selectedCategory):selectedCategory,
   name:document.getElementById("shopName").value.trim(),
   bio:document.getElementById("bio").value.trim(),
   dp:selectedProfileImage||(oldData?oldData.dp||"":""),
   offer:oldData?(oldData.offer||""):"",
   updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(!sellerData.category)throw new Error("Please select a category first.");
  if(!sellerData.name||!sellerData.bio)throw new Error("Please enter your business name and bio.");
  if(!oldData)sellerData.createdAt=firebase.firestore.FieldValue.serverTimestamp();

  await ref.set(sellerData,{merge:true});
  currentSellerId=ref.id;rememberLastShop(user.uid,ref.id);
  creatingNewShop=false;sellerRegistrationPending=false;editingProfile=false;selectedProfileImage="";
  document.getElementById("profileImageFile").value="";
  activeCategory=sellerData.category;
  await loadMyShops(user.uid);
  document.getElementById("regMessage").textContent="";
  showDashboard();
 }catch(error){
  showError("Unable to save profile",error);
  document.getElementById("regMessage").textContent="Profile could not be saved: "+(error&&error.message?error.message:"Check your internet connection and Firebase setup.");
 }finally{saveButton.disabled=false;saveButton.textContent="Save"}
});

function openProfileForEdit(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s)return;
 editingProfile=true;creatingNewShop=false;activeCategory=s.category;selectedProfileImage="";
 document.getElementById("regCategory").value=s.category;
 document.getElementById("shopName").value=s.name||"";
 document.getElementById("bio").value=s.bio||"";
 document.getElementById("regMessage").textContent="";
 document.getElementById("profileImageFile").value="";
 document.getElementById("registrationHeading").textContent="Edit Business Profile";
 const preview=document.getElementById("profileImagePreview");
 if(s.dp){preview.src=s.dp;preview.classList.remove("hidden")}else preview.classList.add("hidden");
 showSection("registration");
}
function editSavedProfile(){if(currentSellerId!==null)openProfileForEdit();else document.getElementById("regMessage").textContent="Save your profile first."}
async function registrationBack(){
 if(editingProfile){showDashboard();return}
 sellerRegistrationPending=false;creatingNewShop=false;
 const user=sellerAuth&&sellerAuth.currentUser;
 if(user&&!user.isAnonymous){
  try{
   const owned=await loadMyShops(user.uid);
   if(owned.length){currentSellerId=owned[0].id;showDashboard();return}
  }catch(error){console.error(error)}
 }
 showSection("registrationCategory");
}

function showDashboard(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));
 if(!s){showSection("home");return}
 const user=sellerAuth&&sellerAuth.currentUser;
 if(user&&isOwnedByUser(s,user.uid))rememberLastShop(user.uid,s.id);
 document.getElementById("savedProfilePhoto").innerHTML=safeImage(s.dp)?'<img class="profile-photo" src="'+s.dp+'" alt="Business profile">':'<div class="profile-placeholder">🏪</div>';
 document.getElementById("savedProfileName").textContent=s.name||"";
 document.getElementById("dashboardCategory").textContent=s.category||"";
 const bio=document.getElementById("savedProfileBio");bio.dataset.expanded="false";
 bio.textContent=(s.bio||"").slice(0,100)+(s.bio&&s.bio.length>100?"…":"");
 const offer=document.getElementById("sellerOffer");
 if(s.offer){offer.textContent="🎉 Offer: "+s.offer;offer.classList.remove("hidden")}else offer.classList.add("hidden");
 renderDashboardProducts();showSection("dashboard");watchOwnerFollowers();
}
function openProductUpload(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));
 if(!s){alert("Save your profile first.");showSection("registration");return}
 cancelProductEdit();renderMyProducts();document.getElementById("productSaveMessage").textContent="";
 showSection("productUpload");
}
function renderDashboardProducts(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));const box=document.getElementById("dashboardProducts");box.innerHTML="";
 if(!s||!s.products.length)return;
 s.products.forEach(p=>{
  const row=document.createElement("div");row.className="item";
  row.innerHTML=makeImage(p.image,"📦")+'<div style="flex:1;min-width:0"><h3></h3><p class="price"></p><p class="qty"></p></div>';
  row.querySelector("h3").textContent=p.name;row.querySelector(".price").textContent="Rs. "+p.price;
  row.querySelector(".qty").textContent="Quantity: "+(p.quantity||"Not specified");box.appendChild(row);
 });
}
function renderMyProducts(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));const box=document.getElementById("myProducts");box.innerHTML="";
 if(!s||!s.products.length){box.innerHTML='<div class="panel">You have not added any products yet.</div>';return}
 s.products.forEach(p=>{
  const row=document.createElement("div");row.className="item";
  row.innerHTML=makeImage(p.image,"📦")+'<div style="flex:1;min-width:0"><h3></h3><p class="price"></p><p class="qty"></p><div class="product-tools"><button type="button" class="light edit-product">Edit / Update</button><button type="button" class="light delete-product">Delete</button></div></div>';
  row.querySelector("h3").textContent=p.name;row.querySelector(".price").textContent="Rs. "+p.price;
  row.querySelector(".qty").textContent="Quantity: "+(p.quantity||"Not specified");
  row.querySelector(".edit-product").onclick=()=>editProduct(p.id);
  row.querySelector(".delete-product").onclick=()=>deleteProduct(p.id);box.appendChild(row);
 });
}
function editProduct(id){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s)return;
 const p=s.products.find(x=>x.id===id);if(!p)return;
 editingProductId=id;selectedProductImage="";
 document.getElementById("productImageFile").value="";
 document.getElementById("productName").value=p.name||"";
 document.getElementById("productPrice").value=p.price||"";
 document.getElementById("productQuantity").value=p.quantity||"";
 const preview=document.getElementById("productImagePreview");
 if(p.image){preview.src=p.image;preview.classList.remove("hidden")}else preview.classList.add("hidden");
 document.getElementById("productFormHeading").textContent="Update Product";
 document.getElementById("cancelProductEdit").classList.remove("hidden");
 document.getElementById("productForm").scrollIntoView({behavior:"smooth"});
}
function cancelProductEdit(){
 editingProductId=null;selectedProductImage="";
 document.getElementById("productForm").reset();
 document.getElementById("productImagePreview").classList.add("hidden");
 document.getElementById("productFormHeading").textContent="Upload Product";
 document.getElementById("cancelProductEdit").classList.add("hidden");
}

document.getElementById("productForm").addEventListener("submit",async function(e){
 e.preventDefault();
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user||user.isAnonymous||!currentSellerId){alert("Please sign in to your seller account again.");return}
 if(!sellerDb){alert("Seller database is unavailable. Please try again later.");return}
 const name=document.getElementById("productName").value.trim();
 const price=document.getElementById("productPrice").value;
 const quantity=document.getElementById("productQuantity").value.trim();
 if(!name||price===""){alert("Enter product name and price.");return}
 const saveButton=document.getElementById("saveProductButton");saveButton.disabled=true;saveButton.textContent="Saving...";
 const wasEditing=!!editingProductId;
 try{
  const sellerDocument=await sellerRef(currentSellerId).get();
  if(!sellerDocument.exists)throw new Error("Your seller profile was not found. Please save your profile first.");
  const sellerData=sellerDocument.data()||{};
  if((sellerData.ownerUid||sellerData.uid)!==user.uid)throw new Error("This shop does not belong to your signed-in seller account.");
  const sellerCategory=sellerData.category;
  if(!sellerCategory||!categories.some(c=>c.name===sellerCategory))throw new Error("Your seller category is missing or invalid. Please check your seller profile.");

  const productsRef=sellerDb.collection("products");let existingProduct=null;
  if(editingProductId){
   const oldProduct=await productsRef.doc(editingProductId).get();
   if(oldProduct.exists){
    existingProduct=oldProduct.data();
    if(String(existingProduct.sellerId)!==String(currentSellerId))throw new Error("This product does not belong to the selected shop.");
   }else throw new Error("This product no longer exists. Please refresh and try again.");
  }
  const productData={
   sellerId:String(currentSellerId),category:sellerCategory,name,price,quantity,
   image:selectedProductImage||(existingProduct?existingProduct.image||"":""),
   updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(editingProductId)await productsRef.doc(editingProductId).update(productData);
  else{productData.createdAt=firebase.firestore.FieldValue.serverTimestamp();await productsRef.add(productData)}
  await loadMyShops(user.uid);
  activeSeller=sellers.find(s=>String(s.id)===String(currentSellerId))||null;
  cancelProductEdit();renderMyProducts();renderDashboardProducts();
  document.getElementById("productSaveMessage").textContent=wasEditing?"Product updated successfully.":"Product saved successfully.";
 }catch(error){
  showError("Unable to save product",error);
  document.getElementById("productSaveMessage").textContent="Product was not saved: "+(error&&error.message?error.message:"Please try again.");
 }finally{saveButton.disabled=false;saveButton.textContent="Save Product"}
});

async function deleteProduct(id){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user||user.isAnonymous||!currentSellerId){alert("Please sign in to your seller account again.");return}
 if(!sellerDb){alert("Seller database is unavailable.");return}
 if(!confirm("Are you sure you want to delete this product?"))return;
 try{
  const shopDoc=await sellerRef(currentSellerId).get();
  if(!shopDoc.exists)throw new Error("Shop profile not found.");
  const shopData=shopDoc.data()||{};
  if((shopData.ownerUid||shopData.uid)!==user.uid)throw new Error("This shop does not belong to your seller account.");
  const productRef=sellerDb.collection("products").doc(id);
  const productDoc=await productRef.get();
  if(!productDoc.exists)throw new Error("Product not found.");
  if(String(productDoc.data().sellerId)!==String(currentSellerId))throw new Error("This product does not belong to the selected shop.");
  await productRef.delete();
  await loadMyShops(user.uid);renderMyProducts();renderDashboardProducts();
 }catch(error){showError("Unable to delete product",error)}
}

document.getElementById("complaintForm").addEventListener("submit",function(e){
 e.preventDefault();
 const message=document.getElementById("complaintText").value.trim();if(!message)return;
 try{
  complaints=JSON.parse(localStorage.getItem("sb_complaints")||"[]");
  complaints.push({text:message,date:new Date().toISOString()});
  localStorage.setItem("sb_complaints",JSON.stringify(complaints));
  this.reset();alert("Your message has been saved on this device.");
 }catch(error){alert("Unable to save your message.")}
});

renderCategories();
