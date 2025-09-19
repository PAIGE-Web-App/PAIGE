import { getCoupleAICreditCosts, getPlannerAICreditCosts, getCoupleSubscriptionCredits, getPlannerSubscriptionCredits } from '@/lib/creditConfigEdge';

export default async function TestCreditConfigPage() {
  let coupleCosts = null;
  let plannerCosts = null;
  let coupleSubs = null;
  let plannerSubs = null;
  let errors = [];

  try {
    coupleCosts = await getCoupleAICreditCosts();
  } catch (err) {
    errors.push(`Couple AI Credit Costs: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  try {
    plannerCosts = await getPlannerAICreditCosts();
  } catch (err) {
    errors.push(`Planner AI Credit Costs: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  try {
    coupleSubs = await getCoupleSubscriptionCredits();
  } catch (err) {
    errors.push(`Couple Subscription Credits: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  try {
    plannerSubs = await getPlannerSubscriptionCredits();
  } catch (err) {
    errors.push(`Planner Subscription Credits: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Credit Configuration Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Couple AI Credit Costs</h2>
            {errors.some(e => e.startsWith('Couple AI Credit Costs')) ? (
              <p className="text-red-600">Error: {errors.find(e => e.startsWith('Couple AI Credit Costs'))}</p>
            ) : (
              <div className="text-left">
                <p className="text-green-600 mb-2">✅ Working! Loaded {Object.keys(coupleCosts || {}).length} features</p>
                <div className="text-sm space-y-1">
                  {coupleCosts && Object.entries(coupleCosts).slice(0, 5).map(([feature, cost]) => (
                    <div key={feature} className="flex justify-between">
                      <span className="font-medium">{feature}:</span>
                      <span>{String(cost)} credits</span>
                    </div>
                  ))}
                  {coupleCosts && Object.keys(coupleCosts).length > 5 && (
                    <div className="text-gray-500">... and {Object.keys(coupleCosts).length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Planner AI Credit Costs</h2>
            {errors.some(e => e.startsWith('Planner AI Credit Costs')) ? (
              <p className="text-red-600">Error: {errors.find(e => e.startsWith('Planner AI Credit Costs'))}</p>
            ) : (
              <div className="text-left">
                <p className="text-green-600 mb-2">✅ Working! Loaded {Object.keys(plannerCosts || {}).length} features</p>
                <div className="text-sm space-y-1">
                  {plannerCosts && Object.entries(plannerCosts).slice(0, 5).map(([feature, cost]) => (
                    <div key={feature} className="flex justify-between">
                      <span className="font-medium">{feature}:</span>
                      <span>{String(cost)} credits</span>
                    </div>
                  ))}
                  {plannerCosts && Object.keys(plannerCosts).length > 5 && (
                    <div className="text-gray-500">... and {Object.keys(plannerCosts).length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Couple Subscription Tiers</h2>
            {errors.some(e => e.startsWith('Couple Subscription Credits')) ? (
              <p className="text-red-600">Error: {errors.find(e => e.startsWith('Couple Subscription Credits'))}</p>
            ) : (
              <div className="text-left">
                <p className="text-green-600 mb-2">✅ Working! Loaded {Object.keys(coupleSubs || {}).length} tiers</p>
                <div className="text-sm space-y-1">
                  {coupleSubs && Object.entries(coupleSubs).map(([tier, config]) => (
                    <div key={tier} className="border-b pb-1">
                      <div className="font-medium capitalize">{tier}:</div>
                      <div className="text-gray-600">{(config as any).dailyCredits || (config as any).monthlyCredits} credits/day (refreshes daily)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Planner Subscription Tiers</h2>
            {errors.some(e => e.startsWith('Planner Subscription Credits')) ? (
              <p className="text-red-600">Error: {errors.find(e => e.startsWith('Planner Subscription Credits'))}</p>
            ) : (
              <div className="text-left">
                <p className="text-green-600 mb-2">✅ Working! Loaded {Object.keys(plannerSubs || {}).length} tiers</p>
                <div className="text-sm space-y-1">
                  {plannerSubs && Object.entries(plannerSubs).map(([tier, config]) => (
                    <div key={tier} className="border-b pb-1">
                      <div className="font-medium capitalize">{tier}:</div>
                      <div className="text-gray-600">{(config as any).dailyCredits || (config as any).monthlyCredits} credits/day (refreshes daily)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Overall Errors:</strong>
            <ul className="list-disc list-inside text-sm text-red-700">
              {errors.map((err, index) => <li key={index}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="text-left bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Add credit configuration data to your Edge Config in Vercel dashboard</li>
            <li>Use the migration guide to copy the JSON configuration</li>
            <li>Refresh this page to see the data from Edge Config</li>
            <li>If Edge Config fails, the app will automatically use fallback values</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
