// Test all folders across all accounts to find where emails actually are
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

async function findFoldersWithEmails() {
  console.log('🔍 SEARCHING ALL FOLDERS FOR EMAILS')
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

    let totalFoldersWithEmails = 0
    let totalEmailsFound = 0

    // Check each account
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      const accountId = account.accountId
      const email = account.externalEmail || account.external_email

      console.log(`\n${'='.repeat(50)}`)
      console.log(`📧 ACCOUNT ${i + 1}: ${email}`)
      console.log(`   Account ID: ${accountId}`)
      console.log(`${'='.repeat(50)}`)

      try {
        // Get folders for this account
        const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        })

        const folders = foldersResponse.data
        console.log(`📁 Found ${folders.length} folders`)

        let accountEmailCount = 0
        const foldersWithEmails = []

        // Check each folder for emails
        for (const folder of folders) {
          const folderId = folder.folderId || folder.id
          const folderName = folder.name || folder.displayName
          const messageCount = folder.messageCount || 0

          if (messageCount > 0) {
            console.log(`\n📁 "${folderName}" has ${messageCount} messages`)

            try {
              // Test actual message fetching
              const messagesResponse = await axios.get(
                `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=2`,
                { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
              )

              const result = messagesResponse.data
              const actualMessages = result.messages?.length || 0
              const totalAvailable = result.total || 0

              if (actualMessages > 0) {
                console.log(`   ✅ CONFIRMED: ${actualMessages} messages fetched (${totalAvailable} total)`)
                foldersWithEmails.push({
                  name: folderName,
                  messageCount: messageCount,
                  actualMessages: actualMessages,
                  totalAvailable: totalAvailable
                })
                accountEmailCount += totalAvailable
                totalEmailsFound += totalAvailable

                // Show sample messages
                result.messages.forEach((msg, idx) => {
                  console.log(`      ${idx + 1}. "${msg.subject || 'No Subject'}"`)
                  console.log(`         From: ${msg.from?.email || msg.sender?.email || 'Unknown'}`)
                })
              } else {
                console.log(`   ⚠️  Folder claims ${messageCount} messages but API returned 0`)
              }

            } catch (error) {
              console.log(`   ❌ Error fetching messages: ${error.response?.status}`)
            }
          }
        }

        // Summary for this account
        console.log(`\n📊 ACCOUNT SUMMARY for ${email}:`)
        if (foldersWithEmails.length > 0) {
          console.log(`   ✅ Found ${foldersWithEmails.length} folders with emails`)
          console.log(`   📧 Total emails in account: ${accountEmailCount}`)
          foldersWithEmails.forEach(f => {
            console.log(`   📁 ${f.name}: ${f.totalAvailable} emails`)
          })
          totalFoldersWithEmails += foldersWithEmails.length
        } else {
          console.log(`   📭 No folders with accessible emails found`)
        }

      } catch (error) {
        console.log(`❌ Error processing account ${email}:`, error.response?.status, error.message)
      }
    }

    console.log(`\n🎯 OVERALL SUMMARY:`)
    console.log(`   📧 Total accounts checked: ${accounts.length}`)
    console.log(`   📁 Total folders with emails: ${totalFoldersWithEmails}`)
    console.log(`   📬 Total emails found: ${totalEmailsFound}`)

    if (totalEmailsFound === 0) {
      console.log(`\n💡 POSSIBLE ISSUES:`)
      console.log(`   1. Emails may not be synced to BoxZero database yet`)
      console.log(`   2. Email sync process may still be running`)
      console.log(`   3. There may be permissions or configuration issues`)
      console.log(`   4. The other BoxZero frontend may be using a different data source`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

findFoldersWithEmails()