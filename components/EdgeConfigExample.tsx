/**
 * Example Component: How to use Edge Config safely
 * This shows how to integrate Edge Config without breaking your app
 */

import React, { useState, useEffect } from 'react';
import { useEdgeConfig } from '@/hooks/useEdgeConfig';
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';

export function EdgeConfigExample() {
  const { isAvailable, isLoading, error, getCategories, getFeature } = useEdgeConfig();
  const [categories, setCategories] = useState(VENDOR_CATEGORIES);
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load vendor categories from Edge Config (with fallback)
        const edgeCategories = await getCategories();
        setCategories(edgeCategories);

        // Load feature flag from Edge Config (with fallback)
        const isFeatureEnabled = await getFeature('enableVibeGeneration', true);
        setFeatureEnabled(isFeatureEnabled);
      } catch (err) {
        console.error('Error loading Edge Config data:', err);
        // App continues to work with fallback data
      }
    };

    loadData();
  }, [getCategories, getFeature]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Edge Config Integration Example</h2>
      
      {/* Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-semibold mb-2">Status</h3>
        <p><strong>Edge Config Available:</strong> {isAvailable ? 'Yes' : 'No'}</p>
        <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        {error && <p><strong>Error:</strong> {error}</p>}
      </div>

      {/* Feature Flag */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h3 className="text-lg font-semibold mb-2">Feature Flag</h3>
        <p><strong>Vibe Generation Enabled:</strong> {featureEnabled ? 'Yes' : 'No'}</p>
        <p className="text-sm text-gray-600">
          This comes from Edge Config with fallback to default value
        </p>
      </div>

      {/* Vendor Categories */}
      <div className="mb-6 p-4 bg-green-50 rounded">
        <h3 className="text-lg font-semibold mb-2">Vendor Categories</h3>
        <p className="text-sm text-gray-600 mb-2">
          Loaded from Edge Config with fallback to local constants
        </p>
        <div className="grid grid-cols-2 gap-2">
          {categories.slice(0, 6).map((category, index) => (
            <div key={index} className="p-2 bg-white rounded border">
              <span className="font-medium">{category.label}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Showing {categories.length} total categories
        </p>
      </div>

      {/* Benefits */}
      <div className="p-4 bg-yellow-50 rounded">
        <h3 className="text-lg font-semibold mb-2">Benefits</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Faster loading (Edge Config is globally distributed)</li>
          <li>Lower Firestore costs (static data moved to Edge Config)</li>
          <li>Safe fallbacks (app works even if Edge Config fails)</li>
          <li>Easy updates (change data without code deployment)</li>
        </ul>
      </div>
    </div>
  );
}
