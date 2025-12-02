// Test message loading for the first account's inbox to see if emails are returned
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

async function testMessageLoading() {
  console.log('📧 TESTING MESSAGE LOADING FOR INBOX')
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
    console.log(`📋 Found ${accounts.length} accounts`)

    // Test with andrewj.smart@outlook.com (the one with 110k emails)
    const targetAccount = accounts.find(acc =>
      (acc.externalEmail || acc.external_email || '').includes('andrewj.smart')
    )

    if (!targetAccount) {
      console.log('❌ Target account andrewj.smart@outlook.com not found')
      return
    }

    const accountId = targetAccount.accountId
    const email = targetAccount.externalEmail || targetAccount.external_email

    console.log(`\n🎯 Testing account: ${email}`)
    console.log(`   Account ID: ${accountId}`)

    // Get folders for this account
    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    console.log(`📁 Found ${folders.length} folders`)

    // Find inbox folder
    const inboxFolder = folders.find(f =>
      (f.name || f.displayName || '').toLowerCase().includes('inbox')
    )

    if (!inboxFolder) {
      console.log('❌ Inbox folder not found')
      return
    }

    const folderId = inboxFolder.folderId || inboxFolder.id
    console.log(`\n📥 Found Inbox: "${inboxFolder.name || inboxFolder.displayName}"`)
    console.log(`   Folder ID: ${folderId}`)
    console.log(`   Message Count: ${inboxFolder.messageCount || 0}`)

    // Test message fetching
    console.log(`\n📬 Fetching messages from inbox...`)
    try {
      const messagesResponse = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=5`,
        { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
      )

      const result = messagesResponse.data
      console.log(`✅ SUCCESS: API returned data`)
      console.log(`   Messages found: ${result.messages?.length || 0}`)
      console.log(`   Total available: ${result.total || 0}`)

      if (result.messages && result.messages.length > 0) {
        console.log(`\n📧 SAMPLE MESSAGES:`)
        result.messages.slice(0, 3).forEach((msg, idx) => {
          console.log(`   ${idx + 1}. "${msg.subject || 'No Subject'}"`)
          console.log(`      From: ${msg.from?.email || msg.sender?.email || 'Unknown'}`)
          console.log(`      Date: ${msg.receivedAt || msg.date || 'Unknown'}`)
          console.log(`      Body preview: ${(msg.body || msg.content || '').substring(0, 100)}...`)
        })
      } else {
        console.log(`📭 No messages returned in response`)
      }

      console.log(`\n🔍 RAW API RESPONSE STRUCTURE:`)
      console.log(JSON.stringify(result, null, 2))

    } catch (error) {
      console.log(`❌ Message fetch FAILED: ${error.response?.status} - ${error.message}`)
      if (error.response?.data) {
        console.log(`   Error details:`, error.response.data)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testMessageLoading()