// Test BoxZero API endpoints without authentication to see what's publicly accessible
const axios = require('axios');

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net';

async function testNoAuthEndpoints() {
  console.log('🌐 Testing BoxZero API Endpoints Without Authentication');
  console.log('=' .repeat(60));

  // Test public/info endpoints that might not require auth
  const publicEndpoints = [
    // API info
    '/api',
    '/api/info',
    '/api/version',
    '/api/health',
    '/api/status',
    '/api/ping',

    // Documentation
    '/docs',
    '/api/docs',
    '/swagger',
    '/swagger.json',
    '/swagger/index.html',
    '/api-docs',
    '/openapi.json',

    // Authentication info
    '/api/auth',
    '/api/auth/info',
    '/api/auth/config',
    '/api/auth/providers',

    // OAuth redirects (might show auth URLs)
    '/api/oauth',
    '/api/oauth/providers',
    '/api/oauth/config',

    // Root endpoints
    '/',
    '/health',
    '/version',
    '/status',
  ];

  console.log('Testing public endpoints...');

  for (const endpoint of publicEndpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        timeout: 10000,
        // Don't include auth headers
      });

      console.log(`✅ ${endpoint} (${response.status})`);

      if (response.data) {
        if (typeof response.data === 'string') {
          const preview = response.data.length > 100 ? response.data.substring(0, 100) + '...' : response.data;
          console.log(`   → String: ${preview}`);
        } else if (typeof response.data === 'object') {
          const keys = Object.keys(response.data);
          console.log(`   → Object with keys: ${keys.slice(0, 8).join(', ')}`);
          if (keys.length > 8) console.log(`   → ... and ${keys.length - 8} more`);
        }
      }

    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        console.log(`⚠️ ${endpoint} (404 - Not Found)`);
      } else if (status === 401) {
        console.log(`🔒 ${endpoint} (401 - Auth Required)`);
      } else if (status === 403) {
        console.log(`🚫 ${endpoint} (403 - Forbidden)`);
      } else if (status === 405) {
        console.log(`🔄 ${endpoint} (405 - Method Not Allowed)`);
      } else if (status >= 500) {
        console.log(`❌ ${endpoint} (${status} - Server Error)`);
      } else if (status) {
        console.log(`❓ ${endpoint} (${status})`);
      }
    }
  }

  // Test if API uses different auth methods
  console.log('\n🔑 Testing alternative authentication methods...');

  const authTestEndpoints = [
    '/api/auth/linked-accounts',
    '/api/accounts',
    '/api/user',
  ];

  // Test with API key in headers
  const testHeaders = [
    { 'X-API-Key': 'test' },
    { 'API-Key': 'test' },
    { 'Authorization': 'API-Key test' },
    { 'Authorization': 'ApiKey test' },
    { 'Authorization': 'Token test' },
    { 'X-Auth-Token': 'test' },
    { 'X-Access-Token': 'test' },
  ];

  for (const endpoint of authTestEndpoints) {
    console.log(`\n   Testing ${endpoint} with different auth methods:`);

    for (const [index, headers] of testHeaders.entries()) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers,
          timeout: 5000
        });

        const headerName = Object.keys(headers)[0];
        console.log(`     ✅ ${headerName}: SUCCESS (${response.status})`);

      } catch (error) {
        const status = error.response?.status;
        const headerName = Object.keys(headers)[0];
        if (status === 401) {
          console.log(`     🔒 ${headerName}: Still requires auth (401)`);
        } else if (status === 403) {
          console.log(`     🚫 ${headerName}: Forbidden (403)`);
        } else if (status !== 404) {
          console.log(`     ❓ ${headerName}: ${status}`);
        }
      }
    }
  }

  // Test if the API has different base paths
  console.log('\n🔍 Testing alternative API base paths...');

  const alternativeBasePaths = [
    '/v1/api',
    '/v2/api',
    '/api/v1',
    '/api/v2',
    '/rest',
    '/rest/api',
  ];

  for (const basePath of alternativeBasePaths) {
    try {
      const response = await axios.get(`${API_BASE_URL}${basePath}/auth/linked-accounts`, {
        timeout: 5000
      });

      console.log(`✅ ${basePath}: Found alternative base path (${response.status})`);

    } catch (error) {
      const status = error.response?.status;
      if (status === 401) {
        console.log(`🔒 ${basePath}: Requires auth but path exists (401)`);
      } else if (status !== 404) {
        console.log(`❓ ${basePath}: ${status}`);
      }
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🌐 NO-AUTH ENDPOINTS TEST COMPLETE!');
  console.log('=' .repeat(60));
}

testNoAuthEndpoints();