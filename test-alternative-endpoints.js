// Test alternative API endpoints to find the correct one used by working frontend
const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')
const axios = require('axios')

const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
}

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net'
const TEST_EMAIL = 'andrew@boxzero.io'
const TEST_PASSWORD = 'Churchwhit2023$'

async function testAlternativeEndpoints() {
  console.log('🔍 TESTING ALTERNATIVE API ENDPOINTS')
  console.log('='.repeat(60))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Get accounts first
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const accounts = accountsResponse.data
    const testAccount = accounts[0] // Use first account
    const accountId = testAccount.accountId
    const email = testAccount.externalEmail || testAccount.external_email

    console.log(`\n🎯 Testing with account: ${email}`)
    console.log(`   Account ID: ${accountId}`)

    // Get folders
    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    const testFolder = folders.find(f => (f.messageCount || 0) > 0) || folders[0]
    const folderId = testFolder.folderId || testFolder.id

    console.log(`\n📁 Testing with folder: "${testFolder.name || testFolder.displayName}"`)
    console.log(`   Folder ID: ${folderId}`)
    console.log(`   Message Count: ${testFolder.messageCount || 0}`)

    // Test various endpoint patterns
    const endpointsToTest = [
      // Current endpoint we're using
      `/api/messages/accounts/${accountId}/folders/${folderId}/messages`,

      // Alternative patterns the other frontend might use
      `/api/messages/${accountId}/folders/${folderId}`,
      `/api/accounts/${accountId}/folders/${folderId}/messages`,
      `/api/v1/messages/accounts/${accountId}/folders/${folderId}/messages`,
      `/messages/accounts/${accountId}/folders/${folderId}`,

      // Maybe they use folder names instead of IDs
      `/api/messages/accounts/${accountId}/folders/${encodeURIComponent(testFolder.name || testFolder.displayName)}/messages`,

      // Or external folder IDs
      `/api/messages/accounts/${accountId}/folders/${testFolder.externalId || testFolder.external_id}/messages`,

      // Different account ID format
      `/api/messages/accounts/${testAccount.externalEmail}/folders/${folderId}/messages`,

      // Simpler patterns
      `/api/emails/accounts/${accountId}/folders/${folderId}`,
      `/api/emails/${accountId}/${folderId}`,
      `/emails/accounts/${accountId}/folders/${folderId}`,

      // Maybe they use different parameter structure
      `/api/messages/accounts/${accountId}/folders/${folderId}`,
      `/api/messages?accountId=${accountId}&folderId=${folderId}`,
      `/api/accounts/${accountId}/messages?folderId=${folderId}`
    ]

    console.log(`\n🧪 TESTING ${endpointsToTest.length} POSSIBLE ENDPOINTS:`)

    for (let i = 0; i < endpointsToTest.length; i++) {
      const endpoint = endpointsToTest[i]
      console.log(`\n${i + 1}. Testing: ${endpoint}`)

      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}?limit=2`, {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        })

        const data = response.data
        const messages = data.messages || data.emails || data
        const messageCount = Array.isArray(messages) ? messages.length : 0

        if (messageCount > 0) {
          console.log(`   🎉 SUCCESS! Found ${messageCount} messages`)
          console.log(`   📧 Sample message: "${messages[0]?.subject || 'No Subject'}"`)
          console.log(`   📊 Total available: ${data.total || messageCount}`)
          console.log(`   🔥 THIS IS THE CORRECT ENDPOINT!`)

          // Show the response structure
          console.log(`\n📋 Response structure:`)
          console.log(JSON.stringify(data, null, 2))

          return // Found working endpoint, stop testing
        } else {
          console.log(`   📭 Empty response (${messageCount} messages)`)
        }

      } catch (error) {
        const status = error.response?.status
        const message = error.response?.data?.error || error.message
        console.log(`   ❌ Failed: ${status} - ${message}`)
      }
    }

    console.log(`\n💡 No working endpoints found. The other frontend might be:`)
    console.log(`   1. Using a different API base URL`)
    console.log(`   2. Using different authentication`)
    console.log(`   3. Using websockets or other protocols`)
    console.log(`   4. Calling different backend services`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAlternativeEndpoints()