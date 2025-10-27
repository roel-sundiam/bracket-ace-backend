require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('Testing MongoDB connection...');
console.log('URI:', MONGODB_URI ? 'Found' : 'Not found');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('✅ Connection successful!');
  return mongoose.disconnect();
})
.then(() => {
  console.log('Disconnected');
  process.exit(0);
})
.catch((err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
