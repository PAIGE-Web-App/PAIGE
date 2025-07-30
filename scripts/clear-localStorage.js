// Simple script to clear localStorage vendor data
// Run this in your browser console to clear stale vendor data

console.log('🧹 Clearing localStorage vendor data...');

// Clear recently viewed vendors
localStorage.removeItem('paige_recently_viewed_vendors');
console.log('✅ Cleared recently viewed vendors');

// Clear vendor favorites
localStorage.removeItem('vendorFavorites');
console.log('✅ Cleared vendor favorites');

// Clear any other vendor-related localStorage items
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('vendor') || key.includes('Vendor'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Cleared: ${key}`);
});

console.log('🎉 localStorage cleared! Now refresh the page to see updated vendor images.');
console.log('💡 The page will rebuild vendor data from fresh Firestore data with real images.'); 