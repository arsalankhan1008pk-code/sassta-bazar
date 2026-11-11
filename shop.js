/* SELLER LOGIN */
async function demoLogin(provider){
 const message=document.getElementById("loginMessage");
 const buttons=document.querySelectorAll("#login .loginbtn");

 try{
  if(!sellerAuth||!firebaseReady){
   message.textContent="Seller login service is unavailable. Please check the Firebase connection and try again.";
   return;
  }

  buttons.forEach(button=>button.disabled=true);
  await sellerPersistenceReady;

  const requestedProviderId=provider==="Google"?"google.com":
   provider==="Facebook"?"facebook.com":"";

  if(!requestedProviderId){
   throw new Error("Please choose Google or Facebook.");
  }

  const existingUser=await waitForSellerAuthState();

  if(existingUser&&!existingUser.isAnonymous){
   const hasRequestedProvider=(existingUser.providerData||[])
    .some(info=>info&&info.providerId===requestedProviderId);

   if(hasRequestedProvider){
    await handleSignedInUser(existingUser);
    return;
   }

   message.textContent="Switching to "+provider+" seller account...";
   await sellerAuth.signOut();
  }

  message.textContent="Opening "+provider+" seller sign-in...";
  let result;

  if(provider==="Google"){
   result=await sellerAuth.signInWithPopup(sellerGoogleProvider);
  }else if(provider==="Facebook"){
   result=await sellerAuth.signInWithPopup(sellerFacebookProvider);
  }

  if(result&&result.user){
   await handleSignedInUser(result.user);
  }else{
   throw new Error("Login was not completed. Please try again.");
  }

 }catch(error){
  console.error("Seller "+provider+" login error:",error);
  let messageText=error.message||"Please try again.";
  if(error.code==="auth/account-exists-with-different-credential")messageText="This email is already registered with another sign-in method. Sign in using that method first.";
  else if(error.code==="auth/unauthorized-domain")messageText="This website domain is not authorized in Firebase Authentication.";
  else if(error.code==="auth/operation-not-allowed")messageText="Facebook sign-in is not enabled correctly in Firebase Authentication.";
  else if(error.code==="auth/popup-blocked")messageText="The sign-in popup was blocked. Allow popups and try again.";
  else if(error.code==="permission-denied")messageText="Firebase Rules are blocking access to your shop. Update the seller ownership rules.";
  message.textContent="Seller login failed: "+messageText;
 }finally{
  buttons.forEach(button=>button.disabled=false);
 }
}

async function handleSignedInUser(user){
 if(!user||user.isAnonymous)return;
 if(!sellerDb)throw new Error("Seller database is unavailable.");
 currentSellerId=null;

 const owned=await loadMyShops(user.uid);

 if(owned.length){
  const lastShopId=getLastShop(user.uid);
  const selectedShop=owned.find(shop=>String(shop.id)===String(lastShopId))||owned[0];
  currentSellerId=selectedShop.id;
  rememberLastShop(user.uid,selectedShop.id);
  creatingNewShop=false;sellerRegistrationPending=false;
  showDashboard();
  return;
 }

 if(sellerRegistrationPending){
  currentSellerId=null;creatingNewShop=true;editingProfile=false;
  document.getElementById("regCategory").value=activeCategory;
  document.getElementById("registrationHeading").textContent="Seller Registration";
  document.getElementById("regMessage").textContent="Login successful. Complete your business registration.";
  sellerRegistrationPending=false;showSection("registration");return;
 }

 creatingNewShop=false;
 currentSellerId=null;resetRegistration();
 document.getElementById("registrationHeading").textContent="Seller Registration";
 document.getElementById("regMessage").textContent="Login successful. Complete your business registration.";
 showSection("registration");
}

/* RESTORE CUSTOMER SESSION */
if(auth){
 auth.onAuthStateChanged(async function(user){
  try{await persistenceReady}catch(error){console.error("Customer login persistence check failed:",error)}
  authReady=true;
  if(!initialAuthResolved){
   initialAuthResolved=true;
   if(user){
    activeSeller=null;
    await routeCustomerUser(user);
   }else{
    activeSeller=null;
    showSection("customerLogin");
    updateRoleUI();
   }
   return;
  }
  if(user){
   activeSeller=null;
   await routeCustomerUser(user);
  }else{
   activeSeller=null;currentCustomerProfile=null;customerRouteUid=null;customerRoutePromise=null;
   closeSettings();showSection("customerLogin");
   updateRoleUI();
  }
 });
}else{
 initialAuthResolved=true;showSection("customerLogin");
 document.getElementById("customerLoginMessage").textContent="Firebase login is unavailable. Please check your Firebase configuration.";
 updateRoleUI();
}

/* CATEGORY DISPLAY */
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

/* RENDER PUBLIC SELLER LIST */
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

/* SAVE SELLER PROFILE */
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

/* SAVE PRODUCT */
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

/* SELLER LOGOUT */
async function logoutSeller(){
 if(!sellerAuth){alert("Seller login service is unavailable.");return}
 try{
  if(followCountUnsubscribe){followCountUnsubscribe();followCountUnsubscribe=null}
  currentSellerId=null;
  activeSeller=null;
  editingProfile=false;
  editingProductId=null;
  creatingNewShop=false;
  sellerRegistrationPending=false;
  closeSettings();
  closeMessenger();
  showSection("home");
  updateRoleUI();
 }catch(error){
  showError("Seller logout error",error);
 }
}
