import { User } from '../../models/User';
import { generateToken, getAuthContext, requireAuth, requireSuperAdmin } from '../../utils/auth';

export const authResolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      const authContext = await getAuthContext(context.req);
      if (!authContext.isAuthenticated) {
        return null;
      }
      return authContext.user;
    },

    users: async (_: any, __: any, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireSuperAdmin(authContext);
      
      try {
        return await User.find({ isActive: true }).sort({ createdAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch users');
      }
    },
  },

  Mutation: {
    register: async (_: any, { input }: {
      input: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        gender: 'male' | 'female';
      }
    }) => {
      try {
        const { email, password, firstName, lastName, gender } = input;

        if (!email || !password || !firstName || !lastName || !gender) {
          throw new Error('All fields are required');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        const user = new User({
          email: email.toLowerCase(),
          password,
          firstName,
          lastName,
          gender,
          role: 'member' // Default role
        });
        
        await user.save();
        
        const token = generateToken(user);
        
        return {
          token,
          user
        };
      } catch (error) {
        throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    login: async (_: any, { input }: { 
      input: { 
        email: string; 
        password: string; 
      } 
    }) => {
      try {
        const { email, password } = input;
        
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        
        const user = await User.findOne({ 
          email: email.toLowerCase(), 
          isActive: true 
        });
        
        if (!user) {
          throw new Error('Invalid email or password');
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }
        
        const token = generateToken(user);
        
        return {
          token,
          user
        };
      } catch (error) {
        throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },
};