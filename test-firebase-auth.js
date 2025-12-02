// Test Firebase Authentication with BoxZero API
const axios = require('axios');

async function testFirebaseAuth() {
  console.log('🔥 Testing Firebase Authentication Flow');
  console.log('=' .repeat(50));

  // Test 1: Try to make API call with Firebase token format
  console.log('\n1. Testing BoxZero API with Firebase token format...');

  // This is a sample Firebase ID token format (for testing)
  const sampleFirebaseToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyN...'; // This would be a real Firebase token

  try {
    const response = await axios.get('https://boxzero-api-dev.azurewebsites.net/api/auth/linked-accounts', {
      headers: {
        'Authorization': `Bearer ${sampleFirebaseToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API call successful with Firebase token!');
    console.log('Response:', response.data);
  } catch (error) {
    const status = error.response?.status;
    if (status === 401) {
      console.log('🔒 API requires valid Firebase authentication (401)');
      console.log('Response:', error.response?.data);
    } else if (status === 403) {
      console.log('🔒 API access forbidden (403)');
    } else {
      console.log(`❌ API error: ${status} - ${error.message}`);
    }
  }

  // Test 2: Check if BoxZero API supports Firebase auth
  console.log('\n2. Testing Firebase authentication endpoint patterns...');

  const authEndpoints = [
    '/api/auth/firebase',
    '/api/firebase/verify',
    '/firebase/auth',
    '/auth/firebase',
    '/api/auth/verify'
  ];

  for (const endpoint of authEndpoints) {
    try {
      console.log(`   Testing: ${endpoint}`);
      const response = await axios.post(`https://boxzero-api-dev.azurewebsites.net${endpoint}`, {
        firebaseToken: sampleFirebaseToken
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`   ✅ ${endpoint} - Available!`);
      console.log(`   Response:`, response.data);
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        console.log(`   ⚠️ ${endpoint} - Not found (404)`);
      } else if (status === 401) {
        console.log(`   🔒 ${endpoint} - Requires authentication (401)`);
      } else {
        console.log(`   ❌ ${endpoint} - Error ${status}`);
      }
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🔥 Firebase Authentication Test Complete');
  console.log('\nNext steps:');
  console.log('1. Open the app at http://localhost:3015');
  console.log('2. Try logging in with andrew@boxzero.io / Churchwhit2023$');
  console.log('3. Check browser console for Firebase authentication logs');
}

testFirebaseAuth();