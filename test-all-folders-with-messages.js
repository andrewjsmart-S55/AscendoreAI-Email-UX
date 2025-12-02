// Find folders with actual messages and display the email titles
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

async function findFoldersWithMessages() {
  console.log('📧 FINDING FOLDERS WITH ACTUAL MESSAGES')
  console.log('=' .repeat(80))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Get all linked accounts
    console.log('\n🔍 Fetching linked accounts...')
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const accounts = accountsResponse.data
    console.log(`📋 Found ${accounts.length} accounts`)

    // For each account, check ALL folders for messages
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      const accountId = account.accountId
      const email = account.externalEmail || account.external_email

      console.log(`\n${'='.repeat(60)}`)
      console.log(`📧 ACCOUNT ${i + 1}: ${email}`)
      console.log(`   Account ID: ${accountId}`)
      console.log(`${'='.repeat(60)}`)

      try {
        // Get all folders for this account
        const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        })

        const folders = foldersResponse.data
        console.log(`📁 Found ${folders.length} folders`)

        let foldersWithMessages = []

        // Check each folder for messages using the correct folderId
        for (const folder of folders) {
          const folderId = folder.folderId  // Use internal ID, not external
          const folderName = folder.name || folder.displayName
          const messageCount = folder.messageCount || 0

          console.log(`\n📁 Checking "${folderName}" (${messageCount} messages)...`)

          if (messageCount > 0) {
            try {
              const messagesResponse = await axios.get(
                `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=3`,
                { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
              )

              const result = messagesResponse.data
              if (result.messages && result.messages.length > 0) {
                foldersWithMessages.push({
                  folder: folderName,
                  count: result.messages.length,
                  total: result.total,
                  messages: result.messages
                })

                console.log(`   ✅ SUCCESS: ${result.messages.length} messages retrieved (total: ${result.total})`)
                result.messages.forEach((msg, idx) => {
                  console.log(`      ${idx + 1}. "${msg.subject || 'No Subject'}"`)
                })
              } else {
                console.log(`   📭 Empty response`)
              }
            } catch (error) {
              console.log(`   ❌ Error: ${error.response?.status} - ${error.message}`)
            }
          } else {
            console.log(`   📭 Empty folder`)
          }
        }

        // Summary for this account
        console.log(`\n📊 SUMMARY for ${email}:`)
        if (foldersWithMessages.length > 0) {
          console.log(`   ✅ Found ${foldersWithMessages.length} folders with messages:`)
          foldersWithMessages.forEach(f => {
            console.log(`   📁 ${f.folder}: ${f.count} messages (${f.total} total)`)
          })
        } else {
          console.log(`   📭 No folders with accessible messages found`)
        }

      } catch (error) {
        console.log(`❌ Error processing account ${email}:`, error.response?.status, error.message)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

findFoldersWithMessages()