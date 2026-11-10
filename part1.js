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
 if(!user){customAlert("Please sign in to your seller account first.", "Login Required");return}
 if(!currentSellerId){customAlert("Your shop profile is not selected.", "Profile Required");return}
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
 if(!s){customAlert("Profile not found.", "Error");return}
 const user=auth&&auth.currentUser;
 if(!user){customAlert("Please sign in to your customer account first.", "Login Required");return}
 if(!db){customAlert("Messenger database is unavailable.", "Error");return}
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
 if(!messengerConversationRef||!messengerCurrentUser){customAlert("Open a conversation first.", "Chat Required");return}
 const text=document.getElementById("chatText").value.trim();
 const imageData=messengerSelectedImage;
 if(!text&&!imageData){customAlert("Type a message or select a picture.", "Message Empty");return}
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
 if(!dataURL||!/^data:image\//i.test(dataURL)){customAlert("Picture is not available to download.", "Download Failed");return}
 const link=document.createElement("a");
 link.href=dataURL;
 link.download="sassta-bazar-picture-"+Date.now()+".jpg";
 document.body.appendChild(link);link.click();link.remove();
}
async function deleteMessengerMessage(messageId){
 if(!messengerConversationRef||!messageId||!messengerCurrentUser)return;
 if(!await customConfirm("Delete this message from the conversation?", "Delete Message"))return;
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
 if(!await customConfirm("Delete this chat from your Messenger only? The other person's copy will remain.", "Delete Chat"))return;
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
 if(!user){customAlert("Please sign in to your seller account first.", "Login Required");return}
 if(!currentSellerId){customAlert("Your shop profile is not selected.", "Profile Required");return}
 openMessengerInbox();
}

document.getElementById("chatText").addEventListener("keydown",function(e){
 if(e.key==="Enter"&&!e.shiftKey){
  e.preventDefault();
  sendMessengerMessage();
 }
});

function openCustomerInbox(){
 const user=auth&&auth.currentUser;
 if(!user){customAlert("Please sign in first.", "Login Required");return}
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
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s){customAlert("Save your profile first.", "Profile Not Found");return}
 await shareProfile(s);
}
async function shareCurrentSeller(){if(activeSeller)await shareProfile(activeSeller)}
async function shareProfile(s){
 const link=window.location.origin+window.location.pathname+"?seller="+encodeURIComponent(s.id);
 try{
  if(navigator.share)await navigator.share({title:s.name||"Sassta Bazar",text:(s.name||"Sassta Bazar")+" profile",url:link});
  else if(navigator.clipboard){await navigator.clipboard.writeText(link);customAlert("Profile link copied.", "Link Copied")}
  else customAlert("Copy this link to share:\n\n" + link, "Share Profile");
 }catch(e){if(e.name!=="AbortError")customAlert("Unable to share. Please try again.", "Error")}
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
    customAlert("This Google or Facebook account already has its one shop. You can edit the saved shop profile.", "Account Notice");
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
 if(!s){customAlert("Save your profile first.", "Profile Needed");showSection("registration");return}
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
 if(!user||user.isAnonymous||!currentSellerId){customAlert("Please sign in to your seller account again.", "Login Needed");return}
 if(!sellerDb){customAlert("Seller database is unavailable. Please try again later.", "Database Error");return}
 const name=document.getElementById("productName").value.trim();
 const price=document.getElementById("productPrice").value;
 const quantity=document.getElementById("productQuantity").value.trim();
 if(!name||price===""){customAlert("Enter product name and price.", "Input Needed");return}
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
 if(!user||user.isAnonymous||!currentSellerId){customAlert("Please sign in to your seller account again.", "Login Needed");return}
 if(!sellerDb){customAlert("Seller database is unavailable.", "Database Error");return}
 if(!await customConfirm("Are you sure you want to delete this product?", "Delete Product"))return;
 try{
  const shopDoc=await sellerRef(currentSellerId).get();
  if(!shopDoc.exists)throw new Error("Shop profile not found.");
  const shopData=shopDoc.data()||{};
  if((shopData.ownerUid||shopData.uid)!==user.uid)throw new Error("This shop does not belong to your seller account.");
  const productRef=sellerDb.collection("products").doc(id);
  const productDoc=await productRef.get();
  if(!productDoc.exists)throw newRow("Product not found.");
  if(String(productDoc.data().sellerId)!==String(currentSellerId))throw new Error("This product does not belong to the selected shop.");
  await productRef.delete();
  await loadMyShops(user.uid);renderMyProducts();renderDashboardProducts();
 }catch(error){showError("Unable to delete product",error)}
}

async function logoutSeller(){
 if(!sellerAuth){customAlert("Seller login service is unavailable.", "Service Down");return}
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

document.getElementById("complaintForm").addEventListener("submit",function(e){
 e.preventDefault();
 const message=document.getElementById("complaintText").value.trim();if(!message)return;
 try{
  complaints=JSON.parse(localStorage.getItem("sb_complaints")||"[]");
  complaints.push({text:message,date:new Date().toISOString()});
  localStorage.setItem("sb_complaints",JSON.stringify(complaints));
  this.reset();customAlert("Your message has been saved on this device.", "Message Saved");
 }catch(error){customAlert("Unable to save your message.", "Error")}
});

renderCategories();
