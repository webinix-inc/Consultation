/**
 * Test Agora Authentication and Configuration
 * Run this script to verify your Agora credentials are set up correctly
 * 
 * Usage: node test-agora-auth.js
 */

require('dotenv').config();
const axios = require('axios');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

// Load credentials
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;

console.log('\n🔍 Testing Agora Configuration...\n');

// Test 1: Check if environment variables are set
console.log('1️⃣ Checking Environment Variables:');
console.log('   AGORA_APP_ID:', AGORA_APP_ID ? '✅ Set' : '❌ Missing');
console.log('   AGORA_APP_CERTIFICATE:', AGORA_APP_CERTIFICATE ? '✅ Set' : '❌ Missing');
console.log('   AGORA_CUSTOMER_ID:', AGORA_CUSTOMER_ID ? '✅ Set' : '❌ Missing');
console.log('   AGORA_CUSTOMER_SECRET:', AGORA_CUSTOMER_SECRET ? '✅ Set' : '❌ Missing');
console.log('');

// Test 2: Generate Basic Auth Header (like in the service)
function generateBasicAuthHeader() {
  if (!AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET) {
    throw new Error('Customer ID and Secret are required');
  }
  const credentials = Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

// Test 3: Test Token Generation
console.log('2️⃣ Testing RTC Token Generation:');
try {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    console.log('   ⚠️  Skipping - App ID or Certificate missing');
  } else {
    const channelName = 'test-channel';
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expireTime = 3600;

    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTime + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    console.log('   ✅ Token generated successfully');
    console.log('   Token preview:', token.substring(0, 50) + '...');
  }
} catch (error) {
  console.log('   ❌ Token generation failed:', error.message);
}
console.log('');

// Test 4: Test RESTful API Authentication
console.log('3️⃣ Testing RESTful API Authentication:');
async function testRestApiAuth() {
  try {
    if (!AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET) {
      console.log('   ⚠️  Skipping - Customer ID or Secret missing');
      return;
    }

    // Test with a simple API call to get project list
    const authHeader = generateBasicAuthHeader();

    console.log('   Testing authentication with Agora REST API...');
    console.log('   Auth Header format:', authHeader.substring(0, 30) + '...');

    const response = await axios.get('https://api.agora.io/dev/v2/projects', {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('   ✅ Authentication successful!');
    console.log('   Response status:', response.status);
    if (response.data && response.data.projects) {
      console.log('   Projects found:', response.data.projects.length);
    }
  } catch (error) {
    console.log('   ❌ Authentication failed!');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
      if (error.response.status === 401) {
        console.log('   💡 This usually means:');
        console.log('      - Customer ID or Secret is incorrect');
        console.log('      - Credentials are not properly Base64 encoded');
        console.log('      - Make sure there are no extra spaces in .env file');
      }
    } else {
      console.log('   Error:', error.message);
    }
  }
}

// Run tests
(async () => {
  await testRestApiAuth();

  console.log('\n📋 Summary:');
  console.log('   If all tests pass, your Agora credentials are configured correctly!');
  console.log('   If any test fails, check:');
  console.log('   1. Your .env file in the backend directory');
  console.log('   2. That values don\'t have quotes or extra spaces');
  console.log('   3. That you\'ve restarted your server after adding env variables');
  console.log('\n');
})();

