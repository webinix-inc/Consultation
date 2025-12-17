// Test script to verify password update functionality
const axios = require('axios');

// Configuration
// const BASE_URL = 'http://52.66.228.187:5002/api/v1';
const BASE_URL = 'http://localhost:5002/api/v1';
const CONSULTANT_ID = '69131c53054d86fa8adeb8a4';

// Test data
const testCases = [
  {
    name: 'Test with common password "password"',
    currentPassword: 'password',
    newPassword: 'newpass123',
    confirmPassword: 'newpass123'
  },
  {
    name: 'Test with common password "admin"',
    currentPassword: 'admin',
    newPassword: 'newpass123',
    confirmPassword: 'newpass123'
  },
  {
    name: 'Test with common password "123456"',
    currentPassword: '123456',
    newPassword: 'newpass123',
    confirmPassword: 'newpass123'
  },
  {
    name: 'Test with empty password',
    currentPassword: '',
    newPassword: 'newpass123',
    confirmPassword: 'newpass123'
  }
];

async function testPasswordUpdate() {
  console.log('=== Password Update Test ===\n');
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      const response = await axios.put(`${BASE_URL}/consultant-settings/${CONSULTANT_ID}/password`, testCase);
      
      console.log('✅ Success:', response.data.message);
      console.log('Password updated successfully!\n');
      
      // If successful, we can stop testing
      break;
      
    } catch (error) {
      if (error.response) {
        console.log('❌ Error:', error.response.data.message);
        console.log('Status:', error.response.status);
      } else {
        console.log('❌ Network Error:', error.message);
      }
      console.log('');
    }
  }
  
  // Test emergency reset if all normal tests fail
  console.log('=== Testing Emergency Reset ===');
  
  try {
    const emergencyResponse = await axios.post(`${BASE_URL}/consultant-settings/${CONSULTANT_ID}/emergency-reset`, {
      newPassword: 'emergency123'
    });
    
    console.log('✅ Emergency Reset Success:', emergencyResponse.data.message);
    console.log('Password has been reset to: emergency123');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Emergency Reset Error:', error.response.data.message);
    } else {
      console.log('❌ Emergency Reset Network Error:', error.message);
    }
  }
}

// Check debug endpoint first
async function checkPasswordStatus() {
  console.log('=== Checking Password Status ===\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/consultant-settings/${CONSULTANT_ID}/debug-password`);
    console.log('Password Status:', JSON.stringify(response.data.data, null, 2));
    console.log('');
  } catch (error) {
    if (error.response) {
      console.log('Debug endpoint error:', error.response.data.message);
    } else {
      console.log('Debug endpoint not available:', error.message);
    }
    console.log('');
  }
}

// Run tests
async function runTests() {
  await checkPasswordStatus();
  await testPasswordUpdate();
}

runTests().catch(console.error);
