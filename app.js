/* FIREBASE */
const firebaseConfig={
 apiKey:"AIzaSyD1q478zLS8BKOaN6ySTid7QW1es4No92I",
 authDomain:"sassta-bazar.firebaseapp.com",
 projectId:"sassta-bazar",
 storageBucket:"sassta-bazar.firebasestorage.app",
 messagingSenderId:"553784080865",
 appId:"1:553784080865:web:192885a48a80f075cbfaa0"
};

let auth=null;
let sellerAuth=null;
let db=null;
let sellerDb=null;
let googleProvider=null;
let facebookProvider=null;
let sellerGoogleProvider=null;
let sellerFacebookProvider=null;
let firebaseReady=false;
let persistenceReady=Promise.resolve();
let sellerPersistenceReady=Promise.resolve();

try{
 if(typeof firebase!=="undefined"){
  if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
  auth=firebase.app().auth();

  let sellerApp=firebase.apps.find(app=>app.name==="sellerAuth");
  if(!sellerApp)sellerApp=firebase.initializeApp(firebaseConfig,"sellerAuth");
  sellerAuth=sellerApp.auth();

  db=firebase.firestore();
  sellerDb=sellerApp.firestore();

  googleProvider=new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({prompt:"select_account"});
  facebookProvider=new firebase.auth.FacebookAuthProvider();
  facebookProvider.addScope("email");

  sellerGoogleProvider=new firebase.auth.GoogleAuthProvider();
  sellerGoogleProvider.setCustomParameters({prompt:"select_account"});
  sellerFacebookProvider=new firebase.auth.FacebookAuthProvider();
  sellerFacebookProvider.addScope("email");

  firebaseReady=true;
  persistenceReady=auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(error=>console.error("Unable to set customer login persistence:",error));
  sellerPersistenceReady=sellerAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(error=>console.error("Unable to set seller login persistence:",error));
 }
}catch(firebaseError){
 console.error("Firebase initialization failed:",firebaseError);
 auth=null;sellerAuth=null;db=null;sellerDb=null;firebaseReady=false;
}

