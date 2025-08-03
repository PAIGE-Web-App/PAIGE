"use client";

import React from 'react';

export default function AdvancedFixFavoritesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Fix Favorites Discrepancy</h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">
              <strong>Problem:</strong> Your "My Favorites" tab shows 2 favorites, but you see 5 vendors with "Favorited by X user" tags.
            </p>
          </div>

          <p className="text-gray-700 mb-6">
            This happens when vendors are saved to the community favorites but not to your personal favorites. This fix will sync them properly.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              <strong>⚠️ Important:</strong> Make sure you're logged into your Paige app before running this fix.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Open Your Paige App</h2>
              <p className="text-gray-700">Go to your Paige app and make sure you're logged in. You can be on any page.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Open Browser Developer Tools</h2>
              <p className="text-gray-700">Press <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">F12</kbd> or right-click and select "Inspect" to open the developer tools. Then click on the "Console" tab.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Load the Advanced Fix Script</h2>
              <p className="text-gray-700 mb-4">Copy and paste this entire script into the console and press Enter:</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <pre id="advancedScriptContent">Loading advanced script content...</pre>
              </div>
              <button 
                onClick={loadAdvancedScript}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Load Advanced Script
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Run the Discrepancy Fix</h2>
              <p className="text-gray-700 mb-4">After the script loads, type this command and press Enter:</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono">
                fixFavoritesDiscrepancy()
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 5: Check the Results</h2>
              <p className="text-gray-700 mb-4">The script will:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Find vendors with "Favorited by X user" tags</li>
                <li>Check which ones are missing from your personal favorites</li>
                <li>Sync all community favorites to your personal favorites</li>
                <li>Show you a detailed report</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 6: Refresh the Page</h2>
              <p className="text-gray-700">After the script completes successfully, refresh your Paige app page. Your "My Favorites" count should now match the number of vendors with "Favorited by X user" tags.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                <strong>✅ Expected Result:</strong> Your "My Favorites" tab should now show 5 favorites, matching the 5 vendors with "Favorited by X user" tags.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Alternative Quick Fix</h2>
              <p className="text-gray-700 mb-4">If the above doesn't work, you can also try this simpler approach:</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono">
                syncCommunityToPersonal()
              </div>
              <p className="text-gray-600 text-sm mt-2">This will sync all vendors with community favorites to your personal favorites.</p>
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

async function loadAdvancedScript() {
  try {
    const response = await fetch('/fix-favorites-advanced.js');
    const scriptContent = await response.text();
    const scriptElement = document.getElementById('advancedScriptContent');
    if (scriptElement) {
      scriptElement.textContent = scriptContent;
    }
    
    // Also execute the script
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.head.appendChild(script);
    
    alert('Advanced script loaded successfully! You can now run fixFavoritesDiscrepancy() in the console.');
  } catch (error) {
    alert('Failed to load script. Please copy and paste the script manually.');
  }
} 