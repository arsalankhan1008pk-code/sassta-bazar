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

/* FIRESTORE MESSENGER */
function messengerDbForRole(role){
 if(role==="seller")return sellerDb;
 if(role==="customer")return db;
 return null;
}
function messengerCollectionForRole(role){
 const database=messengerDbForRole(role);
 if(!database)throw new Error("Messenger database is unavailable.");
 return database.collection("conversations");
}
function messengerUserName(role){
 if(role==="seller"){
  const shop=sellers.find(s=>String(s.id)===String(currentSellerId));
  return shop&&shop.name?shop.name:"Business";
 }
 return currentCustomerProfile&&currentCustomerProfile.fullName
  ?currentCustomerProfile.fullName
  :(auth&&auth.currentUser&&auth.currentUser.displayName?auth.currentUser.displayName:"Customer");
}
function stopMessengerListener(){
 if(messengerMessagesUnsubscribe){messengerMessagesUnsubscribe();messengerMessagesUnsubscribe=null}
}
function clearMessengerView(){
 stopMessengerListener();
 messengerConversationRef=null;
 messengerCurrentConversation=null;
 messengerCurrentUser=null;
 messengerCurrentRole="";
 messengerInboxMode=false;
 messengerSelectedImage="";
 allConversationsList=[];
 document.getElementById("messengerMessages").innerHTML="";
 document.getElementById("messengerInbox").innerHTML="";
 document.getElementById("messengerInbox").classList.add("hidden");
 document.getElementById("messengerInboxTools").classList.add("hidden");
 document.getElementById("messengerConversationTools").classList.add("hidden");
 document.getElementById("messengerExtra").classList.add("hidden");
 document.getElementById("messengerStatus").textContent="";
 document.getElementById("chatText").value="";
 document.getElementById("chatPicture").value="";
 document.getElementById("chatPicturePreviewContainer").classList.add("hidden");
}
function openMessengerModal(){
 document.getElementById("messengerModal").style.display="flex";
}
function openMessengerInbox(){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user){alert("Please sign in to your seller account first.");return}
 if(!currentSellerId){alert("Your shop profile is not selected.");return}
 clearMessengerView();
 messengerCurrentRole="seller";
 messengerCurrentUser=user;
 messengerInboxMode=true;
 document.getElementById("messengerTitle").textContent="Business Messenger";
 document.getElementById("messengerName").textContent="Customer conversations";
 document.getElementById("messengerBack").classList.add("hidden");
 document.getElementById("messengerInboxTools").classList.remove("hidden");
 document.getElementById("messengerInbox").classList.remove("hidden");
 document.getElementById("messengerMessages").classList.add("hidden");
 document.getElementById("messengerStatus").textContent="Loading conversations...";
 openMessengerModal();
 loadMessengerInbox();
}
async function messageSeller(){
 const s=activeSeller||sellers.find(x=>String(x.id)===String(currentSellerId));
 if(!s){alert("Profile not found.");return}
 const user=auth&&auth.currentUser;
 if(!user){alert("Please sign in to your customer account first.");return}
 if(!db){alert("Messenger database is unavailable.");return}
 try{
  clearMessengerView();
  messengerCurrentRole="customer";
  messengerCurrentUser=user;
  messengerInboxMode=false;
  document.getElementById("messengerTitle").textContent="Messenger";
  document.getElementById("messengerName").textContent=s.name||"Business";
  document.getElementById("messengerBack").classList.remove("hidden");
  document.getElementById("messengerMessages").classList.remove("hidden");
  document.getElementById("messengerExtra").classList.remove("hidden");
  openMessengerModal();
  document.getElementById("messengerStatus").textContent="Connecting...";
  await openCustomerConversation(s);
 }catch(error){
  showError("Unable to open Messenger",error);
 }
}
async function openCustomerConversation(shop){
 const customer=auth&&auth.currentUser;
 if(!customer)throw new Error("Please sign in to your customer account.");
 const sellerId=String(shop.id||"");
 if(!sellerId)throw new Error("This shop does not have a valid seller account.");
 if(sellerId===customer.uid)throw new Error("You cannot message your own shop.");
 const conversationId=sellerId+"_"+customer.uid;
 const ref=db.collection("conversations").doc(conversationId);
 try{
  const snapshot=await ref.get();
  if(!snapshot.exists){
   await ref.set({
    customerId:customer.uid,
    sellerId:sellerId,
    customerName:currentCustomerProfile&&currentCustomerProfile.fullName?currentCustomerProfile.fullName:"Customer",
    sellerName:shop.name||"Shop",
    lastMessage:"",
    lastMessageAt:firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    blockedBy:[],
    deletedFor:[],
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
   });
  }
  const latest=await ref.get();
  const data=latest.data()||{};
  if((data.deletedFor||[]).includes(customer.uid)){
   await ref.update({deletedFor:firebase.firestore.FieldValue.arrayRemove(customer.uid)});
  }
  messengerConversationRef=ref;
  messengerCurrentConversation={id:conversationId,...data,sellerName:shop.name||"Business"};
  startMessengerMessages();
 }catch(err){
  console.error("Open conversation error:",err);
  throw new Error("Missing or insufficient permissions. Please check Firestore Rules for conversations.");
 }
}
function messengerBack(){
 if(messengerInboxMode)return;
 closeMessenger();
}
function closeMessenger(){
 clearMessengerView();
 document.getElementById("messengerModal").style.display="none";
}
function messengerChat(){document.getElementById("chatText").focus()}
function messengerPicture(){document.getElementById("chatPicture").click()}

