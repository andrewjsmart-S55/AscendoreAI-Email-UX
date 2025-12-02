// Test sync + display workflow - trigger sync then check for emails
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

async function testSyncAndDisplay() {
  console.log('🔄 TESTING SYNC + DISPLAY WORKFLOW')
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

    // Use andrew@boxzero.io account (smaller, likely to sync faster)
    const testAccount = accounts.find(acc =>
      (acc.externalEmail || acc.external_email) === 'andrew@boxzero.io'
    )

    if (!testAccount) {
      console.log('❌ andrew@boxzero.io account not found')
      return
    }

    const accountId = testAccount.accountId
    const email = testAccount.externalEmail || testAccount.external_email

    console.log(`\n🎯 Testing sync + display for: ${email}`)
    console.log(`   Account ID: ${accountId}`)

    // Step 1: Trigger sync (with shorter timeout for testing)
    console.log(`\n🔄 Step 1: Triggering message sync...`)
    try {
      const syncResponse = await axios.post(
        `${API_BASE_URL}/api/auth/linked-accounts/${accountId}/sync-messages`,
        {},
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` },
          timeout: 30000 // 30 seconds timeout for testing
        }
      )
      console.log(`✅ Sync completed successfully:`, syncResponse.data)
    } catch (syncError) {
      if (syncError.code === 'ECONNABORTED') {
        console.log(`⏳ Sync is taking longer than 30 seconds (this is normal)`)
        console.log(`   Sync is likely still running in the background...`)
      } else {
        console.log(`❌ Sync failed: ${syncError.response?.status} - ${syncError.response?.data?.error || syncError.message}`)
      }
    }

    // Step 2: Wait a moment
    console.log(`\n⏳ Waiting 5 seconds before checking messages...`)
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Step 3: Try to get messages
    console.log(`\n📧 Step 3: Checking for messages after sync...`)

    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    const foldersWithMessages = folders.filter(f => (f.messageCount || 0) > 0)

    if (foldersWithMessages.length === 0) {
      console.log(`📭 Still no folders with messages after sync`)
      return
    }

    // Test Inbox first if available
    let testFolder = foldersWithMessages.find(f =>
      (f.name || f.displayName || '').toLowerCase().includes('inbox')
    )

    if (!testFolder) {
      // Use first folder with messages
      testFolder = foldersWithMessages[0]
    }

    const folderId = testFolder.folderId || testFolder.id
    const folderName = testFolder.name || testFolder.displayName
    console.log(`   📂 Testing folder: "${folderName}" (${testFolder.messageCount || 0} messages)`)

    const messagesResponse = await axios.get(
      `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=5`,
      { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
    )

    const result = messagesResponse.data
    const messages = result.messages || []

    if (messages.length > 0) {
      console.log(`\n🎉 SUCCESS! Found ${messages.length} emails after sync:`)
      console.log('='.repeat(80))

      messages.forEach((msg, idx) => {
        console.log(`\n📧 EMAIL ${idx + 1}:`)
        console.log(`   Subject: ${msg.subject || 'No Subject'}`)
        console.log(`   From: ${msg.from?.email || msg.sender?.email || 'Unknown'}`)
        console.log(`   From Name: ${msg.from?.name || msg.sender?.name || 'N/A'}`)
        console.log(`   Date: ${msg.date || msg.receivedDateTime || 'Unknown'}`)
        console.log(`   Body Preview: ${msg.bodyPreview || msg.body?.slice(0, 100) || 'N/A'}...`)
        console.log('   ' + '-'.repeat(60))
      })
    } else {
      console.log(`📭 Still no messages returned after sync`)
      console.log(`   This might mean sync is still in progress`)
      console.log(`   Try running this script again in a few minutes`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSyncAndDisplay()