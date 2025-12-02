// Display the 3 accounts and 25 folders found in our test
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

async function displayRealData() {
  console.log('🎯 DISPLAYING REAL BOXZERO DATA FOR VALIDATION')
  console.log('=' .repeat(60))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)
    console.log('🔑 Token:', firebaseToken.substring(0, 50) + '...')

    // Get linked accounts
    console.log('\n📊 REAL LINKED ACCOUNTS FROM BOXZERO API:')
    console.log('-' .repeat(60))

    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const accounts = accountsResponse.data
    console.log(`Found ${accounts.length} accounts:`)

    accounts.forEach((account, i) => {
      console.log(`\n${i + 1}. ACCOUNT:`)
      console.log(`   📧 Email: ${account.externalEmail}`)
      console.log(`   🏢 Provider: ${account.provider}`)
      console.log(`   🔗 Account ID: ${account.accountId}`)
      console.log(`   ✅ Status: ${account.status}`)
      console.log(`   🕒 Last Synced: ${account.lastSyncedAt || 'Never'}`)
      console.log(`   📅 Created: ${account.createdAt}`)
    })

    // Get folders for each account
    console.log('\n📁 REAL FOLDERS FOR EACH ACCOUNT:')
    console.log('-' .repeat(60))

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      console.log(`\n📂 FOLDERS FOR: ${account.externalEmail}`)

      try {
        const foldersResponse = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${account.accountId}/folders`,
          { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
        )

        const folders = foldersResponse.data
        console.log(`   Found ${folders.length} folders:`)

        folders.slice(0, 10).forEach((folder, j) => {
          console.log(`   ${j + 1}. "${folder.name}" (${folder.folderId})`)
          console.log(`      Type: ${folder.type || 'custom'}`)
          console.log(`      Items: ${folder.totalItemCount || 0}`)
        })

        if (folders.length > 10) {
          console.log(`   ... and ${folders.length - 10} more folders`)
        }

      } catch (folderError) {
        console.log(`   ❌ Failed to get folders: ${folderError.response?.status} - ${folderError.message}`)
      }
    }

    // Test message endpoint with first account and first folder
    console.log('\n📨 TESTING MESSAGES ENDPOINT:')
    console.log('-' .repeat(60))

    if (accounts.length > 0) {
      const firstAccount = accounts[0]
      console.log(`Using account: ${firstAccount.externalEmail}`)

      try {
        const foldersResponse = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${firstAccount.accountId}/folders`,
          { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
        )

        if (foldersResponse.data.length > 0) {
          const firstFolder = foldersResponse.data[0]
          console.log(`Using folder: ${firstFolder.name} (${firstFolder.folderId})`)

          try {
            const messagesResponse = await axios.get(
              `${API_BASE_URL}/api/messages/accounts/${firstAccount.accountId}/folders/${firstFolder.folderId}/messages?limit=5`,
              { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
            )

            console.log('✅ Messages API Response:')
            console.log('   Status:', messagesResponse.status)
            console.log('   Data structure:', JSON.stringify(messagesResponse.data, null, 2))

          } catch (msgError) {
            console.log(`❌ Messages API failed: ${msgError.response?.status} - ${msgError.message}`)
            if (msgError.response?.data) {
              console.log('   Error details:', JSON.stringify(msgError.response.data, null, 2))
            }
          }
        }
      } catch (error) {
        console.log('❌ Error testing messages:', error.message)
      }
    }

    console.log('\n🎯 SUMMARY FOR FRONTEND VALIDATION:')
    console.log('-' .repeat(60))
    console.log(`✅ Total Accounts Found: ${accounts.length}`)
    accounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. ${acc.externalEmail} (${acc.provider}) - ${acc.status}`)
    })

    console.log('\n📋 This data should appear in your frontend after authentication!')
    console.log('   If you see only 1 account in the UI, there may be a frontend filtering issue.')

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', error.response.data)
    }
  }
}

displayRealData()