document.getElementById("chatPicture").addEventListener("change",async function(){
 const previewContainer=document.getElementById("chatPicturePreviewContainer");
 const preview=document.getElementById("chatPicturePreview");
 messengerSelectedImage="";
 if(!this.files||!this.files[0]){previewContainer.classList.add("hidden");return}
 try{
  messengerSelectedImage=await compressImage(this.files[0]);
  preview.src=messengerSelectedImage;
  previewContainer.classList.remove("hidden");
  document.getElementById("messengerStatus").textContent="Picture ready to send.";
 }catch(error){
  this.value="";
  previewContainer.classList.add("hidden");
  document.getElementById("messengerStatus").textContent=error.message;
 }
});

function cancelChatPicture(){
 messengerSelectedImage="";
 document.getElementById("chatPicture").value="";
 document.getElementById("chatPicturePreviewContainer").classList.add("hidden");
 document.getElementById("messengerStatus").textContent="Picture canceled.";
}

function startMessengerMessages(){
 stopMessengerListener();
 if(!messengerConversationRef)return;
 document.getElementById("messengerInbox").classList.add("hidden");
 document.getElementById("messengerInboxTools").classList.add("hidden");
 document.getElementById("messengerMessages").classList.remove("hidden");
 document.getElementById("messengerConversationTools").classList.remove("hidden");
 document.getElementById("messengerExtra").classList.remove("hidden");
 document.getElementById("messengerBack").classList.remove("hidden");
 messengerMessagesUnsubscribe=messengerConversationRef.collection("messages")
  .orderBy("createdAt","asc")
  .onSnapshot(snapshot=>{
   const messages=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
   renderMessengerMessages(messages);
  },error=>{
   console.error("Messenger message listener error:",error);
   document.getElementById("messengerStatus").textContent="Unable to load messages: "+(error.message||"Check Firestore rules.");
  });
 refreshMessengerControls();
}

/* MESSAGE ACTIONS APPEAR ONLY AFTER TAPPING A MESSAGE OR PICTURE */
function toggleMessengerMessageActions(item){
 const actions=item.querySelector(".messenger-message-actions");
 if(!actions)return;
 actions.classList.toggle("hidden");
}

