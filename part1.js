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
 const msgBox = document.getElementById("messengerMessages");
 if(msgBox) msgBox.innerHTML="";
 const inboxBox = document.getElementById("messengerInbox");
 if(inboxBox){
  inboxBox.innerHTML="";
  inboxBox.classList.add("hidden");
 }
 const inboxTools = document.getElementById("messengerInboxTools");
 if(inboxTools) inboxTools.classList.add("hidden");
 const convTools = document.getElementById("messengerConversationTools");
 if(convTools) convTools.classList.add("hidden");
 const extraBox = document.getElementById("messengerExtra");
 if(extraBox) extraBox.classList.add("hidden");
 const statusBox = document.getElementById("messengerStatus");
 if(statusBox) statusBox.textContent="";
 const chatTxt = document.getElementById("chatText");
 if(chatTxt) chatTxt.value="";
 const chatPic = document.getElementById("chatPicture");
 if(chatPic) chatPic.value="";
 const previewContainer = document.getElementById("chatPicturePreviewContainer");
 if(previewContainer) previewContainer.classList.add("hidden");
}
function openMessengerModal(){
 const modal = document.getElementById("messengerModal");
 if(modal) modal.style.display="flex";
}
function openMessengerInbox(){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user){customAlert("Please sign in to your seller account first.", "Login Required");return}
 if(!currentSellerId){customAlert("Your shop profile is not selected.", "Profile Required");return}
 clearMessengerView();
 messengerCurrentRole="seller";
 messengerCurrentUser=user;
 messengerInboxMode=true;
 const mTitle = document.getElementById("messengerTitle");
 if(mTitle) mTitle.textContent="Business Messenger";
 const mName = document.getElementById("messengerName");
 if(mName) mName.textContent="Customer conversations";
 const mBack = document.getElementById("messengerBack");
 if(mBack) mBack.classList.add("hidden");
 const mInboxTools = document.getElementById("messengerInboxTools");
 if(mInboxTools) mInboxTools.classList.remove("hidden");
 const mInbox = document.getElementById("messengerInbox");
 if(mInbox) mInbox.classList.remove("hidden");
 const mMessages = document.getElementById("messengerMessages");
 if(mMessages) mMessages.classList.add("hidden");
 const mStatus = document.getElementById("messengerStatus");
 if(mStatus) mStatus.textContent="Loading conversations...";
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
  const mTitle = document.getElementById("messengerTitle");
  if(mTitle) mTitle.textContent="Messenger";
  const mName = document.getElementById("messengerName");
  if(mName) mName.textContent=s.name||"Business";
  const mBack = document.getElementById("messengerBack");
  if(mBack) mBack.classList.remove("hidden");
  const mMessages = document.getElementById("messengerMessages");
  if(mMessages) mMessages.classList.remove("hidden");
  const mExtra = document.getElementById("messengerExtra");
  if(mExtra) mExtra.classList.remove("hidden");
  openMessengerModal();
  const mStatus = document.getElementById("messengerStatus");
  if(mStatus) mStatus.textContent="Connecting...";
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
 const modal = document.getElementById("messengerModal");
 if(modal) modal.style.display="none";
}
function messengerChat(){
 const txt = document.getElementById("chatText");
 if(txt) txt.focus();
}
function messengerPicture(){
 const pic = document.getElementById("chatPicture");
 if(pic) pic.click();
}

const chatPicInput = document.getElementById("chatPicture");
if(chatPicInput){
 chatPicInput.addEventListener("change",async function(){
  const previewContainer=document.getElementById("chatPicturePreviewContainer");
  const preview=document.getElementById("chatPicturePreview");
  messengerSelectedImage="";
  if(!this.files||!this.files[0]){if(previewContainer)previewContainer.classList.add("hidden");return}
  try{
   messengerSelectedImage=await compressImage(this.files[0]);
   if(preview) preview.src=messengerSelectedImage;
   if(previewContainer) previewContainer.classList.remove("hidden");
   const status = document.getElementById("messengerStatus");
   if(status) status.textContent="Picture ready to send.";
  }catch(error){
   this.value="";
   if(previewContainer) previewContainer.classList.add("hidden");
   const status = document.getElementById("messengerStatus");
   if(status) status.textContent=error.message;
  }
 });
}

