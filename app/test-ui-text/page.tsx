import { getUIText } from '@/lib/uiTextEdge';

export default async function TestUITextPage() {
  let uiText = null;
  let error = null;

  try {
    uiText = await getUIText();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">UI Text Edge Config Test</h1>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : uiText ? (
          <div className="space-y-6">
            {/* Empty State Messages */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Empty State Messages</h2>
              <div className="text-left space-y-2">
                <p><strong>Title:</strong> {uiText.messages?.emptyState?.title || 'Not found'}</p>
                <p><strong>Description:</strong> {uiText.messages?.emptyState?.description || 'Not found'}</p>
                <p><strong>CTA:</strong> {uiText.messages?.emptyState?.cta || 'Not found'}</p>
                <p><strong>Alternative CTA:</strong> {uiText.messages?.emptyState?.alternativeCta || 'Not found'}</p>
                <p><strong>Or:</strong> {uiText.messages?.emptyState?.or || 'Not found'}</p>
              </div>
            </div>

            {/* Error Messages */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Error Messages</h2>
              <div className="text-left space-y-2">
                <p><strong>Insufficient Credits:</strong> {uiText.messages?.errors?.insufficientCredits || 'Not found'}</p>
                <p><strong>Rate Limit:</strong> {uiText.messages?.errors?.rateLimit || 'Not found'}</p>
                <p><strong>Generic Error:</strong> {uiText.messages?.errors?.genericError || 'Not found'}</p>
                <p><strong>Network Error:</strong> {uiText.messages?.errors?.networkError || 'Not found'}</p>
              </div>
            </div>

            {/* Success Messages */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Success Messages</h2>
              <div className="text-left space-y-2">
                <p><strong>Saved:</strong> {uiText.messages?.success?.saved || 'Not found'}</p>
                <p><strong>Created:</strong> {uiText.messages?.success?.created || 'Not found'}</p>
                <p><strong>Updated:</strong> {uiText.messages?.success?.updated || 'Not found'}</p>
                <p><strong>Deleted:</strong> {uiText.messages?.success?.deleted || 'Not found'}</p>
              </div>
            </div>

            {/* Button Labels */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Button Labels</h2>
              <div className="grid grid-cols-2 gap-2 text-left">
                <p><strong>Save:</strong> {uiText.buttons?.save || 'Not found'}</p>
                <p><strong>Cancel:</strong> {uiText.buttons?.cancel || 'Not found'}</p>
                <p><strong>Delete:</strong> {uiText.buttons?.delete || 'Not found'}</p>
                <p><strong>Edit:</strong> {uiText.buttons?.edit || 'Not found'}</p>
                <p><strong>Create:</strong> {uiText.buttons?.create || 'Not found'}</p>
                <p><strong>Update:</strong> {uiText.buttons?.update || 'Not found'}</p>
                <p><strong>Close:</strong> {uiText.buttons?.close || 'Not found'}</p>
                <p><strong>Submit:</strong> {uiText.buttons?.submit || 'Not found'}</p>
              </div>
            </div>

            {/* Labels */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">UI Labels</h2>
              <div className="grid grid-cols-2 gap-2 text-left">
                <p><strong>Loading:</strong> {uiText.labels?.loading || 'Not found'}</p>
                <p><strong>No Data:</strong> {uiText.labels?.noData || 'Not found'}</p>
                <p><strong>Search:</strong> {uiText.labels?.search || 'Not found'}</p>
                <p><strong>Filter:</strong> {uiText.labels?.filter || 'Not found'}</p>
                <p><strong>Sort:</strong> {uiText.labels?.sort || 'Not found'}</p>
                <p><strong>View:</strong> {uiText.labels?.view || 'Not found'}</p>
                <p><strong>Settings:</strong> {uiText.labels?.settings || 'Not found'}</p>
              </div>
            </div>

            {/* Validation Messages */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Validation Messages</h2>
              <div className="text-left space-y-2">
                <p><strong>Required:</strong> {uiText.messages?.validation?.required || 'Not found'}</p>
                <p><strong>Email:</strong> {uiText.messages?.validation?.email || 'Not found'}</p>
                <p><strong>Min Length:</strong> {uiText.messages?.validation?.minLength || 'Not found'}</p>
                <p><strong>Max Length:</strong> {uiText.messages?.validation?.maxLength || 'Not found'}</p>
                <p><strong>Invalid Date:</strong> {uiText.messages?.validation?.invalidDate || 'Not found'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Loading...</strong>
            <span className="block sm:inline"> UI text is being loaded from Edge Config.</span>
          </div>
        )}

        <div className="mt-8 text-left">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Next Steps:</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>1. Add the UI text configuration to your Edge Config in Vercel dashboard</li>
            <li>2. Refresh this page to see the UI text from Edge Config</li>
            <li>3. If you see "Not found" for any items, they're using fallback values</li>
            <li>4. Visit the Messages page to see the UI text in action</li>
          </ul>
        </div>

        <div className="mt-6">
          <a 
            href="/messages" 
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Test Messages Panel
          </a>
        </div>
      </div>
    </div>
  );
}
