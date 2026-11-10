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
