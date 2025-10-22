"use client";

import React, { useState } from 'react';
import { googlePlacesClientService } from '@/utils/googlePlacesClientService';

export default function TestGooglePlacesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('wedding venue');
  const [location, setLocation] = useState('San Francisco, CA');
  const [category, setCategory] = useState('wedding_venue');

  const testPlacesAvailability = async () => {
    setIsLoading(true);
    try {
      const isAvailable = await googlePlacesClientService.isPlacesAvailable();
      setResult(isAvailable ? '✅ Google Places API is available and configured' : '❌ Google Places API is not available or not configured');
    } catch (error: any) {
      setResult(`❌ Error checking Google Places availability: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPlacesSearch = async () => {
    if (!searchTerm || !location) {
      setResult('❌ Please enter both search term and location');
      return;
    }

    setIsLoading(true);
    try {
      const result = await googlePlacesClientService.searchPlaces({
        category,
        location,
        searchTerm,
        maxResults: 5
      });

      if (result.success) {
        const placesCount = result.results?.length || 0;
        setResult(`✅ Found ${placesCount} places successfully!\n\nResults:\n${JSON.stringify(result.results, null, 2)}`);
      } else {
        setResult(`❌ Failed to search places: ${result.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Error searching places: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPlaceDetails = async () => {
    if (!searchTerm || !location) {
      setResult('❌ Please enter both search term and location first to get a place ID');
      return;
    }

    setIsLoading(true);
    try {
      // First search for a place to get its ID
      const searchResult = await googlePlacesClientService.searchPlaces({
        category,
        location,
        searchTerm,
        maxResults: 1
      });

      if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
        setResult('❌ No places found to get details for');
        return;
      }

      const placeId = searchResult.results[0].place_id;
      const detailsResult = await googlePlacesClientService.getPlaceDetails(placeId);

      if (detailsResult.success) {
        setResult(`✅ Place details retrieved successfully!\n\nDetails:\n${JSON.stringify(detailsResult.place, null, 2)}`);
      } else {
        setResult(`❌ Failed to get place details: ${detailsResult.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Error getting place details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Test Client-Side Google Places API
          </h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Google Places Availability Test
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Check if Google Places API is properly configured and available for client-side API calls.
              </p>
              <button
                onClick={testPlacesAvailability}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test Google Places Availability'}
              </button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Google Places Search Test
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Search for places using the client-side Google Places API.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Term</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., wedding venue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="wedding_venue">Wedding Venue</option>
                  <option value="florist">Florist</option>
                  <option value="photographer">Photographer</option>
                  <option value="caterer">Caterer</option>
                  <option value="dj">DJ</option>
                  <option value="beauty_salon">Beauty Salon</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={testPlacesSearch}
                  disabled={isLoading || !searchTerm || !location}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Searching...' : 'Search Places'}
                </button>
                <button
                  onClick={testPlaceDetails}
                  disabled={isLoading || !searchTerm || !location}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? 'Getting Details...' : 'Get Place Details'}
                </button>
              </div>
            </div>

            {result && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold text-gray-700 mb-2">Result:</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap max-h-96 overflow-y-auto">{result}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