function renderMessengerMessages(messages){
 const box=document.getElementById("messengerMessages");
 box.innerHTML="";
 if(!messages||!messages.length){
  box.innerHTML='<p class="note" style="text-align:center;">No messages yet. Start the conversation.</p>';
  return;
 }
 messages.forEach(messageData=>{
  const mine=messageData.senderId===messengerCurrentUser.uid;
  const item=document.createElement("div");
  item.className="messenger-message"+(mine?" mine":"");

  if(messageData.type==="image"&&messageData.imageData){
   const image=document.createElement("img");
   image.src=messageData.imageData;
   image.alt="Shared picture";
   image.loading="lazy";
   item.appendChild(image);

   const actions=document.createElement("div");
   actions.className="messenger-message-actions hidden";

   const downloadButton=document.createElement("button");
   downloadButton.type="button";
   downloadButton.className="light";
   downloadButton.textContent="Download / Save Picture";
   downloadButton.onclick=(event)=>{
    event.stopPropagation();
    downloadMessengerImage(messageData.imageData);
   };
   actions.appendChild(downloadButton);

   if(mine){
    const deleteButton=document.createElement("button");
    deleteButton.type="button";
    deleteButton.className="light";
    deleteButton.textContent="Delete Picture";
    deleteButton.onclick=(event)=>{
     event.stopPropagation();
     deleteMessengerMessage(messageData.id);
    };
    actions.appendChild(deleteButton);
   }
   item.appendChild(actions);
  }else{
   const text=document.createElement("div");
   text.style.whiteSpace="pre-wrap";
   text.textContent=messageData.text||"";
   item.appendChild(text);

   if(mine){
    const actions=document.createElement("div");
    actions.className="messenger-message-actions hidden";
    const deleteButton=document.createElement("button");
    deleteButton.type="button";
    deleteButton.className="light";
    deleteButton.textContent="Delete Message";
    deleteButton.onclick=(event)=>{
     event.stopPropagation();
     deleteMessengerMessage(messageData.id);
    };
    actions.appendChild(deleteButton);
    item.appendChild(actions);
   }
  }

  const time=document.createElement("small");
  time.style.cssText="display:block;font-size:10px;color:#66736a;margin-top:5px";
  time.textContent=messageData.createdAt&&messageData.createdAt.toDate
   ?messageData.createdAt.toDate().toLocaleString():"";
  item.appendChild(time);

  item.addEventListener("click",()=>toggleMessengerMessageActions(item));
  box.appendChild(item);
 });
 box.scrollTop=box.scrollHeight;
}

async function sendMessengerMessage(){
 if(messengerBusy)return;
 if(!messengerConversationRef||!messengerCurrentUser){alert("Open a conversation first.");return}
 const text=document.getElementById("chatText").value.trim();
 const imageData=messengerSelectedImage;
 if(!text&&!imageData){alert("Type a message or select a picture.");return}
 const button=document.getElementById("sendMessengerButton");
 messengerBusy=true;button.disabled=true;button.textContent="Sending...";
 try{
  const conversationSnapshot=await messengerConversationRef.get();
  if(!conversationSnapshot.exists)throw new Error("Conversation not found.");
  const conversation=conversationSnapshot.data()||{};
  const blockedBy=conversation.blockedBy||[];
  if(blockedBy.length){
   document.getElementById("messengerStatus").textContent="This conversation is blocked. Unblock it before sending messages.";
   throw new Error("This conversation is blocked.");
  }
  const senderName=messengerUserName(messengerCurrentRole);
  const messageData={
   senderId:messengerCurrentUser.uid,
   senderName:senderName,
   type:imageData?"image":"text",
   text:text,
   createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(imageData)messageData.imageData=imageData;
  const previewText=imageData?(text||"Picture"):text;
  const batch=messengerDbForRole(messengerCurrentRole).batch();
  const messageRef=messengerConversationRef.collection("messages").doc();
  batch.set(messageRef,messageData);
  batch.update(messengerConversationRef,{
   lastMessage:previewText.slice(0,180),
   lastMessageAt:firebase.firestore.FieldValue.serverTimestamp(),
   updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  document.getElementById("chatText").value="";
  document.getElementById("chatPicture").value="";
  document.getElementById("chatPicturePreviewContainer").classList.add("hidden");
  messengerSelectedImage="";
  document.getElementById("messengerStatus").textContent="Message sent.";
 }catch(error){
  console.error("Messenger send error:",error);
  if(error.message!=="This conversation is blocked.")showError("Message could not be sent",error);
 }finally{
  messengerBusy=false;button.disabled=false;button.textContent="Send";
 }
}
function downloadMessengerImage(dataURL){
 if(!dataURL||!/^data:image\//i.test(dataURL)){alert("Picture is not available to download.");return}
 const link=document.createElement("a");
 link.href=dataURL;
 link.download="sassta-bazar-picture-"+Date.now()+".jpg";
 document.body.appendChild(link);link.click();link.remove();
}
async function deleteMessengerMessage(messageId){
 if(!messengerConversationRef||!messageId||!messengerCurrentUser)return;
 if(!confirm("Delete this message from the conversation?"))return;
 try{
  const ref=messengerConversationRef.collection("messages").doc(messageId);
  const snapshot=await ref.get();
  if(!snapshot.exists)return;
  if(snapshot.data().senderId!==messengerCurrentUser.uid)throw new Error("You can only delete your own messages.");
  await ref.delete();
 }catch(error){showError("Unable to delete message",error)}
}
async function refreshMessengerControls(){
 if(!messengerConversationRef||!messengerCurrentUser)return;
 try{
  const snapshot=await messengerConversationRef.get();
  if(!snapshot.exists)return;
  const data=snapshot.data()||{};
  const blockedBy=data.blockedBy||[];
  const isBlocked=blockedBy.includes(messengerCurrentUser.uid);
  const blockedByOther=blockedBy.some(uid=>uid!==messengerCurrentUser.uid);
  const button=document.getElementById("blockChatButton");
  button.textContent=isBlocked?"Unblock":"Block";
  const sendButton=document.getElementById("sendMessengerButton");
  const textArea=document.getElementById("chatText");
  const pictureButton=document.querySelector("#messengerExtra .messenger-options button:nth-child(2)");
  const blocked=isBlocked||blockedByOther;
  sendButton.disabled=blocked;
  textArea.disabled=blocked;
  if(pictureButton)pictureButton.disabled=blocked;
  document.getElementById("messengerStatus").textContent=blocked
   ?(isBlocked?"You blocked this chat. Unblock to send messages.":"This person has blocked this chat.")
   :"Connected";
 }catch(error){
  console.error("Unable to refresh messenger controls:",error);
 }
}
async function toggleBlockChat(){
 if(!messengerConversationRef||!messengerCurrentUser)return;
 try{
  const snapshot=await messengerConversationRef.get();
  if(!snapshot.exists)throw new Error("Conversation not found.");
  const data=snapshot.data()||{};
  const blockedBy=data.blockedBy||[];
  const isBlocked=blockedBy.includes(messengerCurrentUser.uid);
  if(isBlocked){
   await messengerConversationRef.update({blockedBy:firebase.firestore.FieldValue.arrayRemove(messengerCurrentUser.uid)});
   document.getElementById("messengerStatus").textContent="Chat unblocked.";
  }else{
   await messengerConversationRef.update({blockedBy:firebase.firestore.FieldValue.arrayUnion(messengerCurrentUser.uid)});
   document.getElementById("messengerStatus").textContent="Chat blocked. No notification is sent.";
  }
  await refreshMessengerControls();
 }catch(error){showError("Unable to update block settings",error)}
}
async function deleteCompleteChat(){
 if(!messengerConversationRef||!messengerCurrentUser)return;
 if(!confirm("Delete this chat from your Messenger only? The other person's copy will remain."))return;
 try{
  await messengerConversationRef.update({
   deletedFor:firebase.firestore.FieldValue.arrayUnion(messengerCurrentUser.uid)
  });
  document.getElementById("messengerStatus").textContent="Chat removed from your Messenger.";
  closeMessenger();
 }catch(error){showError("Unable to delete chat",error)}
}
async function loadMessengerInbox(){
 if(!messengerCurrentUser||!messengerCurrentRole)return;
 const box=document.getElementById("messengerInbox");
 box.innerHTML='<p class="note">Loading conversations...</p>';
 try{
  const field=messengerCurrentRole==="seller"?"sellerId":"customerId";
  const database=messengerDbForRole(messengerCurrentRole);
  const snapshot=await database.collection("conversations").where(field,"==",messengerCurrentUser.uid).get();
  allConversationsList=snapshot.docs
   .map(doc=>({id:doc.id,...doc.data()}))
   .filter(item=>!(item.deletedFor||[]).includes(messengerCurrentUser.uid))
   .sort((a,b)=>{
    const ta=a.lastMessageAt&&a.lastMessageAt.toMillis?a.lastMessageAt.toMillis():0;
    const tb=b.lastMessageAt&&b.lastMessageAt.toMillis?b.lastMessageAt.toMillis():0;
    return tb-ta;
   });
  renderInboxItems(allConversationsList);
  document.getElementById("messengerStatus").textContent=allConversationsList.length+" conversation(s).";
 }catch(error){
  console.error("Messenger inbox error:",error);
  box.innerHTML='<div class="panel"><p class="note">Unable to load conversations. Check your Firestore rules and internet connection.</p></div>';
  document.getElementById("messengerStatus").textContent=error.message||"Inbox unavailable.";
 }
}

function renderInboxItems(conversations){
 const box=document.getElementById("messengerInbox");
 box.innerHTML="";
 if(!conversations.length){
  box.innerHTML='<div class="panel"><p class="note">No conversations found.</p></div>';
  return;
 }
 conversations.forEach(conversation=>{
  const row=document.createElement("button");
  row.type="button";row.className="messenger-inbox-item";
  const info=document.createElement("span");info.className="inbox-info";
  const name=document.createElement("strong");
  name.textContent=messengerCurrentRole==="seller"
   ?(conversation.customerName||"Customer")
   :(conversation.sellerName||"Shop");
  const last=document.createElement("small");
  last.textContent=conversation.lastMessage||"Start conversation";
  const status=document.createElement("small");
  status.textContent=(conversation.blockedBy||[]).length?"Blocked":"Open conversation";
  info.append(name,last,status);
  row.append(info);
  row.onclick=()=>openInboxConversation(conversation);
  box.appendChild(row);
 });
}

function filterMessengerInbox(){
 const query=(document.getElementById("inboxSearchInput").value||"").trim().toLowerCase();
 const filtered=allConversationsList.filter(c=>{
  const targetName=messengerCurrentRole==="seller"?(c.customerName||"Customer"):(c.sellerName||"Shop");
  return targetName.toLowerCase().includes(query);
 });
 renderInboxItems(filtered);
}

async function openInboxConversation(conversation){
 try{
  stopMessengerListener();
  const database=messengerDbForRole(messengerCurrentRole);
  const ref=database.collection("conversations").doc(conversation.id);
  const snapshot=await ref.get();
  if(!snapshot.exists)throw new Error("Conversation not found.");
  const data=snapshot.data()||{};
  const uid=messengerCurrentUser.uid;
  if(data.customerId!==uid&&data.sellerId!==uid)throw new Error("You are not a participant in this conversation.");
  if((data.deletedFor||[]).includes(uid)){
   await ref.update({deletedFor:firebase.firestore.FieldValue.arrayRemove(uid)});
  }
  messengerConversationRef=ref;
  messengerCurrentConversation={id:conversation.id,...data};
  messengerInboxMode=false;
  document.getElementById("messengerTitle").textContent="Messenger";
  document.getElementById("messengerName").textContent=messengerCurrentRole==="seller"
   ?(conversation.customerName||"Customer")
   :(conversation.sellerName||"Shop");
  document.getElementById("messengerInbox").classList.add("hidden");
  document.getElementById("messengerInboxTools").classList.add("hidden");
  document.getElementById("messengerMessages").classList.remove("hidden");
  document.getElementById("messengerConversationTools").classList.remove("hidden");
  document.getElementById("messengerExtra").classList.remove("hidden");
  document.getElementById("messengerBack").classList.remove("hidden");
  startMessengerMessages();
 }catch(error){showError("Unable to open conversation",error)}
}
function openSellerInbox(){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user){alert("Please sign in to your seller account first.");return}
 if(!currentSellerId){alert("Your shop profile is not selected.");return}
 openMessengerInbox();
}

/* ENTER TO SEND */
document.getElementById("chatText").addEventListener("keydown",function(e){
 if(e.key==="Enter"&&!e.shiftKey){
  e.preventDefault();
  sendMessengerMessage();
 }
});

/* CUSTOMER MESSENGER INBOX */
function openCustomerInbox(){
 const user=auth&&auth.currentUser;
 if(!user){alert("Please sign in first.");return}
 clearMessengerView();
 messengerCurrentRole="customer";
 messengerCurrentUser=user;
 messengerInboxMode=true;
 document.getElementById("messengerTitle").textContent="Messenger";
 document.getElementById("messengerName").textContent="Your conversations";
 document.getElementById("messengerBack").classList.add("hidden");
 document.getElementById("messengerInboxTools").classList.remove("hidden");
 document.getElementById("messengerInbox").classList.remove("hidden");
 document.getElementById("messengerMessages").classList.add("hidden");
 document.getElementById("messengerExtra").classList.add("hidden");
 openMessengerModal();
 loadMessengerInbox();
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
 }catch(e){
