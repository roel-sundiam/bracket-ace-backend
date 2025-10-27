import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';

dotenv.config();

const createAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || '';

    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@bracketace.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Active:', existingAdmin.isActive);

      // Update the password if needed
      existingAdmin.password = 'SuperAdmin123!';
      existingAdmin.role = 'superadmin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Admin user updated with new password');
    } else {
      // Create new admin user
      const admin = new User({
        email: 'admin@bracketace.com',
        password: 'SuperAdmin123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'superadmin',
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin user created successfully');
    }

    console.log('\n📧 Email: admin@bracketace.com');
    console.log('🔑 Password: SuperAdmin123!');
    console.log('👤 Role: superadmin');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();
