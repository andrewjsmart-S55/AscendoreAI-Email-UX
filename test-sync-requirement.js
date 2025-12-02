// Test if sync is required before messages appear
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

async function testSyncRequirement() {
  console.log('🔄 TESTING IF SYNC IS REQUIRED BEFORE MESSAGES APPEAR')
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

    console.log(`\n🎯 Account: andrewj.smart@outlook.com`)
    console.log(`   Account ID: ${targetAccountId}`)
    console.log(`   Inbox Folder ID: ${inboxFolderId}`)

    // Step 1: Check current message count
    console.log(`\n📊 STEP 1: Check current message count`)
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages?limit=1`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   📧 Current messages: ${response.data.messages?.length || 0}`)
      console.log(`   🔢 Current total: ${response.data.total}`)
    } catch (error) {
      console.log(`   ❌ Failed to check current: ${error.response?.status} - ${error.message}`)
    }

    // Step 2: Check account sync status/info
    console.log(`\n🔍 STEP 2: Check account info`)
    try {
      const accountsResponse = await axios.get(
        `${API_BASE_URL}/api/auth/linked-accounts`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      const account = accountsResponse.data.find(acc => acc.accountId === targetAccountId)
      if (account) {
        console.log(`   📅 Last synced: ${account.lastSyncedAt}`)
        console.log(`   📧 Email: ${account.externalEmail}`)
        console.log(`   ⚡ Status: ${account.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Failed to get account info: ${error.message}`)
    }

    // Step 3: Try sync-messages endpoint
    console.log(`\n🔄 STEP 3: Triggering sync-messages`)
    try {
      const syncResponse = await axios.post(
        `${API_BASE_URL}/api/auth/linked-accounts/${targetAccountId}/sync-messages`,
        {},
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` },
          timeout: 30000 // 30 second timeout
        }
      )
      console.log(`   ✅ Sync response: ${syncResponse.status}`)
      console.log(`   📋 Sync data:`, syncResponse.data)
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log(`   ⏱️ Sync timed out (30s) - this might be normal for large accounts`)
      } else {
        console.log(`   ❌ Sync failed: ${error.response?.status} - ${error.message}`)
        if (error.response?.data) {
          console.log(`   📋 Error data:`, error.response.data)
        }
      }
    }

    // Step 4: Check again immediately after sync attempt
    console.log(`\n📊 STEP 4: Check messages immediately after sync`)
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolderId}/messages?limit=5`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   📧 Messages after sync: ${response.data.messages?.length || 0}`)
      console.log(`   🔢 Total after sync: ${response.data.total}`)
      if (response.data.messages?.length > 0) {
        console.log(`   🎉 SUCCESS! Messages appeared after sync`)
        const msg = response.data.messages[0]
        console.log(`   📧 First message: "${msg.subject}" from ${msg.from?.email || msg.sender}`)
      }
    } catch (error) {
      console.log(`   ❌ Failed to check after sync: ${error.response?.status} - ${error.message}`)
    }

    // Step 5: Try other sync-related endpoints
    console.log(`\n🔧 STEP 5: Try fetch-folders endpoint`)
    try {
      const fetchResponse = await axios.post(
        `${API_BASE_URL}/api/auth/linked-accounts/${targetAccountId}/fetch-folders`,
        {},
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` },
          timeout: 15000
        }
      )
      console.log(`   ✅ Fetch folders response: ${fetchResponse.status}`)
      console.log(`   📋 Fetch data:`, fetchResponse.data)
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log(`   ⏱️ Fetch-folders timed out (15s)`)
      } else {
        console.log(`   ❌ Fetch-folders failed: ${error.response?.status} - ${error.message}`)
      }
    }

    // Step 6: Final check with different folders
    console.log(`\n📂 STEP 6: Try different folders`)
    try {
      const foldersResponse = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )

      const folders = foldersResponse.data.slice(0, 3) // Test first 3 folders
      for (const folder of folders) {
        try {
          const msgResponse = await axios.get(
            `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${folder.folderId}/messages?limit=1`,
            {
              headers: { 'Authorization': `Bearer ${firebaseToken}` }
            }
          )
          const count = msgResponse.data.messages?.length || 0
          console.log(`   📁 ${folder.name}: ${count} messages (total: ${msgResponse.data.total})`)
          if (count > 0) {
            console.log(`   🎉 FOUND MESSAGES in folder: ${folder.name}!`)
          }
        } catch (error) {
          console.log(`   📁 ${folder.name}: Error ${error.response?.status}`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed to test other folders: ${error.message}`)
    }

  } catch (error) {
    console.error('❌ Authentication error:', error.message)
  }
}

testSyncRequirement()