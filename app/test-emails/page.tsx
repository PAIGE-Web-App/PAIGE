'use client';

import { useState } from 'react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/hooks/useAuth';

export default function TestEmailsPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // Generic test email function
  const sendTestEmail = async (endpoint: string, body: any, loadingKey: string, successMessage: string) => {
    if (!email) {
      showErrorToast('Please enter your email address');
      return;
    }

    setLoading(loadingKey);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, email, userName: user?.displayName || 'Test User' }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast(successMessage);
      } else {
        showErrorToast(data.error || 'Failed to send email');
      }
    } catch (error) {
      showErrorToast('Failed to send test email');
      console.error('Error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-linen p-8">
      <div className="max-width: 1200px mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="h3 text-primary-dark mb-2">📧 Email Test Center</h1>
          <p className="text-gray-600 font-work-sans">
            Test all email templates with real user data and different scenarios
          </p>
        </div>

        {/* Email Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
          <label className="block text-sm font-semibold text-primary-dark mb-2 font-work-sans">
            Your Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email to receive test emails"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent font-work-sans"
          />
          <p className="text-xs text-gray-500 mt-2 font-work-sans">
            {user ? `✅ Logged in as ${user.displayName || user.email}` : '⚠️ Log in to test with real user data'}
          </p>
        </div>

        {/* Welcome & Onboarding Emails */}
        <section className="mb-8">
          <h2 className="h5 text-primary-dark mb-4 flex items-center gap-2">
            <span>🎉</span> Welcome & Onboarding
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">👋</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                  Welcome Email (Your Real Data)
                </h3>
                <p className="text-sm text-gray-600 font-work-sans mb-4">
                  Personalized welcome email with your wedding date, location, venue, partner name, and dynamic next steps based on your profile.
                </p>
                <button
                  onClick={() => sendTestEmail('/api/test-welcome-scenarios', { scenario: 'real-data' }, 'welcome', 'Welcome email sent!')}
                  disabled={loading === 'welcome' || !email}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading === 'welcome' ? 'Sending...' : 'Send Welcome Email'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Todo Emails */}
        <section className="mb-8">
          <h2 className="h5 text-primary-dark mb-4 flex items-center gap-2">
            <span>📋</span> Todo & Task Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Todo Digest */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📅</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Weekly Todo Digest
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Shows your next 5 upcoming todos with deadlines. Sent every Sunday via cron job.
                  </p>
                  <button
                    onClick={async () => {
                      if (!user?.uid) {
                        showErrorToast('Please log in to test with real todo data');
                        return;
                      }
                      await sendTestEmail('/api/email/weekly-todo-digest', { userId: user.uid }, 'todo-digest', 'Weekly digest sent!');
                    }}
                    disabled={loading === 'todo-digest' || !email || !user}
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    {loading === 'todo-digest' ? 'Sending...' : 'Send Digest'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    💡 Requires real todo data
                  </p>
                </div>
              </div>
            </div>

            {/* Task Assignment */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔔</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Task Assignment
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Notifies when someone assigns you a task. Sent in real-time on assignment.
                  </p>
                  <button
                    onClick={() => showErrorToast('Triggered automatically when tasks are assigned')}
                    disabled
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    Auto-triggered
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    ✨ Automatic on task assignment
                  </p>
                </div>
              </div>
            </div>

            {/* Task Completion Celebration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🎉</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Task Completion Celebration
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Celebrates milestone completions (every 5th/10th task). Sent in real-time.
                  </p>
                  <button
                    onClick={() => showErrorToast('Triggered automatically on milestone completions')}
                    disabled
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    Auto-triggered
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    ✨ Automatic on milestones
                  </p>
                </div>
              </div>
            </div>

            {/* Missed Deadline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Missed Deadline Alert
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Alerts for overdue tasks. Sent daily via cron job.
                  </p>
                  <button
                    onClick={async () => {
                      if (!user?.uid) {
                        showErrorToast('Please log in to test with real todo data');
                        return;
                      }
                      await sendTestEmail('/api/email/trigger-missed-deadlines', { userId: user.uid }, 'missed', 'Missed deadline alert sent!');
                    }}
                    disabled={loading === 'missed' || !email || !user}
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    {loading === 'missed' ? 'Sending...' : 'Send Alert'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    💡 Only sends if overdue tasks exist
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Budget Emails */}
        <section className="mb-8">
          <h2 className="h5 text-primary-dark mb-4 flex items-center gap-2">
            <span>💰</span> Budget & Payments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget Threshold Alert */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📊</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Budget Threshold Alert
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Alerts when budget reaches 75%/90%. Sent in real-time when thresholds are hit.
                  </p>
                  <button
                    onClick={() => showErrorToast('Triggered automatically when budget thresholds are reached')}
                    disabled
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    Auto-triggered
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    ✨ Automatic on threshold
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Overdue */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💳</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Payment Overdue Alert
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Alerts for overdue payments. Sent weekly via cron job.
                  </p>
                  <button
                    onClick={() => sendTestEmail('/api/test-budget-payment-overdue', {}, 'budget-overdue', 'Payment overdue alert sent!')}
                    disabled={loading === 'budget-overdue' || !email}
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    {loading === 'budget-overdue' ? 'Sending...' : 'Send Alert'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    💡 Test with mock data
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Creation Reminder */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📝</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Budget Creation Reminder
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    Reminds users to create budget after 7 days. Sent via cron job.
                  </p>
                  <button
                    onClick={() => sendTestEmail('/api/test-budget-creation-reminder', {}, 'budget-reminder', 'Budget reminder sent!')}
                    disabled={loading === 'budget-reminder' || !email}
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    {loading === 'budget-reminder' ? 'Sending...' : 'Send Reminder'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    💡 Test with mock data
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vendor & Message Emails */}
        <section className="mb-8">
          <h2 className="h5 text-primary-dark mb-4 flex items-center gap-2">
            <span>✨</span> Vendors & Messages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Vendor Matches */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🎯</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    New Vendor Matches
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    AI-powered vendor recommendations. Sent in real-time when matches are found.
                  </p>
                  <button
                    onClick={() => showErrorToast('Triggered automatically when AI finds matching vendors')}
                    disabled
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    Auto-triggered
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    ✨ Automatic on AI matches
                  </p>
                </div>
              </div>
            </div>

            {/* Vendor Replies */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📬</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                    Vendor Replies
                  </h3>
                  <p className="text-sm text-gray-600 font-work-sans mb-4">
                    New vendor message notifications. Sent via Gmail Pub/Sub webhook.
                  </p>
                  <button
                    onClick={() => showErrorToast('Triggered automatically via Gmail webhook')}
                    disabled
                    className="btn-primary disabled:opacity-50 text-sm"
                  >
                    Auto-triggered
                  </button>
                  <p className="text-xs text-gray-500 mt-2 font-work-sans">
                    ✨ Automatic via webhook
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Credits Email */}
        <section className="mb-8">
          <h2 className="h5 text-primary-dark mb-4 flex items-center gap-2">
            <span>⭐</span> Credits & System
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🔋</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                  Credit Alert
                </h3>
                <p className="text-sm text-gray-600 font-work-sans mb-4">
                  Notifies when credits are low (≤5) or depleted. Sent in real-time.
                </p>
                <button
                  onClick={() => showErrorToast('Triggered automatically when credits are low')}
                  disabled
                  className="btn-primary disabled:opacity-50"
                >
                  Auto-triggered
                </button>
                <p className="text-xs text-gray-500 mt-2 font-work-sans">
                  ✨ Automatic on low credits
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-blue-900 font-semibold mb-3 font-work-sans flex items-center gap-2">
            <span>ℹ️</span> Email System Overview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800 text-sm font-work-sans">
            <div>
              <h5 className="font-semibold mb-2">🤖 Automated (Cron Jobs)</h5>
              <ul className="space-y-1 ml-4">
                <li>• Weekly Todo Digest (Sundays)</li>
                <li>• Missed Deadline Alerts (Daily)</li>
                <li>• Payment Overdue Alerts (Weekly)</li>
                <li>• Budget Reminders (Weekly)</li>
                <li>• Credit Refresh (Daily)</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">⚡ Real-time (Event-driven)</h5>
              <ul className="space-y-1 ml-4">
                <li>• Task Assignments</li>
                <li>• Task Completions (Milestones)</li>
                <li>• Budget Threshold Alerts</li>
                <li>• Vendor Matches</li>
                <li>• Vendor Message Replies</li>
                <li>• Credit Alerts</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-blue-800 text-sm">
              <strong>✅ All emails use real user data</strong> including todos, budget items, vendor information, and wedding details. 
              No new cron jobs needed for the new email templates - they're all event-driven! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
