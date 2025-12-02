// Test if we need to sync messages first before they become available
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

async function testSyncThenFetch() {
  console.log('🔄 TESTING MESSAGE SYNC THEN FETCH')
  console.log('='.repeat(60))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Get accounts
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const accounts = accountsResponse.data
    const testAccount = accounts[0] // Use first account
    const accountId = testAccount.accountId
    const email = testAccount.externalEmail || testAccount.external_email

    console.log(`\n🎯 Testing sync for account: ${email}`)
    console.log(`   Account ID: ${accountId}`)

    // Step 1: Try to trigger message sync
    console.log(`\n🔄 Step 1: Triggering message sync...`)
    try {
      const syncResponse = await axios.post(
        `${API_BASE_URL}/api/auth/linked-accounts/${accountId}/sync-messages`,
        {}, // Empty body
        { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
      )

      console.log(`✅ Sync request sent successfully`)
      console.log(`   Response:`, syncResponse.data)

      // Wait a moment for sync to potentially start
      console.log(`⏳ Waiting 3 seconds for sync to process...`)
      await new Promise(resolve => setTimeout(resolve, 3000))

    } catch (error) {
      console.log(`❌ Sync failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`)
    }

    // Step 2: Check if fetch-folders helps
    console.log(`\n📁 Step 2: Triggering folder fetch...`)
    try {
      const fetchFoldersResponse = await axios.post(
        `${API_BASE_URL}/api/auth/linked-accounts/${accountId}/fetch-folders`,
        {}, // Empty body
        { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
      )

      console.log(`✅ Folder fetch request sent successfully`)
      console.log(`   Response:`, fetchFoldersResponse.data)

      // Wait a moment
      console.log(`⏳ Waiting 2 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.log(`❌ Folder fetch failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`)
    }

    // Step 3: Now try to get messages again
    console.log(`\n📧 Step 3: Checking messages after sync...`)

    // Get updated folders
    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    console.log(`📁 Found ${folders.length} folders`)

    // Find a folder with messages
    const folderWithMessages = folders.find(f => (f.messageCount || 0) > 0)
    if (!folderWithMessages) {
      console.log(`📭 Still no folders with messages after sync`)
      return
    }

    const folderId = folderWithMessages.folderId || folderWithMessages.id
    console.log(`\n📧 Testing folder: "${folderWithMessages.name || folderWithMessages.displayName}"`)
    console.log(`   Folder ID: ${folderId}`)
    console.log(`   Message Count: ${folderWithMessages.messageCount || 0}`)

    try {
      const messagesResponse = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=3`,
        { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
      )

      const result = messagesResponse.data
      const messageCount = result.messages?.length || 0

      if (messageCount > 0) {
        console.log(`🎉 SUCCESS! Found ${messageCount} messages after sync`)
        result.messages.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. "${msg.subject || 'No Subject'}"`)
          console.log(`      From: ${msg.from?.email || msg.sender?.email || 'Unknown'}`)
        })
      } else {
        console.log(`📭 Still no messages returned even after sync`)
      }

    } catch (error) {
      console.log(`❌ Message fetch still failed: ${error.response?.status} - ${error.message}`)
    }

    console.log(`\n💡 If sync worked, the other frontend probably calls sync operations automatically`)
    console.log(`   Our frontend may need to trigger sync before displaying messages`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSyncThenFetch()