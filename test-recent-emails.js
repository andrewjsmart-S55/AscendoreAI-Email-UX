// Test script to display recent emails from all 3 accounts
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

async function displayRecentEmails() {
  console.log('📧 DISPLAYING 5 MOST RECENT EMAILS FROM EACH ACCOUNT')
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
    console.log(`📋 Found ${accounts.length} accounts:`)
    accounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. ${acc.externalEmail || acc.external_email} (${acc.accountId})`)
    })

    // For each account, get folders and then recent emails
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      const accountId = account.accountId
      const email = account.externalEmail || account.external_email

      console.log(`\n${'='.repeat(60)}`)
      console.log(`📧 ACCOUNT ${i + 1}: ${email}`)
      console.log(`   Account ID: ${accountId}`)
      console.log(`${'='.repeat(60)}`)

      try {
        // Get folders for this account
        const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        })

        const folders = foldersResponse.data
        console.log(`📁 Found ${folders.length} folders`)

        // Find inbox folder
        const inboxFolder = folders.find(f =>
          f.name?.toLowerCase().includes('inbox') ||
          f.displayName?.toLowerCase().includes('inbox') ||
          f.external_id?.includes('INBOX') ||
          f.externalId?.includes('INBOX')
        )

        if (!inboxFolder) {
          console.log('❌ No inbox folder found. Available folders:')
          folders.slice(0, 5).forEach(f => {
            console.log(`   - ${f.name || f.displayName} (${f.id || f.external_id || f.externalId})`)
          })
          continue
        }

        const folderId = inboxFolder.id || inboxFolder.external_id || inboxFolder.externalId
        console.log(`📥 Using inbox: "${inboxFolder.name || inboxFolder.displayName}" (${folderId})`)

        // Get recent emails from inbox
        const messagesResponse = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=5`,
          {
            headers: { 'Authorization': `Bearer ${firebaseToken}` }
          }
        )

        const result = messagesResponse.data
        console.log(`📊 API Response - Total: ${result.total}, Messages: ${result.messages?.length || 0}`)

        if (result.messages && result.messages.length > 0) {
          console.log(`\n📧 RECENT EMAILS (${result.messages.length}):`)
          result.messages.forEach((msg, idx) => {
            const subject = msg.subject || 'No Subject'
            const from = msg.from?.email || msg.sender?.email || msg.sender || 'Unknown'
            const date = msg.receivedAt || msg.date || 'Unknown Date'
            console.log(`   ${idx + 1}. "${subject}"`)
            console.log(`      From: ${from}`)
            console.log(`      Date: ${date}`)
            console.log()
          })
        } else {
          console.log('📭 No messages found in inbox')

          // Try a few more folders to see if emails are elsewhere
          console.log('\n🔍 Checking other folders for emails...')
          const testFolders = folders.slice(0, 3).filter(f => f.id !== folderId)

          for (const folder of testFolders) {
            try {
              const testFolderId = folder.id || folder.external_id || folder.externalId
              const testResponse = await axios.get(
                `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${testFolderId}/messages?limit=2`,
                {
                  headers: { 'Authorization': `Bearer ${firebaseToken}` }
                }
              )
              const testCount = testResponse.data.messages?.length || 0
              if (testCount > 0) {
                console.log(`   📁 ${folder.name || folder.displayName}: ${testCount} messages found`)
              }
            } catch (err) {
              console.log(`   📁 ${folder.name || folder.displayName}: Error ${err.response?.status}`)
            }
          }
        }

      } catch (error) {
        console.log(`❌ Error fetching emails for ${email}:`, error.response?.status, error.message)
        if (error.response?.data) {
          console.log('   Response:', error.response.data)
        }
      }
    }

  } catch (error) {
    console.error('❌ Authentication or setup error:', error.message)
  }
}

displayRecentEmails()