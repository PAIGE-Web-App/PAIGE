"use client";

import React from 'react';

export default function FixFavoritesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Fix Favorites Sync Issues</h1>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              <strong>⚠️ Important:</strong> Make sure you're logged into your Paige app before running these fixes.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Open Your Paige App</h2>
              <p className="text-gray-700">Go to your Paige app and make sure you're logged in. You can be on any page (vendors, favorites, etc.).</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Open Browser Developer Tools</h2>
              <p className="text-gray-700">Press <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">F12</kbd> or right-click and select "Inspect" to open the developer tools. Then click on the "Console" tab.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Load the Fix Script</h2>
              <p className="text-gray-700 mb-4">Copy and paste this entire script into the console and press Enter:</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <pre id="scriptContent">Loading script content...</pre>
              </div>
              <button 
                onClick={loadScript}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Load Script
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Run the Fix</h2>
              <p className="text-gray-700 mb-4">After the script loads, type this command and press Enter:</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono">
                fixFavoritesSync()
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 5: Check the Results</h2>
              <p className="text-gray-700 mb-4">The script will:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Check for duplicate favorites</li>
                <li>Sync localStorage favorites to Firestore</li>
                <li>Clean up any inconsistencies</li>
                <li>Show you a detailed report</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 6: Refresh the Page</h2>
              <p className="text-gray-700">After the script completes successfully, refresh your Paige app page to see the updated favorites.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                <strong>✅ Success!</strong> Your favorites should now be properly synced and the counts should be correct.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Tools</h2>
              <p className="text-gray-700 mb-4">If you need to debug further, you can also run these commands:</p>
              <div className="space-y-2">
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                  debugFavoritesData()
                </div>
                <p className="text-gray-600 text-sm">Shows detailed information about your favorites data</p>
                
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                  clearAllFavorites()
                </div>
                <p className="text-gray-600 text-sm">Clears all favorites (use with caution)</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Need Help?</strong> If you're still having issues after running the fix, please contact support with the console output from the script.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function loadScript() {
  try {
    const response = await fetch('/fix-favorites.js');
    const scriptContent = await response.text();
    const scriptElement = document.getElementById('scriptContent');
    if (scriptElement) {
      scriptElement.textContent = scriptContent;
    }
    
    // Also execute the script
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.head.appendChild(script);
    
    alert('Script loaded successfully! You can now run fixFavoritesSync() in the console.');
  } catch (error) {
    alert('Failed to load script. Please copy and paste the script manually.');
  }
} 