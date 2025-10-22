"use client";

import React, { useState } from 'react';
import { googlePlacesClientService } from '@/utils/googlePlacesClientService';
import { googleCalendarClientService } from '@/utils/googleCalendarClientService';
import { googlePhotosClientService } from '@/utils/googlePhotosClientService';
import { gmailClientService } from '@/utils/gmailClientService';

export default function TestAllGoogleAPIsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [testData, setTestData] = useState({
    searchTerm: 'wedding venue',
    location: 'San Francisco, CA',
    placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    calendarName: 'Test Wedding Calendar',
    userId: 'test-user-123',
    emailTo: 'test@example.com',
    emailSubject: 'Test Email',
    emailBody: 'This is a test email from Paige.'
  });

  const testGooglePlaces = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing Google Places API...');
      
      const placesResult = await googlePlacesClientService.searchPlaces({
        category: 'wedding_venue',
        location: testData.location,
        maxResults: 3
      });
      
      setResults(prev => ({ ...prev, places: placesResult }));
      console.log('✅ Google Places test completed');
    } catch (error: any) {
      console.error('❌ Google Places test failed:', error);
      setResults(prev => ({ ...prev, places: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const testGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing Google Calendar API...');
      
      const calendarResult = await googleCalendarClientService.createCalendar({
        userId: testData.userId,
        calendarName: testData.calendarName
      });
      
      setResults(prev => ({ ...prev, calendar: calendarResult }));
      console.log('✅ Google Calendar test completed');
    } catch (error: any) {
      console.error('❌ Google Calendar test failed:', error);
      setResults(prev => ({ ...prev, calendar: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const testGooglePhotos = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing Google Photos API...');
      
      const photosResult = await googlePhotosClientService.searchPhotos({
        placeId: testData.placeId,
        limit: 3,
        maxWidth: 400,
        maxHeight: 300
      });
      
      setResults(prev => ({ ...prev, photos: photosResult }));
      console.log('✅ Google Photos test completed');
    } catch (error: any) {
      console.error('❌ Google Photos test failed:', error);
      setResults(prev => ({ ...prev, photos: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const testGmail = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing Gmail API...');
      
      const gmailResult = await gmailClientService.sendNewMessage(testData.userId, {
        to: testData.emailTo,
        subject: testData.emailSubject,
        body: testData.emailBody
      });
      
      setResults(prev => ({ ...prev, gmail: gmailResult }));
      console.log('✅ Gmail test completed');
    } catch (error: any) {
      console.error('❌ Gmail test failed:', error);
      setResults(prev => ({ ...prev, gmail: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const testAllAPIs = async () => {
    setIsLoading(true);
    setResults({});
    
    try {
      console.log('🧪 Testing all Google APIs...');
      
      // Test all APIs in parallel
      const [placesResult, calendarResult, photosResult, gmailResult] = await Promise.allSettled([
        googlePlacesClientService.searchPlaces({
          category: 'wedding_venue',
          location: testData.location,
          maxResults: 2
        }),
        googleCalendarClientService.getCalendarStatus(testData.userId),
        googlePhotosClientService.searchPhotos({
          placeId: testData.placeId,
          limit: 2,
          maxWidth: 400,
          maxHeight: 300
        }),
        gmailClientService.isGmailAvailable(testData.userId)
      ]);
      
      setResults({
        places: placesResult.status === 'fulfilled' ? placesResult.value : { success: false, error: placesResult.reason },
        calendar: calendarResult.status === 'fulfilled' ? calendarResult.value : { success: false, error: calendarResult.reason },
        photos: photosResult.status === 'fulfilled' ? photosResult.value : { success: false, error: photosResult.reason },
        gmail: gmailResult.status === 'fulfilled' ? gmailResult.value : { success: false, error: gmailResult.reason }
      });
      
      console.log('✅ All Google APIs test completed');
    } catch (error: any) {
      console.error('❌ All APIs test failed:', error);
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults({});
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🧪 Google APIs Comprehensive Test Suite
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Test Configuration</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Term
                </label>
                <input
                  type="text"
                  value={testData.searchTerm}
                  onChange={(e) => setTestData(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={testData.location}
                  onChange={(e) => setTestData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place ID
                </label>
                <input
                  type="text"
                  value={testData.placeId}
                  onChange={(e) => setTestData(prev => ({ ...prev, placeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar Name
                </label>
                <input
                  type="text"
                  value={testData.calendarName}
                  onChange={(e) => setTestData(prev => ({ ...prev, calendarName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Test Actions</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={testGooglePlaces}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Places API
                </button>
                
                <button
                  onClick={testGoogleCalendar}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Calendar API
                </button>
                
                <button
                  onClick={testGooglePhotos}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Photos API
                </button>
                
                <button
                  onClick={testGmail}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Gmail API
                </button>
              </div>
              
              <button
                onClick={testAllAPIs}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading ? 'Testing All APIs...' : 'Test All APIs'}
              </button>
              
              <button
                onClick={clearResults}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear Results
              </button>
            </div>
          </div>
          
          {Object.keys(results).length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Test Results</h2>
              
              {results.places && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📍 Google Places API</h3>
                  <div className="text-sm text-blue-800">
                    <p><strong>Status:</strong> {results.places.success ? '✅ Success' : '❌ Failed'}</p>
                    {results.places.success ? (
                      <div>
                        <p><strong>Results Found:</strong> {results.places.results?.length || 0}</p>
                        {results.places.results?.slice(0, 2).map((place: any, index: number) => (
                          <p key={index} className="mt-1">• {place.name}</p>
                        ))}
                      </div>
                    ) : (
                      <p><strong>Error:</strong> {results.places.error}</p>
                    )}
                  </div>
                </div>
              )}
              
              {results.calendar && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">📅 Google Calendar API</h3>
                  <div className="text-sm text-green-800">
                    <p><strong>Status:</strong> {results.calendar.success ? '✅ Success' : '❌ Failed'}</p>
                    {results.calendar.success ? (
                      <div>
                        <p><strong>Linked:</strong> {results.calendar.isLinked ? 'Yes' : 'No'}</p>
                        {results.calendar.calendarName && (
                          <p><strong>Calendar:</strong> {results.calendar.calendarName}</p>
                        )}
                      </div>
                    ) : (
                      <p><strong>Error:</strong> {results.calendar.error}</p>
                    )}
                  </div>
                </div>
              )}
              
              {results.photos && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">🖼️ Google Photos API</h3>
                  <div className="text-sm text-purple-800">
                    <p><strong>Status:</strong> {results.photos.success ? '✅ Success' : '❌ Failed'}</p>
                    {results.photos.success ? (
                      <div>
                        <p><strong>Photos Found:</strong> {results.photos.images?.length || 0}</p>
                        <p><strong>Total Available:</strong> {results.photos.totalAvailable || 0}</p>
                        {results.photos.images?.slice(0, 2).map((image: string, index: number) => (
                          <div key={index} className="mt-2">
                            <img src={image} alt={`Photo ${index + 1}`} className="w-20 h-20 object-cover rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p><strong>Error:</strong> {results.photos.error}</p>
                    )}
                  </div>
                </div>
              )}
              
              {results.gmail && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">📧 Gmail API</h3>
                  <div className="text-sm text-red-800">
                    <p><strong>Status:</strong> {results.gmail.success ? '✅ Success' : '❌ Failed'}</p>
                    {results.gmail.success ? (
                      <p><strong>Available:</strong> {results.gmail ? 'Yes' : 'No'}</p>
                    ) : (
                      <p><strong>Error:</strong> {results.gmail.error}</p>
                    )}
                  </div>
                </div>
              )}
              
              {results.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">❌ General Error</h3>
                  <p className="text-sm text-red-800">{results.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
