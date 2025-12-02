'use client'

import React from 'react'
import { useAccounts } from '@/hooks/useEmails'
import { ascendoreAuth } from '@/lib/ascendore-auth'

export default function DataDebugPanel() {
  const { data: accountsData, isLoading, error } = useAccounts()
  const currentUser = ascendoreAuth.getUser()
  const authToken = ascendoreAuth.getToken()

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-red-500 rounded-lg p-4 shadow-lg max-w-md max-h-96 overflow-auto z-50">
      <h3 className="text-lg font-bold text-red-600 mb-2">DATA DEBUG PANEL</h3>

      <div className="space-y-3 text-xs">
        {/* Authentication Status */}
        <div className="border-b pb-2">
          <h4 className="font-semibold text-gray-900">Authentication:</h4>
          <p>User: {currentUser ? currentUser.email : 'Not authenticated'}</p>
          <p>Token: {authToken ? authToken.substring(0, 20) + '...' : 'No token'}</p>
        </div>

        {/* Accounts Hook Status */}
        <div className="border-b pb-2">
          <h4 className="font-semibold text-gray-900">useAccounts Hook:</h4>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Error: {error ? error.message : 'None'}</p>
          <p>Data: {accountsData ? 'Present' : 'None'}</p>
        </div>

        {/* Accounts Data */}
        <div>
          <h4 className="font-semibold text-gray-900">Accounts Data:</h4>
          {accountsData?.accounts ? (
            <div>
              <p className="font-semibold">Count: {accountsData.accounts.length}</p>
              <p className="font-semibold">Data Source: {accountsData.accounts.length > 0 ? 'API' : 'No data'}</p>
              <ul className="mt-1 space-y-1">
                {accountsData.accounts.map((account: any, i: number) => (
                  <li key={account.id} className="bg-gray-50 p-1 rounded">
                    <strong>{i + 1}.</strong> {account.email}
                    <br />
                    <span className="text-gray-600">ID: {account.id}</span>
                    <br />
                    <span className="text-gray-600">Provider: {account.provider}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-red-600">No accounts data</p>
          )}
        </div>

        {/* Raw API Response */}
        <div className="border-t pt-2">
          <h4 className="font-semibold text-gray-900">Raw Data:</h4>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(accountsData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
