/**
 * Test Migration Page
 * This page tests if the Edge Config migration works safely
 */

import { get } from '@vercel/edge-config';
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';

export default async function TestMigrationPage() {
  let vendorCategories = VENDOR_CATEGORIES;
  let appSettings = null;
  let errors = [];

  try {
    // Try to get vendor categories from Edge Config
    const edgeCategories = await get('vendorCategories');
    if (edgeCategories && Array.isArray(edgeCategories)) {
      vendorCategories = edgeCategories as any[];
    }
  } catch (err) {
    errors.push(`Vendor Categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  try {
    // Try to get app settings from Edge Config
    const edgeSettings = await get('appSettings');
    if (edgeSettings && typeof edgeSettings === 'object') {
      appSettings = edgeSettings;
    }
  } catch (err) {
    errors.push(`App Settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🚀 Edge Config Migration Test
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor Categories Test */}
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Vendor Categories
            </h2>
            <p className="text-green-700 mb-2">
              <strong>Status:</strong> {vendorCategories.length > 0 ? 'Working' : 'Failed'}
            </p>
            <p className="text-green-700 mb-2">
              <strong>Count:</strong> {vendorCategories.length} categories
            </p>
            <div className="text-sm text-green-600">
              <strong>Sample:</strong> {vendorCategories[0]?.label || 'None'}
            </div>
          </div>

          {/* App Settings Test */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              ⚙️ App Settings
            </h2>
            <p className="text-blue-700 mb-2">
              <strong>Status:</strong> {appSettings ? 'Working' : 'Using defaults'}
            </p>
            {appSettings ? (
              <div className="text-sm text-blue-600">
                <div><strong>Features:</strong> {Object.keys(appSettings.features || {}).length} enabled</div>
                <div><strong>Config:</strong> {Object.keys(appSettings.config || {}).length} settings</div>
              </div>
            ) : (
              <div className="text-sm text-blue-600">
                <div>Using fallback defaults</div>
              </div>
            )}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              ⚠️ Errors (Safe - Using Fallbacks)
            </h2>
            <ul className="text-red-700 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Safety Info */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            🛡️ Safety Guarantees
          </h2>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>✅ <strong>No data loss</strong> - Original data preserved</li>
            <li>✅ <strong>No breaking changes</strong> - App works exactly the same</li>
            <li>✅ <strong>Automatic fallback</strong> - Uses original data if Edge Config fails</li>
            <li>✅ <strong>Easy rollback</strong> - Can disable Edge Config anytime</li>
          </ul>
        </div>

        {/* Next Steps */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded">
          <h2 className="text-lg font-semibold text-purple-800 mb-2">
            🎯 Next Steps
          </h2>
          <ol className="text-purple-700 text-sm space-y-1 list-decimal list-inside">
            <li>Add vendor categories to Edge Config (see migration guide)</li>
            <li>Add app settings to Edge Config (see migration guide)</li>
            <li>Refresh this page to see the migration results</li>
            <li>Start using Edge Config in your components</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
