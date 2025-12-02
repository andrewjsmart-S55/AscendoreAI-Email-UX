// Test authentication state in the application
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

async function testAuthenticationState() {
  console.log('🔐 Testing Authentication State')
  console.log('=' .repeat(50))

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    console.log('1. Authenticating with Firebase...')
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Firebase authentication successful')
    console.log(`   User: ${firebaseUser.email}`)
    console.log(`   Token: ${firebaseToken.substring(0, 30)}...`)

    // Test linked accounts endpoint
    console.log('\n2. Testing linked accounts endpoint...')
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
        headers: { 'Authorization': `Bearer ${firebaseToken}` }
      })

      console.log('✅ Linked accounts API successful')
      console.log(`   Response: ${response.status}`)
      console.log(`   Accounts found: ${response.data.length}`)

      response.data.forEach((account, i) => {
        console.log(`   ${i + 1}. ${account.externalEmail} (${account.provider}) - ${account.status}`)
      })

      // Test with first account
      if (response.data.length > 0) {
        const firstAccount = response.data[0]
        console.log(`\n3. Testing folders for account: ${firstAccount.externalEmail}`)

        try {
          const foldersResponse = await axios.get(
            `${API_BASE_URL}/api/messages/accounts/${firstAccount.accountId}/folders`,
            { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
          )

          console.log('✅ Folders API successful')
          console.log(`   Folders found: ${foldersResponse.data.length}`)

          if (foldersResponse.data.length > 0) {
            console.log(`   First folder: ${foldersResponse.data[0].name} (${foldersResponse.data[0].folderId})`)
          }

        } catch (folderError) {
          console.log(`❌ Folders API failed: ${folderError.response?.status} - ${folderError.message}`)
        }
      }

    } catch (accountError) {
      console.log(`❌ Linked accounts API failed: ${accountError.response?.status} - ${accountError.message}`)
      if (accountError.response?.data) {
        console.log(`   Error details: ${JSON.stringify(accountError.response.data)}`)
      }
    }

    console.log('\n4. Summary:')
    console.log('   ✅ Firebase authentication is working')
    console.log('   ✅ Firebase ID token is valid')
    console.log('   📊 Check above for API endpoint results')

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message)
  }
}

testAuthenticationState()