const categories=[
{name:"Girls Fabric",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=85"},
{name:"Restaurant",image:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=85"},
{name:"Boys Fabric",image:"https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=800&q=85"},
{name:"Shop",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=85"},
{name:"Home Food",image:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85"},
{name:"Accessories",image:"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=85"}
];

let activeCategory="",activeSeller=null,currentSellerId=null;
let selectedProductImage="",selectedProfileImage="";
let editingProfile=false,editingProductId=null;
let creatingNewShop=false;
let sellerRegistrationPending=false;
let sellers=[],complaints=[];
let authReady=false;
let followCountUnsubscribe=null;
let initialAuthResolved=false;
let customerRouteUid=null;
let customerRoutePromise=null;
let currentCustomerProfile=null;
let customerCart=[];

let messengerConversationRef=null;
let messengerMessagesUnsubscribe=null;
let messengerCurrentConversation=null;
let messengerCurrentUser=null;
let messengerCurrentRole="";
let messengerInboxMode=false;
let messengerSelectedImage="";
let messengerBusy=false;
let allConversationsList=[];

function updateRoleUI(){
 const isSellerActive = currentSellerId !== null && sellerAuth && sellerAuth.currentUser;
 const floatBar = document.getElementById("floatingCustomerBar");
 if(floatBar){
  if(isSellerActive){
   floatBar.classList.add("hidden");
  }else{
   if(auth && auth.currentUser){
    floatBar.classList.remove("hidden");
   }else{
    floatBar.classList.add("hidden");
   }
  }
 }
}

function waitForSellerAuthState(){
 return new Promise(resolve=>{
  let unsubscribe=null;
  let finished=false;

  const finish=user=>{
   if(finished)return;
   finished=true;
   if(unsubscribe)unsubscribe();
   resolve(user||null);
  };

  unsubscribe=sellerAuth.onAuthStateChanged(
   user=>finish(user),
   error=>{
    console.error("Seller authentication restore error:",error);
    finish(sellerAuth.currentUser||null);
   }
  );
 });
}

async function compressImage(file){
 if(!file||!file.type||!file.type.startsWith("image/"))throw new Error("Please select a valid image.");
 if(file.size>12*1024*1024)throw new Error("Please select an image smaller than 12 MB.");
 const imageURL=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Unable to read this image."));img.src=imageURL});
  const canvas=document.createElement("canvas");
  const maxSide=750;
  const ratio=Math.min(1,maxSide/Math.max(img.width,img.height));
  canvas.width=Math.max(1,Math.round(img.width*ratio));
  canvas.height=Math.max(1,Math.round(img.height*ratio));
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  let quality=0.65;
  let dataURL=canvas.toDataURL("image/jpeg",quality);
  while(dataURL.length>480000&&quality>0.30){quality-=0.08;dataURL=canvas.toDataURL("image/jpeg",quality)}
  if(dataURL.length>480000)throw new Error("This photo is too large. Please select a smaller photo.");
  return dataURL;
 }finally{URL.revokeObjectURL(imageURL)}
}

function safeImage(url){return typeof url==="string"&&(/^https?:\/\//i.test(url)||/^data:image\//i.test(url))}
function makeImage(url,icon){
 if(safeImage(url))return '<img class="avatar" src="'+url+'" alt="Photo">';
 return '<div class="avatar">'+icon+'</div>';
}
function sellerRef(id){
 if(!sellerDb)throw new Error("Seller database is unavailable. Please check your internet connection and Firebase setup.");
 return sellerDb.collection("sellers").doc(id);
}
function customerRef(id){
 if(!db)throw new Error("Customer database is unavailable. Please check your internet connection and Firebase setup.");
 return db.collection("sellers").doc(id);
}
function showError(prefix,error){
 console.error(prefix,error);
 alert(prefix+": "+(error&&error.message?error.message:"Please try again."));
}

function lastShopStorageKey(userUid){return "sb_last_shop_"+String(userUid||"")}
function rememberLastShop(userUid,shopId){
 if(!userUid||!shopId)return;
 try{localStorage.setItem(lastShopStorageKey(userUid),String(shopId))}catch(error){console.warn("Unable to remember last shop:",error)}
}
function getLastShop(userUid){
 try{return localStorage.getItem(lastShopStorageKey(userUid))||""}catch(error){return ""}
}
function isOwnedByUser(shop,userUid){
 if(!shop||!userUid)return false;
 return shop.ownerUid===userUid||shop.uid===userUid||shop.id===userUid;
}
function getMyShops(userUid){
 const owned=sellers.filter(shop=>isOwnedByUser(shop,userUid));
 const canonical=owned.find(shop=>String(shop.id)===String(userUid));
 return canonical?[canonical]:owned.slice(0,1);
}

async function loadMyShops(userUid){
 if(!sellerDb||!sellerAuth||!sellerAuth.currentUser)throw new Error("Please sign in to your seller account again.");
 if(sellerAuth.currentUser.uid!==userUid)throw new Error("Seller account changed. Please sign in again.");

 const shopMap=new Map();
 const ownedSnapshot=await sellerDb.collection("sellers").where("ownerUid","==",userUid).get();
 ownedSnapshot.forEach(doc=>{
  const data=doc.data()||{};
  shopMap.set(doc.id,{id:doc.id,...data});
 });

 const originalDoc=await sellerDb.collection("sellers").doc(userUid).get();
 if(originalDoc.exists){
  const data=originalDoc.data()||{};
  if(isOwnedByUser({...data,id:originalDoc.id},userUid)){
   shopMap.set(originalDoc.id,{id:originalDoc.id,...data});
  }else{
   throw new Error("This account's shop ID is already in use by another account. Please contact support.");
  }
 }

 const allOwned=Array.from(shopMap.values()).filter(shop=>isOwnedByUser(shop,userUid));
 if(!allOwned.length)return [];

 const chosen=allOwned.find(shop=>String(shop.id)===String(userUid))||allOwned[0];
 const productSnapshot=await sellerDb.collection("products").where("sellerId","==",String(chosen.id)).get();
 const productMap=new Map();
 productSnapshot.forEach(doc=>{
  const product={id:doc.id,...(doc.data()||{})};
  const key=String(product.sellerId||"");
  if(!productMap.has(key))productMap.set(key,[]);
  productMap.get(key).push(product);
 });

 chosen.firebaseUid=userUid;
 chosen.ownerUid=chosen.ownerUid||chosen.uid||userUid;
 chosen.products=productMap.get(String(chosen.id))||[];

 sellers=sellers.filter(shop=>!isOwnedByUser(shop,userUid)||String(shop.id)===String(chosen.id));
 const index=sellers.findIndex(item=>String(item.id)===String(chosen.id));
 if(index>=0)sellers[index]={...sellers[index],...chosen};
 else sellers.push(chosen);

 return [chosen];
}

function shopLimitReached(userUid){return getMyShops(userUid).length>=1}

async function showMyShops(){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user){showSection("login");return}
 try{
  const owned=await loadMyShops(user.uid);
  if(owned.length){selectMyShop(owned[0].id);return}
  alert("Your shop has not been registered yet.");
  showSection("registration");
 }catch(error){showError("Unable to open your shop",error)}
}
function renderMyShopChoices(){
 const user=sellerAuth&&sellerAuth.currentUser;
 const box=document.getElementById("myShopChoices");
 const addButton=document.getElementById("addSecondShopButton");
 box.innerHTML="";
 if(!user){
  document.getElementById("shopChooserMessage").textContent="Please sign in to your seller account.";
  if(addButton)addButton.classList.add("hidden");
  return;
 }
 const owned=getMyShops(user.uid);
 owned.forEach(shop=>{
  const row=document.createElement("div");row.className="shop-choice";
  const photo=document.createElement("div");
  photo.innerHTML=safeImage(shop.dp)?'<img class="profile-photo" src="'+shop.dp+'" alt="Shop">':'<div class="profile-placeholder">🏪</div>';
  const info=document.createElement("div");info.className="shop-choice-info";
  const name=document.createElement("h3");name.textContent=shop.name||"Business";
  const category=document.createElement("p");category.textContent=shop.category||"Category not set";
  info.append(name,category);
  const choose=document.createElement("button");choose.type="button";choose.className="green";choose.textContent="Open";
  choose.onclick=()=>selectMyShop(shop.id);
  row.append(photo,info,choose);box.appendChild(row);
 });
 document.getElementById("shopChooserMessage").textContent=owned.length?"Your saved shop is ready.":"No shop registered yet.";
 if(addButton)addButton.classList.add("hidden");
}
function selectMyShop(shopId){
 const shop=sellers.find(s=>String(s.id)===String(shopId));
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!shop||!user||!isOwnedByUser(shop,user.uid)){alert("This shop could not be opened for the signed-in account.");return}
 currentSellerId=shop.id;
 rememberLastShop(user.uid,shop.id);
 creatingNewShop=false;sellerRegistrationPending=false;activeSeller=null;
 showDashboard();
}
async function registerAnotherShop(){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user||user.isAnonymous){sellerRegistrationPending=true;showSection("login");return}
 try{
  const owned=await loadMyShops(user.uid);
  if(owned.length){
   alert("This Google or Facebook account already has its one shop. You can edit the saved shop profile.");
   currentSellerId=owned[0].id;
   showDashboard();
   return;
  }
  currentSellerId=null;creatingNewShop=true;editingProfile=false;activeCategory="";
  resetRegistration();
  document.getElementById("registrationHeading").textContent="Seller Registration";
  renderRegistrationCategories();showSection("registrationCategory");
 }catch(error){showError("Unable to check your shop",error)}
}

async function routeCustomerUser(user){
 if(!user){currentCustomerProfile=null;customerRouteUid=null;showSection("customerLogin");updateRoleUI();return}
 if(!db){
  document.getElementById("customerRegistrationMessage").textContent="Firebase database is unavailable. Please check your connection and try again.";
  showSection("customerRegistration");updateRoleUI();return;
 }
 if(customerRouteUid===user.uid&&customerRoutePromise)return customerRoutePromise;
 customerRouteUid=user.uid;
 customerRoutePromise=(async function(){
  try{
   const customerDoc=await db.collection("customers").doc(user.uid).get();
   if(customerDoc.exists){currentCustomerProfile=customerDoc.data()||{};showSection("home")}
   else{
    currentCustomerProfile=null;
    document.getElementById("customerRegistrationForm").reset();
    document.getElementById("customerRegistrationMessage").textContent="Please complete your customer account details.";
    showSection("customerRegistration");
   }
  }catch(error){
   console.error("Unable to check customer profile:",error);
   document.getElementById("customerRegistrationMessage").textContent="Unable to load your customer account. Check your internet connection and try again.";
   showSection("customerRegistration");
  }finally{
   updateRoleUI();
  }
 })();
 try{await customerRoutePromise}finally{customerRoutePromise=null}
}

document.getElementById("customerRegistrationForm").addEventListener("submit",async function(e){
 e.preventDefault();
 const user=auth&&auth.currentUser;
 const message=document.getElementById("customerRegistrationMessage");
 const button=document.getElementById("saveCustomerButton");
 if(!user){message.textContent="Please sign in with Google or Facebook first.";showSection("customerLogin");return}
 if(!db){message.textContent="Firebase database is unavailable. Please try again.";return}
 const fullName=document.getElementById("customerFullName").value.trim();
 const city=document.getElementById("customerCity").value.trim();
 const area=document.getElementById("customerArea").value.trim();
 const houseNumber=document.getElementById("customerHouseNumber").value.trim();
 if(!fullName||!city||!area||!houseNumber){message.textContent="Please complete all four fields.";return}
 button.disabled=true;button.textContent="Saving...";message.textContent="Saving your customer account...";
 try{
  const ref=db.collection("customers").doc(user.uid);
  const oldDoc=await ref.get();
  const customerData={uid:user.uid,fullName,city,area,houseNumber,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
  if(!oldDoc.exists)customerData.createdAt=firebase.firestore.FieldValue.serverTimestamp();
  await ref.set(customerData,{merge:true});
  currentCustomerProfile=customerData;customerRouteUid=user.uid;customerRoutePromise=null;
  message.textContent="Customer account saved successfully.";showSection("home");
 }catch(error){
  console.error("Customer profile save error:",error);
  message.textContent="Unable to save your account: "+(error.message||"Please try again.");
 }finally{button.disabled=false;button.textContent="Save and Continue"}
});

/* SHOPPING CART */
function addToCart(product,shop){
 customerCart.push({product,shop});
 alert(product.name+" added to your Shopping Cart!");
}
function openCartModal(){
 const box=document.getElementById("cartItemsList");
 box.innerHTML="";
 if(!customerCart.length){
  box.innerHTML='<p class="note" style="text-align:center;padding:20px;">Your Shopping Cart is empty.</p>';
  document.getElementById("cartModal").style.display="flex";
  return;
 }
 customerCart.forEach((item,index)=>{
  const div=document.createElement("div");div.className="item";
  div.innerHTML=makeImage(item.product.image,"📦")+'<div style="flex:1;min-width:0"><h3></h3><p class="price"></p><p><small>Shop: </small></p></div><button type="button" class="light" style="padding:5px 8px;">Remove</button>';
  div.querySelector("h3").textContent=item.product.name;
  div.querySelector(".price").textContent="Rs. "+item.product.price;
  div.querySelectorAll("p")[1].innerHTML='<small>Shop: '+item.shop.name+'</small>';
  div.querySelector("button").onclick=()=>{customerCart.splice(index,1);openCartModal();};
  box.appendChild(div);
 });
 document.getElementById("cartModal").style.display="flex";
}
function closeCartModal(){document.getElementById("cartModal").style.display="none";}

async function checkoutCart(){
 if(!customerCart.length){alert("Cart is empty.");return;}
 const customer=auth&&auth.currentUser;
 if(!customer){alert("Please sign in to your customer account to place order.");return;}
 if(!db){alert("Database unavailable.");return;}

 const confirmCheckout = confirm("Do you want to confirm your order and send it to shop messengers?");
 if(!confirmCheckout) return;

 try{
  const shopOrders = {};
  customerCart.forEach(item => {
   const sId = String(item.shop.id);
   if(!shopOrders[sId]) shopOrders[sId] = { shop: item.shop, products: [] };
   shopOrders[sId].products.push(item.product);
  });

  const custName = currentCustomerProfile && currentCustomerProfile.fullName ? currentCustomerProfile.fullName : (customer.displayName || "Customer");
  const custAddress = currentCustomerProfile ? (currentCustomerProfile.houseNumber + ", " + currentCustomerProfile.area + ", " + currentCustomerProfile.city) : "Address not set";

  for(const sId in shopOrders){
   const shopData = shopOrders[sId].shop;
   const prods = shopOrders[sId].products;
   let orderTotal = 0;
   let summaryText = "🛍️ **NEW SHOPPING CART ORDER**\n\n";
   summaryText += "👤 Customer: " + custName + "\n";
   summaryText += "📍 Address: " + custAddress + "\n";
   summaryText += "🛒 **Order Items:**\n";
   prods.forEach((p, idx) => {
    const priceVal = parseFloat(p.price) || 0;
    orderTotal += priceVal;
    summaryText += (idx + 1) + ". " + p.name + " - Rs. " + p.price + "\n";
   });
   summaryText += "\n💰 **Total Bill:** Rs. " + orderTotal;

   const conversationId = sId + "_" + customer.uid;
   const convRef = db.collection("conversations").doc(conversationId);
   const convSnap = await convRef.get();

   if(!convSnap.exists){
    await convRef.set({
     customerId: customer.uid,
     sellerId: sId,
     customerName: custName,
     sellerName: shopData.name || "Shop",
     lastMessage: "🛍️ New Order: Rs. " + orderTotal,
     lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
     updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
     blockedBy: [],
     deletedFor: [],
     createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
   }

   const msgRef = convRef.collection("messages").doc();
   await msgRef.set({
    senderId: customer.uid,
    senderName: custName,
    type: "text",
    text: summaryText,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
   });

   await convRef.update({
    lastMessage: "🛍️ New Order: Rs. " + orderTotal,
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    deletedFor: firebase.firestore.FieldValue.arrayRemove(customer.uid, shopData.ownerUid||sId)
   });
  }

  alert("Order placed successfully! Order details sent to Messenger.");
  customerCart = [];
  closeCartModal();
  openCustomerInbox();
 }catch(error){
  showError("Order placement failed", error);
 }
}

/* FOLLOW SYSTEM */
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

/* IMAGE PREVIEW */
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

/* PUBLIC SELLER LISTING */
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

/* CUSTOMER GOOGLE AND FACEBOOK LOGIN */
async function customerLogin(provider){
 const message=document.getElementById("customerLoginMessage");
 const googleButton=document.getElementById("customerGoogleButton");
 const facebookButton=document.getElementById("customerFacebookButton");
 if(!auth||!firebaseReady){message.textContent="Login service is unavailable. Please check your Firebase setup and internet connection.";return}
 googleButton.disabled=true;facebookButton.disabled=true;message.textContent="Opening "+provider+" sign-in...";
 try{
  await persistenceReady;
  let result;
  if(provider==="Google")result=await auth.signInWithPopup(googleProvider);
  else if(provider==="Facebook")result=await auth.signInWithPopup(facebookProvider);
  else throw new Error("Please choose Google or Facebook.");
  if(!result||!result.user)throw new Error("Login was not completed. Please try again.");
  await routeCustomerUser(result.user);
 }catch(error){
  console.error("Customer "+provider+" login error:",error);
  message.textContent=provider+" login failed: "+(error.message||"Please try again.");
 }finally{googleButton.disabled=false;facebookButton.disabled=false}
}
