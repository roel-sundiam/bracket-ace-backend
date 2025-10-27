const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://admin:Helenbot04117777!1@mydb.zxr9i5k.mongodb.net/BracketAce?retryWrites=true&w=majority&appName=MyDB';

// User Schema (simplified version)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['member', 'club_admin', 'superadmin'], default: 'member' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if superadmin already exists
    const existingAdmin = await User.findOne({ email: 'admin@bracketace.com' });
    if (existingAdmin) {
      console.log('⚠️  Superadmin already exists with email: admin@bracketace.com');
      console.log('Existing user role:', existingAdmin.role);
      
      // Update role if needed
      if (existingAdmin.role !== 'superadmin') {
        existingAdmin.role = 'superadmin';
        await existingAdmin.save();
        console.log('✅ Updated existing user to superadmin');
      }
      
      mongoose.disconnect();
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', saltRounds);

    // Create superadmin user
    const superAdmin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@bracketace.com',
      password: hashedPassword,
      role: 'superadmin'
    });

    await superAdmin.save();
    console.log('✅ Superadmin created successfully!');
    console.log('📧 Email: admin@bracketace.com');
    console.log('🔑 Password: SuperAdmin123!');
    console.log('👑 Role: superadmin');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run the script
createSuperAdmin();