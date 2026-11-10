/* --- CUSTOM UI MODAL SYSTEM (No HTML changes needed) --- */
function injectCustomModal() {
  if(document.getElementById("sbCustomModal")) return;
  const modalHtml = `
  <div id="sbCustomModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:999999; justify-content:center; align-items:center; opacity:0; transition: opacity 0.3s ease;">
    <div style="background:white; padding:24px; border-radius:12px; max-width:320px; width:90%; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-family:sans-serif; transform: scale(0.9); transition: transform 0.3s ease;" id="sbCustomModalContent">
      <h3 id="sbCustomModalTitle" style="margin-top:0; color:#222; font-size:18px; font-weight:bold;">Message</h3>
      <p id="sbCustomModalText" style="color:#555; font-size:15px; margin:15px 0 25px 0; line-height:1.5; white-space: pre-wrap; word-wrap: break-word;"></p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="sbCustomModalCancel" type="button" style="padding:10px 16px; border-radius:8px; border:1px solid #ddd; background:#f5f5f5; color:#333; cursor:pointer; display:none; font-weight:bold; flex:1;">Cancel</button>
        <button id="sbCustomModalOk" type="button" style="padding:10px 20px; border-radius:8px; border:none; cursor:pointer; background:#28a745; color:white; font-weight:bold; flex:1;">OK</button>
      </div>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectCustomModal);
} else {
  injectCustomModal();
}

let sbModalResolve = null;

function showSbModal(title, text, isConfirm) {
  return new Promise((resolve) => {
    injectCustomModal(); 
    const modal = document.getElementById("sbCustomModal");
    const modalContent = document.getElementById("sbCustomModalContent");
    document.getElementById("sbCustomModalTitle").textContent = title || "Sassta Bazar";
    document.getElementById("sbCustomModalText").textContent = text;

    const cancelBtn = document.getElementById("sbCustomModalCancel");
    const okBtn = document.getElementById("sbCustomModalOk");

    if (isConfirm) {
      cancelBtn.style.display = "block";
      okBtn.textContent = "Confirm";
      okBtn.style.background = "#28a745"; 
    } else {
      cancelBtn.style.display = "none";
      okBtn.textContent = "OK";
      okBtn.style.background = "#007bff"; 
    }

    sbModalResolve = resolve;
    modal.style.display = "flex";
    
    void modal.offsetWidth;
    modal.style.opacity = "1";
    modalContent.style.transform = "scale(1)";

    cancelBtn.onclick = () => closeSbModal(false);
    okBtn.onclick = () => closeSbModal(true);
  });
}

function closeSbModal(result) {
  const modal = document.getElementById("sbCustomModal");
  const modalContent = document.getElementById("sbCustomModalContent");
  modal.style.opacity = "0";
  modalContent.style.transform = "scale(0.9)";
  setTimeout(() => {
    modal.style.display = "none";
    if (sbModalResolve) {
      sbModalResolve(result);
      sbModalResolve = null;
    }
  }, 300);
}

function customAlert(text, title="Sassta Bazar") {
  showSbModal(title, text, false);
}

function customConfirm(text, title="Confirm Action") {
  return showSbModal(title, text, true);
}
/* -------------------------------------------------------- */


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
let selectedPaymentMethod="";

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
 customAlert(prefix+": "+(error&&error.message?error.message:"Please try again."), "Error");
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
  customAlert("Your shop has not been registered yet.", "Shop Not Found");
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
 if(!shop||!user||!isOwnedByUser(shop,user.uid)){customAlert("This shop could not be opened for the signed-in account.", "Access Denied");return}
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
   customAlert("This Google or Facebook account already has its one shop. You can edit the saved shop profile.", "Account Notice");
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

/* SHOPPING CART & PAYMENT FLOW (FIXED & CLEAN) */
function addToCart(product,shop){
 customerCart.push({product,shop});
 customAlert(product.name+" added to your Shopping Cart! ✅", "Cart Updated");
}

function onPaymentSelect(method){
 selectedPaymentMethod=method;
 const okBtn=document.getElementById("ok-payment-btn");
 if(okBtn) okBtn.disabled=false;
}

function confirmPaymentMethod(){
 if(!selectedPaymentMethod){
  customAlert("Mahrbani karke payment method select karein!", "Select Payment");
  return;
 }
 const detailsForm=document.getElementById("payment-user-details");
 const methodTitle=document.getElementById("selected-payment-title");
 if(methodTitle) methodTitle.textContent="Selected Payment Method: "+selectedPaymentMethod;
 if(detailsForm) detailsForm.style.display="block";
}

function openCartModal(){
 const box=document.getElementById("cartItemsList");
 box.innerHTML="";
 selectedPaymentMethod="";

 if(!customerCart.length){
  box.innerHTML='<p class="note" style="text-align:center;padding:20px;">Your Shopping Cart is empty.</p>';
  document.getElementById("cartModal").style.display="flex";
  return;
 }

 let grandTotal = 0;

 customerCart.forEach((item,index)=>{
  const priceVal = parseFloat(item.product.price) || 0;
  grandTotal += priceVal;

  const div=document.createElement("div");div.className="item";
  div.innerHTML=makeImage(item.product.image,"📦")+'<div style="flex:1;min-width:0"><h3></h3><p class="price"></p><p><small>Shop: </small></p></div><button type="button" class="light" style="padding:5px 8px;">Remove</button>';
  div.querySelector("h3").textContent=item.product.name;
  div.querySelector(".price").textContent="Rs. "+item.product.price;
  div.querySelectorAll("p")[1].innerHTML='<small>Shop: '+item.shop.name+'</small>';
  div.querySelector("button").onclick=()=>{customerCart.splice(index,1);openCartModal();};
  box.appendChild(div);
 });

 // Total Price Display Bar
 const totalDiv = document.createElement("div");
 totalDiv.style.cssText = "margin:10px 0;padding:10px;background:#f1f8f5;border-radius:6px;display:flex;justify-content:space-between;font-weight:bold;font-size:16px;color:#28a745;";
 totalDiv.innerHTML = `<span>Total Bill:</span><span>Rs. ${grandTotal}</span>`;
 box.appendChild(totalDiv);

 const defaultName = (currentCustomerProfile && currentCustomerProfile.fullName) ? currentCustomerProfile.fullName : "";
 const paymentContainer = document.createElement("div");
 paymentContainer.style.cssText = "margin-top:10px;padding-top:10px;border-top:1px dashed #ccc;";
 paymentContainer.innerHTML = `
  <h4 style="margin-bottom:8px;">Select Payment Method:</h4>
  <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
    <label style="padding:8px;border:1px solid #ccc;border-radius:5px;cursor:pointer;">
      <input type="radio" name="cart_payment" value="Cash on Delivery" onclick="onPaymentSelect('Cash on Delivery')"> 💵 Cash on Delivery
    </label>
    <label style="padding:8px;border:1px solid #ccc;border-radius:5px;cursor:pointer;">
      <input type="radio" name="cart_payment" value="EasyPaisa" onclick="onPaymentSelect('EasyPaisa')"> 📱 EasyPaisa
    </label>
    <label style="padding:8px;border:1px solid #ccc;border-radius:5px;cursor:pointer;">
      <input type="radio" name="cart_payment" value="JazzCash" onclick="onPaymentSelect('JazzCash')"> 📲 JazzCash
    </label>
  </div>
  <button id="ok-payment-btn" type="button" class="green" style="width:100%;margin-bottom:10px;" disabled onclick="confirmPaymentMethod()">OK / Next</button>

  <div id="payment-user-details" style="display:none;margin-top:8px;padding:8px;border:1px solid #e0e0e0;border-radius:6px;background:#f9f9f9;">
    <p id="selected-payment-title" style="font-weight:bold;margin-bottom:8px;color:#28a745;"></p>
    <div style="margin-bottom:8px;">
      <label style="display:block;font-size:12px;margin-bottom:2px;">Naam (Full Name):</label>
      <input type="text" id="cartCustomerName" value="${defaultName}" placeholder="Apna name likhein" style="width:100%;padding:6px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;">
    </div>
    <div style="margin-bottom:10px;">
      <label style="display:block;font-size:12px;margin-bottom:2px;">Mobile Number:</label>
      <input type="tel" id="cartCustomerMobile" placeholder="03XXXXXXXXX" style="width:100%;padding:6px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;">
    </div>
    <button type="button" class="green" style="width:100%;padding:10px;font-size:14px;font-weight:bold;" onclick="checkoutCart()">Confirm Order & Submit ✅</button>
  </div>
 `;
 box.appendChild(paymentContainer);
 document.getElementById("cartModal").style.display="flex";
}

function closeCartModal(){document.getElementById("cartModal").style.display="none";}

async function checkoutCart(){
 if(!customerCart.length){customAlert("Cart is empty.", "Empty Cart");return;}
 const customer=auth&&auth.currentUser;
 if(!customer){customAlert("Please sign in to your customer account to place order.", "Login Required");return;}
 if(!db){customAlert("Database unavailable.", "Error");return;}

 if(!selectedPaymentMethod){
  customAlert("Mahrbani karke payment method select karke OK click karein!", "Select Payment");
  return;
 }

 const nameInput = document.getElementById("cartCustomerName");
 const mobileInput = document.getElementById("cartCustomerMobile");
 const custName = nameInput ? nameInput.value.trim() : "";
 const custMobile = mobileInput ? mobileInput.value.trim() : "";

 if(!custName || !custMobile){
  customAlert("Mahrbani karke Naam aur Mobile Number dono likhein!", "Details Required");
  return;
 }

 const confirmCheckout = await customConfirm("Do you want to confirm your order and send details to seller messengers?", "Confirm Checkout");
 if(!confirmCheckout) return;

 try{
  const shopOrders = {};
  customerCart.forEach(item => {
   const sId = String(item.shop.id);
   if(!shopOrders[sId]) shopOrders[sId] = { shop: item.shop, products: [] };
   shopOrders[sId].products.push(item.product);
  });

  const custAddress = currentCustomerProfile ? (currentCustomerProfile.houseNumber + ", " + currentCustomerProfile.area + ", " + currentCustomerProfile.city) : "Address not set";

  for(const sId in shopOrders){
   const shopData = shopOrders[sId].shop;
   const prods = shopOrders[sId].products;
   let orderTotal = 0;
   let summaryText = "🛍️ **NEW SHOPPING CART ORDER**\n\n";
   summaryText += "👤 Customer: " + custName + "\n";
   summaryText += "📞 Mobile: " + custMobile + "\n";
   summaryText += "📍 Address: " + custAddress + "\n";
   summaryText += "💳 Payment: " + selectedPaymentMethod + "\n\n";
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
    lastMessage: "🛍️ New Order: Rs. " + orderTotal + " (" + selectedPaymentMethod + ")",
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    deletedFor: firebase.firestore.FieldValue.arrayRemove(customer.uid, shopData.ownerUid||sId)
   });
  }

  customAlert("Order placed successfully! Details sent to Messenger.", "Order Confirmed");
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
  if(shop&&isOwnedByUser(shop,user.uid)){customAlert("You cannot follow your own shop.", "Action Denied");return}
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
 catch(error){this.value="";preview.classList.add("hidden");customAlert(error.message, "Image Error")}
});
document.getElementById("productImageFile").addEventListener("change",async function(){
 const preview=document.getElementById("productImagePreview");selectedProductImage="";
 if(!this.files||!this.files[0]){preview.classList.add("hidden");return}
 try{selectedProductImage=await compressImage(this.files[0]);preview.src=selectedProductImage;preview.classList.remove("hidden")}
 catch(error){this.value="";preview.classList.add("hidden");customAlert(error.message, "Image Error")}
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
