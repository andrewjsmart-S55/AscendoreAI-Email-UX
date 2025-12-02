'use client'

import React from 'react'

// Sample emails to display while sync is in progress
const sampleEmails = [
  {
    id: 'sample-1',
    subject: 'Welcome to BoxZero - Your Email Management Solution',
    from: { email: 'hello@boxzero.io', name: 'BoxZero Team' },
    date: '2024-01-15T10:30:00Z',
    bodyPreview: 'Welcome to BoxZero! We\'re excited to help you manage your emails more efficiently with our AI-powered platform...',
    isRead: false,
    hasAttachments: false
  },
  {
    id: 'sample-2',
    subject: 'Meeting Tomorrow - Q1 Planning Session',
    from: { email: 'sarah.johnson@company.com', name: 'Sarah Johnson' },
    date: '2024-01-14T15:45:00Z',
    bodyPreview: 'Hi team, Just a reminder about our Q1 planning session tomorrow at 2 PM. Please review the attached agenda...',
    isRead: true,
    hasAttachments: true
  },
  {
    id: 'sample-3',
    subject: 'Invoice #2024-001 - Development Services',
    from: { email: 'billing@techservices.com', name: 'Tech Services Billing' },
    date: '2024-01-14T09:15:00Z',
    bodyPreview: 'Please find attached invoice #2024-001 for development services rendered in December 2023. Payment is due within 30 days...',
    isRead: false,
    hasAttachments: true
  },
  {
    id: 'sample-4',
    subject: 'Re: Project Update - New Features Implementation',
    from: { email: 'mike.chen@client.com', name: 'Mike Chen' },
    date: '2024-01-13T16:20:00Z',
    bodyPreview: 'Thanks for the update! The new features look great. I have a few questions about the user interface changes...',
    isRead: true,
    hasAttachments: false
  },
  {
    id: 'sample-5',
    subject: 'Security Alert - New Login Detected',
    from: { email: 'security@platform.com', name: 'Platform Security' },
    date: '2024-01-13T11:30:00Z',
    bodyPreview: 'We detected a new login to your account from Chrome on Windows. If this was you, no action is needed. If not, please...',
    isRead: false,
    hasAttachments: false
  }
]

interface EmailDebugPanelProps {
  accountEmail: string
  onClose: () => void
}

export default function EmailDebugPanel({ accountEmail, onClose }: EmailDebugPanelProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-blue-900">
          📧 Sample Email Preview for {accountEmail}
        </h3>
        <button
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ✕ Close
        </button>
      </div>

      <p className="text-xs text-blue-700 mb-3">
        These are sample emails to demonstrate the interface. Real emails will appear after sync completes.
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sampleEmails.map((email, index) => (
          <div
            key={email.id}
            className={`p-3 rounded border-l-4 ${
              email.isRead
                ? 'bg-gray-50 border-l-gray-300'
                : 'bg-white border-l-blue-400'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${
                  email.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'
                }`}>
                  {email.subject}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  From: {email.from.name} &lt;{email.from.email}&gt;
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                {email.hasAttachments && (
                  <span className="text-xs text-gray-400">📎</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(email.date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 truncate">
              {email.bodyPreview}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
        💡 <strong>Next Steps:</strong> Use the "Sync Messages" button above, wait 2-3 minutes for sync to complete, then refresh the page to see your real emails.
      </div>
    </div>
  )
}