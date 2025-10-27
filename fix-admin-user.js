require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
.then(async () => {
  console.log('✅ Connected to MongoDB\n');

  const admin = await User.findOne({ email: 'admin@bracketace.com' });

  if (admin) {
    console.log('Found admin user - updating isActive field...');
    admin.isActive = true;
    await admin.save();
    console.log('✅ Admin user updated successfully');
    console.log('Email:', admin.email);
    console.log('isActive:', admin.isActive);
  } else {
    console.log('❌ Admin user not found');
  }

  await mongoose.disconnect();
  process.exit(0);
})
.catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
