'use client';

import { useState } from 'react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/hooks/useAuth';

export default function TestWelcomeEmailPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const scenarios = [
    {
      id: 'complete',
      name: 'Complete Setup',
      description: 'Date + Location + Venue + Partner',
      icon: '✅',
      data: {
        weddingDate: 'June 15, 2026',
        location: 'San Francisco, CA',
        venue: 'Yes',
        partner: 'Alex Johnson',
      }
    },
    {
      id: 'partial',
      name: 'Partial Setup',
      description: 'Date + Location (No Venue)',
      icon: '📝',
      data: {
        weddingDate: 'August 20, 2026',
        location: 'Austin, TX',
        venue: 'No',
        partner: 'Sam Williams',
      }
    },
    {
      id: 'date-only',
      name: 'Date Only',
      description: 'Wedding Date Set Only',
      icon: '📅',
      data: {
        weddingDate: 'December 25, 2025',
        location: 'Not Set',
        venue: 'No',
        partner: 'Jordan Lee',
      }
    },
    {
      id: 'minimal',
      name: 'Minimal Setup',
      description: 'Nothing Set',
      icon: '🆕',
      data: {
        weddingDate: 'Not Set',
        location: 'Not Set',
        venue: 'No',
        partner: 'Riley Martinez',
      }
    },
    {
      id: 'no-partner',
      name: 'No Partner Name',
      description: 'Complete but no partner',
      icon: '👤',
      data: {
        weddingDate: 'September 12, 2026',
        location: 'Seattle, WA',
        venue: 'Yes',
        partner: 'Not Provided',
      }
    },
  ];

  const sendTestEmail = async (scenario: string) => {
    if (!email) {
      showErrorToast('Please enter your email address');
      return;
    }

    setLoading(scenario);
    try {
      const response = await fetch('/api/test-welcome-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, scenario }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast(`${data.scenario} email sent successfully!`);
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

  const sendTodoDigestEmail = async () => {
    if (!email) {
      showErrorToast('Please enter your email address');
      return;
    }

    if (!user?.uid) {
      showErrorToast('Please log in to test with your real todo data');
      return;
    }

    setLoading('todo-digest');
    try {
      const response = await fetch('/api/email/weekly-todo-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Weekly Todo Digest email sent successfully!');
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

  const sendMissedDeadlineEmail = async () => {
    if (!email) {
      showErrorToast('Please enter your email address');
      return;
    }

    if (!user?.uid) {
      showErrorToast('Please log in to test with your real todo data');
      return;
    }

    setLoading('missed-deadline');
    try {
      const response = await fetch('/api/email/trigger-missed-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Missed Deadline email sent successfully!');
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

  const sendBudgetPaymentOverdueEmail = async () => {
    if (!email) {
      showErrorToast('Please enter your email address');
      return;
    }

    setLoading('budget-overdue');
    try {
      const response = await fetch('/api/test-budget-payment-overdue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          userName: user?.displayName || 'Test User'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Budget Payment Overdue email sent successfully!');
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

  const sendBudgetCreationReminderEmail = async () => {
    if (!email) {
      showErrorToast('Please enter your email address');
      return;
    }

    setLoading('budget-reminder');
    try {
      const response = await fetch('/api/test-budget-creation-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          userName: user?.displayName || 'Test User'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Budget Creation Reminder email sent successfully!');
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
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="h3 text-primary-dark mb-2">📧 Email Test Center</h1>
          <p className="text-gray-600 font-work-sans">
            Test the email system with different scenarios and real user data
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
            You'll receive emails showing how the content adapts to different user scenarios
          </p>
        </div>

        {/* Reminder Emails Section */}
        <div className="mb-8">
          <h2 className="h5 text-primary-dark mb-4">📋 Reminder Emails (Real User Data)</h2>
          
          {/* Weekly Todo Digest */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">📋</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                  Weekly Todo Digest
                </h3>
                <p className="text-sm text-gray-600 font-work-sans mb-4">
                  Shows your next 5 upcoming todo items with deadlines, categories, and list names. 
                  Uses real data from your todo lists!
                </p>
                <button
                  onClick={sendTodoDigestEmail}
                  disabled={loading === 'todo-digest' || !email}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'todo-digest' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Weekly Todo Digest'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 font-work-sans">
                  💡 Make sure you have some incomplete todo items to see this in action!
                </p>
              </div>
            </div>
          </div>

          {/* Missed Deadline Reminder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                  Missed Deadline Reminder
                </h3>
                <p className="text-sm text-gray-600 font-work-sans mb-4">
                  Sends alerts for overdue todo items with deadlines. Only sends if you have overdue items!
                </p>
                <button
                  onClick={sendMissedDeadlineEmail}
                  disabled={loading === 'missed-deadline' || !email}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'missed-deadline' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Missed Deadline Alert'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 font-work-sans">
                  💡 Only sends if you have overdue todo items with deadlines!
                </p>
              </div>
            </div>
          </div>

          {/* Budget Payment Overdue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💳</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                  Budget Payment Overdue
                </h3>
                <p className="text-sm text-gray-600 font-work-sans mb-4">
                  Alerts for overdue budget payments. Only sends if you have unpaid budget items past due date!
                </p>
                <button
                  onClick={sendBudgetPaymentOverdueEmail}
                  disabled={loading === 'budget-overdue' || !email}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'budget-overdue' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Budget Overdue Alert'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 font-work-sans">
                  💡 Only sends if you have unpaid budget items past their due date!
                </p>
              </div>
            </div>
          </div>

          {/* Budget Creation Reminder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💰</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-dark font-work-sans mb-2">
                  Budget Creation Reminder
                </h3>
                <p className="text-sm text-gray-600 font-work-sans mb-4">
                  Reminds users who signed up 7 days ago to create their wedding budget. Only sends if no budget items exist!
                </p>
                <button
                  onClick={sendBudgetCreationReminderEmail}
                  disabled={loading === 'budget-reminder' || !email}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'budget-reminder' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Budget Creation Reminder'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 font-work-sans">
                  💡 Only sends to users who signed up 7 days ago and have no budget items!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Email Scenarios */}
        <h2 className="h5 text-primary-dark mb-4">🎉 Welcome Email Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gradient-to-r from-accent to-accent-dark p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold font-work-sans flex items-center gap-2">
                      <span className="text-2xl">{scenario.icon}</span>
                      {scenario.name}
                    </h3>
                    <p className="text-white text-xs opacity-90 font-work-sans">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm font-work-sans">
                    <span className="text-gray-600">Wedding Date:</span>
                    <span className="font-semibold text-primary-dark">{scenario.data.weddingDate}</span>
                  </div>
                  <div className="flex justify-between text-sm font-work-sans">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-semibold text-primary-dark">{scenario.data.location}</span>
                  </div>
                  <div className="flex justify-between text-sm font-work-sans">
                    <span className="text-gray-600">Venue:</span>
                    <span className="font-semibold text-primary-dark">{scenario.data.venue}</span>
                  </div>
                  <div className="flex justify-between text-sm font-work-sans">
                    <span className="text-gray-600">Partner:</span>
                    <span className="font-semibold text-primary-dark">{scenario.data.partner}</span>
                  </div>
                </div>

                <button
                  onClick={() => sendTestEmail(scenario.id)}
                  disabled={loading === scenario.id || !email}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === scenario.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Test Email'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-blue-900 font-semibold mb-2 font-work-sans">ℹ️ How It Works</h4>
          <ul className="text-blue-800 text-sm space-y-1 font-work-sans">
            <li>• Each scenario shows different user data completeness levels</li>
            <li>• The email content dynamically adapts based on what data is available</li>
            <li>• Missing information shows as action items with helpful prompts</li>
            <li>• Completed items show with green checkmarks</li>
            <li>• Next steps are prioritized based on what's missing</li>
          </ul>
        </div>

        {/* Send All Button */}
        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              if (!email) {
                showErrorToast('Please enter your email address');
                return;
              }
              for (const scenario of scenarios) {
                await sendTestEmail(scenario.id);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }}
            disabled={loading !== null || !email}
            className="btn-gradient-purple px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send All Test Emails
          </button>
        </div>
      </div>
    </div>
  );
}

