const mongoose = require('mongoose');
const { Consultant } = require('./backend/src/models/consultant.model');

// MongoDB connection string - update if needed
const MONGODB_URI = 'mongodb://localhost:27017/consultation_app';

async function debugPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const consultantId = '69131c53054d86fa8adeb8a4';
    
    const consultant = await Consultant.findById(consultantId);
    
    if (!consultant) {
      console.log('Consultant not found');
      return;
    }
    
    console.log('Consultant found:');
    console.log('- ID:', consultant._id);
    console.log('- Name:', consultant.name || consultant.firstName + ' ' + consultant.lastName);
    console.log('- Has auth:', !!consultant.auth);
    console.log('- Has password:', !!(consultant.auth && consultant.auth.password));
    console.log('- Password length:', consultant.auth?.password?.length || 0);
    console.log('- Password format:', consultant.auth?.password?.substring(0, 30) + '...' || 'none');
    console.log('- Is hashed:', consultant.auth?.password?.startsWith('$2b$') || false);
    console.log('- Auth structure:', JSON.stringify(consultant.auth, null, 2));
    
    // Test with a common password
    const testPasswords = ['password', '123456', 'admin', 'consultant', 'test'];
    const bcrypt = require('bcrypt');
    
    for (const testPwd of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPwd, consultant.auth.password);
        console.log(`- Test password "${testPwd}": ${isValid}`);
      } catch (error) {
        console.log(`- Test password "${testPwd}": Error - ${error.message}`);
      }
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugPassword();