function cancelChatPicture(){
 messengerSelectedImage="";
 const chatPic = document.getElementById("chatPicture");
 if(chatPic) chatPic.value="";
 const prevCont = document.getElementById("chatPicturePreviewContainer");
 if(prevCont) prevCont.classList.add("hidden");
 const status = document.getElementById("messengerStatus");
 if(status) status.textContent="Picture canceled.";
}

function startMessengerMessages(){
 stopMessengerListener();
 if(!messengerConversationRef)return;
 const mInbox = document.getElementById("messengerInbox");
 if(mInbox) mInbox.classList.add("hidden");
 const mInboxTools = document.getElementById("messengerInboxTools");
 if(mInboxTools) mInboxTools.classList.add("hidden");
 const mMessages = document.getElementById("messengerMessages");
 if(mMessages) mMessages.classList.remove("hidden");
 const mConvTools = document.getElementById("messengerConversationTools");
 if(mConvTools) mConvTools.classList.remove("hidden");
 const mExtra = document.getElementById("messengerExtra");
 if(mExtra) mExtra.classList.remove("hidden");
 const mBack = document.getElementById("messengerBack");
 if(mBack) mBack.classList.remove("hidden");

 messengerMessagesUnsubscribe=messengerConversationRef.collection("messages")
  .orderBy("createdAt","asc")
  .onSnapshot(snapshot=>{
   const messages=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
   renderMessengerMessages(messages);
  },error=>{
   console.error("Messenger message listener error:",error);
   const status = document.getElementById("messengerStatus");
   if(status) status.textContent="Unable to load messages: "+(error.message||"Check Firestore rules.");
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
 if(!box)return;
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
 const txtInput = document.getElementById("chatText");
 const text = txtInput ? txtInput.value.trim() : "";
 const imageData=messengerSelectedImage;
 if(!text&&!imageData){customAlert("Type a message or select a picture.", "Message Empty");return}
 const button=document.getElementById("sendMessengerButton");
 messengerBusy=true;
 if(button){button.disabled=true;button.textContent="Sending...";}
 try{
  const conversationSnapshot=await messengerConversationRef.get();
  if(!conversationSnapshot.exists)throw new Error("Conversation not found.");
  const conversation=conversationSnapshot.data()||{};
  const blockedBy=conversation.blockedBy||[];
  if(blockedBy.length){
   const status = document.getElementById("messengerStatus");
   if(status) status.textContent="This conversation is blocked. Unblock it before sending messages.";
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
  if(txtInput) txtInput.value="";
  const chatPic = document.getElementById("chatPicture");
  if(chatPic) chatPic.value="";
  const prevCont = document.getElementById("chatPicturePreviewContainer");
  if(prevCont) prevCont.classList.add("hidden");
  messengerSelectedImage="";
  const status = document.getElementById("messengerStatus");
  if(status) status.textContent="Message sent.";
 }catch(error){
  console.error("Messenger send error:",error);
  if(error.message!=="This conversation is blocked.")showError("Message could not be sent",error);
 }finally{
  messengerBusy=false;
  if(button){button.disabled=false;button.textContent="Send";}
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
  if(button) button.textContent=isBlocked?"Unblock":"Block";
  const sendButton=document.getElementById("sendMessengerButton");
  const textArea=document.getElementById("chatText");
  const pictureButton=document.querySelector("#messengerExtra .messenger-options button:nth-child(2)");
  const blocked=isBlocked||blockedByOther;
  if(sendButton) sendButton.disabled=blocked;
  if(textArea) textArea.disabled=blocked;
  if(pictureButton) pictureButton.disabled=blocked;
  const status = document.getElementById("messengerStatus");
  if(status){
   status.textContent=blocked
    ?(isBlocked?"You blocked this chat. Unblock to send messages.":"This person has blocked this chat.")
    :"Connected";
  }
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
   const status = document.getElementById("messengerStatus");
   if(status) status.textContent="Chat unblocked.";
  }else{
   await messengerConversationRef.update({blockedBy:firebase.firestore.FieldValue.arrayUnion(messengerCurrentUser.uid)});
   const status = document.getElementById("messengerStatus");
   if(status) status.textContent="Chat blocked. No notification is sent.";
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
  const status = document.getElementById("messengerStatus");
  if(status) status.textContent="Chat removed from your Messenger.";
  closeMessenger();
 }catch(error){showError("Unable to delete chat",error)}
}
async function loadMessengerInbox(){
 if(!messengerCurrentUser||!messengerCurrentRole)return;
 const box=document.getElementById("messengerInbox");
 if(box) box.innerHTML='<p class="note">Loading conversations...</p>';
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
  const status = document.getElementById("messengerStatus");
  if(status) status.textContent=allConversationsList.length+" conversation(s).";
 }catch(error){
  console.error("Messenger inbox error:",error);
  if(box) box.innerHTML='<div class="panel"><p class="note">Unable to load conversations. Check your Firestore rules and internet connection.</p></div>';
  const status = document.getElementById("messengerStatus");
  if(status) status.textContent=error.message||"Inbox unavailable.";
 }
}

function renderInboxItems(conversations){
 const box=document.getElementById("messengerInbox");
 if(!box)return;
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
 const searchInput = document.getElementById("inboxSearchInput");
 const query=(searchInput ? searchInput.value || "" : "").trim().toLowerCase();
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
  const mTitle = document.getElementById("messengerTitle");
  if(mTitle) mTitle.textContent="Messenger";
  const mName = document.getElementById("messengerName");
  if(mName) mName.textContent=messengerCurrentRole==="seller"
   ?(conversation.customerName||"Customer")
   :(conversation.sellerName||"Shop");
  const mInbox = document.getElementById("messengerInbox");
  if(mInbox) mInbox.classList.add("hidden");
  const mInboxTools = document.getElementById("messengerInboxTools");
  if(mInboxTools) mInboxTools.classList.add("hidden");
  const mMessages = document.getElementById("messengerMessages");
  if(mMessages) mMessages.classList.remove("hidden");
  const mConvTools = document.getElementById("messengerConversationTools");
  if(mConvTools) mConvTools.classList.remove("hidden");
  const mExtra = document.getElementById("messengerExtra");
  if(mExtra) mExtra.classList.remove("hidden");
  const mBack = document.getElementById("messengerBack");
  if(mBack) mBack.classList.remove("hidden");
  startMessengerMessages();
 }catch(error){showError("Unable to open conversation",error)}
}
function openSellerInbox(){
 const user=sellerAuth&&sellerAuth.currentUser;
 if(!user){customAlert("Please sign in to your seller account first.", "Login Required");return}
 if(!currentSellerId){customAlert("Your shop profile is not selected.", "Profile Required");return}
 openMessengerInbox();
}

const chatTxtInput = document.getElementById("chatText");
if(chatTxtInput){
 chatTxtInput.addEventListener("keydown",function(e){
  if(e.key==="Enter"&&!e.shiftKey){
   e.preventDefault();
   sendMessengerMessage();
  }
 });
}

function openCustomerInbox(){
 const user=auth&&auth.currentUser;
 if(!user){customAlert("Please sign in first.", "Login Required");return}
 clearMessengerView();
 messengerCurrentRole="customer";
 messengerCurrentUser=user;
 messengerInboxMode=true;
 const mTitle = document.getElementById("messengerTitle");
 if(mTitle) mTitle.textContent="Messenger";
 const mName = document.getElementById("messengerName");
 if(mName) mName.textContent="Your conversations";
 const mBack = document.getElementById("messengerBack");
 if(mBack) mBack.classList.add("hidden");
 const mInboxTools = document.getElementById("messengerInboxTools");
 if(mInboxTools) mInboxTools.classList.remove("hidden");
 const mInbox = document.getElementById("messengerInbox");
 if(mInbox) mInbox.classList.remove("hidden");
 const mMessages = document.getElementById("messengerMessages");
 if(mMessages) mMessages.classList.add("hidden");
 const mExtra = document.getElementById("messengerExtra");
 if(mExtra) mExtra.classList.add("hidden");
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
 const el=document.getElementById(id);const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s||!el)return;
 const expanded=el.dataset.expanded!=="true";el.dataset.expanded=String(expanded);
 el.textContent=expanded?(s.bio||""):(s.bio||"").slice(0,100)+(s.bio&&s.bio.length>100?"…":"");
}

