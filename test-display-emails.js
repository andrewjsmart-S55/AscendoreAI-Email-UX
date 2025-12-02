// Test script to fetch and display 5 emails from BoxZero API
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

async function testDisplayEmails() {
  console.log('📧 TESTING EMAIL DISPLAY - FETCH 5 EMAILS')
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
    console.log(`\n📱 Found ${accounts.length} accounts:`)
    accounts.forEach((acc, idx) => {
      console.log(`   ${idx + 1}. ${acc.externalEmail || acc.external_email} (${acc.accountId})`)
    })

    // Test each account for emails
    for (const account of accounts) {
      const accountId = account.accountId
      const email = account.externalEmail || account.external_email

      console.log(`\n🔍 Testing account: ${email}`)
      console.log(`   Account ID: ${accountId}`)

      try {
        // Get folders for this account
        const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        })

        const folders = foldersResponse.data
        console.log(`   📁 Found ${folders.length} folders`)

        // Find folders with messages
        const foldersWithMessages = folders.filter(f => (f.messageCount || 0) > 0)
        console.log(`   📧 ${foldersWithMessages.length} folders have messages`)

        if (foldersWithMessages.length === 0) {
          console.log(`   ❌ No folders with messages found for ${email}`)
          continue
        }

        // Try to get messages from the first folder with messages
        const folder = foldersWithMessages[0]
        const folderId = folder.folderId || folder.id
        const folderName = folder.name || folder.displayName
        console.log(`   📂 Testing folder: "${folderName}" (${folder.messageCount || 0} messages)`)

        const messagesResponse = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=5`,
          { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
        )

        const result = messagesResponse.data
        const messages = result.messages || []

        if (messages.length > 0) {
          console.log(`\n🎉 SUCCESS! Found ${messages.length} emails in ${email}:`)
          console.log('='.repeat(80))

          messages.forEach((msg, idx) => {
            console.log(`\n📧 EMAIL ${idx + 1}:`)
            console.log(`   Subject: ${msg.subject || 'No Subject'}`)
            console.log(`   From: ${msg.from?.email || msg.sender?.email || 'Unknown'}`)
            console.log(`   From Name: ${msg.from?.name || msg.sender?.name || 'N/A'}`)
            console.log(`   Date: ${msg.date || msg.receivedDateTime || 'Unknown'}`)
            console.log(`   ID: ${msg.id || msg.messageId}`)
            console.log(`   Has Body: ${msg.body ? 'Yes' : 'No'}`)
            console.log(`   Body Preview: ${msg.bodyPreview || msg.body?.slice(0, 100) || 'N/A'}...`)
            console.log(`   Is Read: ${msg.isRead || msg.read || false}`)
            console.log('   ' + '-'.repeat(60))
          })

          // Show JSON structure of first email for debugging
          console.log(`\n🔍 FIRST EMAIL JSON STRUCTURE:`)
          console.log(JSON.stringify(messages[0], null, 2))

          return // Success - we found emails, exit
        } else {
          console.log(`   📭 No messages returned from folder "${folderName}"`)
        }

      } catch (folderError) {
        console.log(`   ❌ Error fetching from ${email}: ${folderError.response?.status} - ${folderError.message}`)
      }
    }

    console.log(`\n❌ No emails found in any account after checking all folders`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDisplayEmails()