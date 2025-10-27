import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-this-in-production';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'superadmin' | 'club_admin' | 'member';
}

export interface AuthContext {
  user: IUser | null;
  isAuthenticated: boolean;
}

export const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };
  
  const options: SignOptions = { 
    expiresIn: '7d'
  };
  
  return jwt.sign(payload, JWT_SECRET as string, options);
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const getAuthContext = async (req: any): Promise<AuthContext> => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return { user: null, isAuthenticated: false };
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return { user: null, isAuthenticated: false };
  }
  
  try {
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return { user: null, isAuthenticated: false };
    }
    
    return { user, isAuthenticated: true };
  } catch (error) {
    return { user: null, isAuthenticated: false };
  }
};

export const requireAuth = (context: AuthContext) => {
  if (!context.isAuthenticated || !context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
};

export const requireRole = (context: AuthContext, allowedRoles: string[]) => {
  const user = requireAuth(context);
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
};

export const requireSuperAdmin = (context: AuthContext) => {
  return requireRole(context, ['superadmin']);
};

export const requireClubAdmin = (context: AuthContext) => {
  return requireRole(context, ['superadmin', 'club_admin']);
};