const regFormEl = document.getElementById("regForm");
if(regFormEl){
 regFormEl.addEventListener("submit",async function(e){
  e.preventDefault();
  const user=sellerAuth&&sellerAuth.currentUser;
  const regMsg = document.getElementById("regMessage");
  if(!user||user.isAnonymous){if(regMsg)regMsg.textContent="Please sign in with Google or Facebook first.";showSection("login");return}
  if(!sellerDb){if(regMsg)regMsg.textContent="Seller database is unavailable. Please try again later.";return}
  const saveButton=document.getElementById("saveProfileButton");
  if(saveButton){saveButton.disabled=true;saveButton.textContent="Saving...";}
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

   const regCatInput = document.getElementById("regCategory");
   const shopNameInput = document.getElementById("shopName");
   const bioInput = document.getElementById("bio");

   const selectedCategory=regCatInput ? regCatInput.value || activeCategory : activeCategory;
   const sellerData={
    uid:user.uid,ownerUid:user.uid,
    category:oldData?(oldData.category||selectedCategory):selectedCategory,
    name:shopNameInput ? shopNameInput.value.trim() : "",
    bio:bioInput ? bioInput.value.trim() : "",
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
   const profImgFile = document.getElementById("profileImageFile");
   if(profImgFile) profImgFile.value="";
   activeCategory=sellerData.category;
   await loadMyShops(user.uid);
   if(regMsg) regMsg.textContent="";
   showDashboard();
  }catch(error){
   showError("Unable to save profile",error);
   if(regMsg) regMsg.textContent="Profile could not be saved: "+(error&&error.message?error.message:"Check your internet connection and Firebase setup.");
  }finally{
   if(saveButton){saveButton.disabled=false;saveButton.textContent="Save";}
  }
 });
}

