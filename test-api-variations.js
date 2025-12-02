// Test different API call variations to see what works
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

async function testAPIVariations() {
  console.log('🧪 TESTING DIFFERENT API CALL VARIATIONS')
  console.log('=' .repeat(70))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Target account: andrewj.smart@outlook.com (has 110k+ emails)
    const targetAccountId = '6727f555-6c73-435e-8c9b-fd9bf8b8a904'
    const inboxFolderId = '29e5d265-d471-4a7b-a47e-ca79eae314d4'

    console.log(`\n🎯 Testing messages API for account: ${targetAccountId}`)
    console.log(`   Folder ID: ${inboxFolderId}`)

    // Test 1: Our current approach
    console.log(`\n1️⃣ TESTING OUR CURRENT APPROACH:`)
    try {
      const response1 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` },
          params: { limit: 50, offset: 0 }
        }
      )
      console.log(`   ✅ Status: ${response1.status}`)
      console.log(`   📊 Messages: ${response1.data.messages?.length || 0}`)
      console.log(`   🔢 Total: ${response1.data.total}`)
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 2: Without parameters
    console.log(`\n2️⃣ TESTING WITHOUT PARAMETERS:`)
    try {
      const response2 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   ✅ Status: ${response2.status}`)
      console.log(`   📊 Messages: ${response2.data.messages?.length || 0}`)
      console.log(`   🔢 Total: ${response2.data.total}`)
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 3: Different parameter format
    console.log(`\n3️⃣ TESTING WITH QUERY STRING:`)
    try {
      const response3 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages?limit=50&offset=0`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   ✅ Status: ${response3.status}`)
      console.log(`   📊 Messages: ${response3.data.messages?.length || 0}`)
      console.log(`   🔢 Total: ${response3.data.total}`)
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 4: Different limit values
    console.log(`\n4️⃣ TESTING WITH DIFFERENT LIMITS:`)
    for (const limit of [1, 5, 10, 25, 100]) {
      try {
        const response4 = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages`,
          {
            headers: { 'Authorization': `Bearer ${firebaseToken}` },
            params: { limit }
          }
        )
        console.log(`   Limit ${limit}: ✅ ${response4.status} - ${response4.data.messages?.length || 0} messages`)
        if (response4.data.messages?.length > 0) {
          console.log(`   🎉 SUCCESS! Found messages with limit=${limit}`)
          break
        }
      } catch (error) {
        console.log(`   Limit ${limit}: ❌ ${error.response?.status} - ${error.message}`)
      }
    }

    // Test 5: POST instead of GET (some APIs use POST for complex queries)
    console.log(`\n5️⃣ TESTING POST REQUEST:`)
    try {
      const response5 = await axios.post(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages`,
        { limit: 50, offset: 0 },
        {
          headers: {
            'Authorization': `Bearer ${firebaseToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      console.log(`   ✅ Status: ${response5.status}`)
      console.log(`   📊 Messages: ${response5.data.messages?.length || 0}`)
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 6: Different headers
    console.log(`\n6️⃣ TESTING WITH DIFFERENT HEADERS:`)
    try {
      const response6 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${firebaseToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'BoxZero-NextJS-App'
          },
          params: { limit: 50, offset: 0 }
        }
      )
      console.log(`   ✅ Status: ${response6.status}`)
      console.log(`   📊 Messages: ${response6.data.messages?.length || 0}`)
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 7: Check if we need to manually sync messages first
    console.log(`\n7️⃣ TESTING SYNC THEN FETCH:`)
    try {
      console.log(`   Triggering sync for account...`)
      const syncResponse = await axios.post(
        `${API_BASE_URL}/api/auth/linked-accounts/${targetAccountId}/sync-messages`,
        {},
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   Sync response: ${syncResponse.status}`)

      // Wait a moment then try fetching
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response7 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` },
          params: { limit: 10 }
        }
      )
      console.log(`   ✅ After sync: ${response7.status} - ${response7.data.messages?.length || 0} messages`)
    } catch (error) {
      console.log(`   ❌ Sync failed: ${error.response?.status} - ${error.message}`)
    }

  } catch (error) {
    console.error('❌ Authentication error:', error.message)
  }
}

testAPIVariations()