// Script to verify password update is working correctly
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Consultant } = require('./backend/src/models/consultant.model');

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/consultation_app';

async function verifyPasswordUpdate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const consultantId = '69131c53054d86fa8adeb8a4';
    
    // Get current state
    const consultant = await Consultant.findById(consultantId);
    
    if (!consultant) {
      console.log('❌ Consultant not found');
      return;
    }
    
    console.log('=== Current Password State ===');
    console.log('Consultant ID:', consultant._id);
    console.log('Has auth:', !!consultant.auth);
    console.log('Has password:', !!(consultant.auth && consultant.auth.password));
    console.log('Password length:', consultant.auth?.password?.length || 0);
    console.log('Password format:', consultant.auth?.password?.substring(0, 30) + '...' || 'none');
    console.log('Is hashed:', consultant.auth?.password?.startsWith('$2b$') || false);
    console.log('Last updated:', consultant.auth?.lastPasswordUpdatedAt || 'Never');
    
    // Test with a known password
    const testPassword = 'newpass123';
    console.log('\n=== Testing Password Verification ===');
    
    if (!consultant.auth?.password) {
      console.log('❌ No password to test');
      return;
    }
    
    try {
      const isValid = await bcrypt.compare(testPassword, consultant.auth.password);
      console.log(`Test password "${testPassword}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    } catch (error) {
      console.log(`❌ Error testing password: ${error.message}`);
    }
    
    // Test with old common passwords
    const oldPasswords = ['password', 'admin', '123456', 'consultant', 'test'];
    console.log('\n=== Testing Old Common Passwords ===');
    
    for (const oldPwd of oldPasswords) {
      try {
        const isValid = await bcrypt.compare(oldPwd, consultant.auth.password);
        if (isValid) {
          console.log(`⚠️  Old password "${oldPwd}" still works - password not updated!`);
        }
      } catch (error) {
        // Ignore errors for invalid formats
      }
    }
    
    console.log('\n=== Manual Password Update Test ===');
    
    // Manually update password to verify it works
    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash('test123', salt);
    
    consultant.auth.password = newPasswordHash;
    consultant.auth.lastPasswordUpdatedAt = new Date();
    consultant.markModified('auth');
    
    await consultant.save();
    
    console.log('✅ Manual password update completed');
    console.log('New hash length:', newPasswordHash.length);
    
    // Verify the new password works
    const isNewPasswordValid = await bcrypt.compare('test123', consultant.auth.password);
    console.log(`New password "test123": ${isNewPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Verification completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyPasswordUpdate();