function openProfileForEdit(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));if(!s)return;
 editingProfile=true;creatingNewShop=false;activeCategory=s.category;selectedProfileImage="";
 const regCat = document.getElementById("regCategory");
 if(regCat) regCat.value=s.category;
 const shopName = document.getElementById("shopName");
 if(shopName) shopName.value=s.name||"";
 const bio = document.getElementById("bio");
 if(bio) bio.value=s.bio||"";
 const regMsg = document.getElementById("regMessage");
 if(regMsg) regMsg.textContent="";
 const profImgFile = document.getElementById("profileImageFile");
 if(profImgFile) profImgFile.value="";
 const regHeading = document.getElementById("registrationHeading");
 if(regHeading) regHeading.textContent="Edit Business Profile";
 const preview=document.getElementById("profileImagePreview");
 if(preview){
  if(s.dp){preview.src=s.dp;preview.classList.remove("hidden");}
  else preview.classList.add("hidden");
 }
 showSection("registration");
}
function editSavedProfile(){
 if(currentSellerId!==null)openProfileForEdit();
 else {
  const regMsg = document.getElementById("regMessage");
  if(regMsg) regMsg.textContent="Save your profile first.";
 }
}
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
 const photoBox = document.getElementById("savedProfilePhoto");
 if(photoBox) photoBox.innerHTML=safeImage(s.dp)?'<img class="profile-photo" src="'+s.dp+'" alt="Business profile">':'<div class="profile-placeholder">🏪</div>';
 const nameBox = document.getElementById("savedProfileName");
 if(nameBox) nameBox.textContent=s.name||"";
 const catBox = document.getElementById("dashboardCategory");
 if(catBox) catBox.textContent=s.category||"";
 const bio=document.getElementById("savedProfileBio");
 if(bio){
  bio.dataset.expanded="false";
  bio.textContent=(s.bio||"").slice(0,100)+(s.bio&&s.bio.length>100?"…":"");
 }
 const offer=document.getElementById("sellerOffer");
 if(offer){
  if(s.offer){offer.textContent="🎉 Offer: "+s.offer;offer.classList.remove("hidden");}
  else offer.classList.add("hidden");
 }
 renderDashboardProducts();showSection("dashboard");watchOwnerFollowers();
}

function openProductUpload(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));
 if(!s){customAlert("Save your profile first.", "Profile Needed");showSection("registration");return}
 cancelProductEdit();renderMyProducts();
 const msgBox = document.getElementById("productSaveMessage");
 if(msgBox) msgBox.textContent="";
 showSection("productUpload");
}

function renderDashboardProducts(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));
 const box=document.getElementById("dashboardProducts");
 if(!box)return;
 box.innerHTML="";
 if(!s||!s.products.length)return;
 s.products.forEach(p=>{
  const row=document.createElement("div");row.className="item";
  row.innerHTML=makeImage(p.image,"📦")+'<div style="flex:1;min-width:0"><h3></h3><p class="price"></p><p class="qty"></p></div>';
  row.querySelector("h3").textContent=p.name;row.querySelector(".price").textContent="Rs. "+p.price;
  row.querySelector(".qty").textContent="Quantity: "+(p.quantity||"Not specified");box.appendChild(row);
 });
}

