// Add product
function addProduct(name, price) {
  const productRef = db.ref("products").push();
  productRef.set({
    name: name,
    price: price
  });
}

// Delete product
function deleteProduct(productId) {
  db.ref("products/" + productId).remove();
}
// Add agent
function addAgent(name, role) {
  const agentRef = db.ref("agents").push();
  agentRef.set({
    name: name,
    role: role
  });
}

// Delete agent
function deleteAgent(agentId) {
  db.ref("agents/" + agentId).remove();
}
