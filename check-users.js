const mongoose = require('mongoose');
const User = require('./server/models/User');

const MONGO_URI = 'mongodb://localhost:27017/codesphere-v2-dev';

async function checkUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    const count = await User.countDocuments();
    console.log(`CURRENT_USER_COUNT: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

checkUsers();