function renderMyProducts(){
 const s=sellers.find(x=>String(x.id)===String(currentSellerId));
 const box=document.getElementById("myProducts");
 if(!box)return;
 box.innerHTML="";
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
 const pImgFile = document.getElementById("productImageFile");
 if(pImgFile) pImgFile.value="";
 const pName = document.getElementById("productName");
 if(pName) pName.value=p.name||"";
 const pPrice = document.getElementById("productPrice");
 if(pPrice) pPrice.value=p.price||"";
 const pQty = document.getElementById("productQuantity");
 if(pQty) pQty.value=p.quantity||"";
 const preview=document.getElementById("productImagePreview");
 if(preview){
  if(p.image){preview.src=p.image;preview.classList.remove("hidden");}
  else preview.classList.add("hidden");
 }
 const pHeading = document.getElementById("productFormHeading");
 if(pHeading) pHeading.textContent="Update Product";
 const cancelBtn = document.getElementById("cancelProductEdit");
 if(cancelBtn) cancelBtn.classList.remove("hidden");
 const pForm = document.getElementById("productForm");
 if(pForm) pForm.scrollIntoView({behavior:"smooth"});
}

function cancelProductEdit(){
 editingProductId=null;selectedProductImage="";
 const pForm = document.getElementById("productForm");
 if(pForm) pForm.reset();
 const preview = document.getElementById("productImagePreview");
 if(preview) preview.classList.add("hidden");
 const pHeading = document.getElementById("productFormHeading");
 if(pHeading) pHeading.textContent="Upload Product";
 const cancelBtn = document.getElementById("cancelProductEdit");
 if(cancelBtn) cancelBtn.classList.add("hidden");
}

const productFormEl = document.getElementById("productForm");
if(productFormEl){
 productFormEl.addEventListener("submit",async function(e){
  e.preventDefault();
  const user=sellerAuth&&sellerAuth.currentUser;
  if(!user||user.isAnonymous||!currentSellerId){customAlert("Please sign in to your seller account again.", "Login Needed");return}
  if(!sellerDb){customAlert("Seller database is unavailable. Please try again later.", "Database Error");return}
  const nameInput = document.getElementById("productName");
  const priceInput = document.getElementById("productPrice");
  const quantityInput = document.getElementById("productQuantity");
  const name=nameInput ? nameInput.value.trim() : "";
  const price=priceInput ? priceInput.value : "";
  const quantity=quantityInput ? quantityInput.value.trim() : "";
  if(!name||price===""){customAlert("Enter product name and price.", "Input Needed");return}
  const saveButton=document.getElementById("saveProductButton");
  if(saveButton){saveButton.disabled=true;saveButton.textContent="Saving...";}
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
   const msgBox = document.getElementById("productSaveMessage");
   if(msgBox) msgBox.textContent=wasEditing?"Product updated successfully.":"Product saved successfully.";
  }catch(error){
   showError("Unable to save product",error);
   const msgBox = document.getElementById("productSaveMessage");
   if(msgBox) msgBox.textContent="Product was not saved: "+(error&&error.message?error.message:"Please try again.");
  }finally{
   if(saveButton){saveButton.disabled=false;saveButton.textContent="Save Product";}
  }
 });
}

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
  if(!productDoc.exists)throw new Error("Product not found.");
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

const complaintFormEl = document.getElementById("complaintForm");
if(complaintFormEl){
 complaintFormEl.addEventListener("submit",function(e){
  e.preventDefault();
  const txtInput = document.getElementById("complaintText");
  const message=txtInput ? txtInput.value.trim() : "";if(!message)return;
  try{
   complaints=JSON.parse(localStorage.getItem("sb_complaints")||"[]");
   complaints.push({text:message,date:new Date().toISOString()});
   localStorage.setItem("sb_complaints",JSON.stringify(complaints));
   this.reset();customAlert("Your message has been saved on this device.", "Message Saved");
  }catch(error){customAlert("Unable to save your message.", "Error")}
 });
}

if(typeof renderCategories === "function"){
 renderCategories();
}
