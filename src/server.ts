import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { expressMiddleware } from '@as-integrations/express4';
import { connectDB } from './config/database';
import { typeDefs } from './graphql/schema/typeDefs';
import { resolvers } from './graphql/resolvers';
import { getAuthContext } from './utils/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (keep for backwards compatibility)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BracketAce GraphQL API is running' });
});

const startServer = async () => {
  try {
    await connectDB();
    
    // Create GraphQL schema
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });
    
    // Create Apollo Server
    const server = new ApolloServer({
      schema,
      introspection: true, // Enable in development
      plugins: [],
      formatError: (formattedError, error) => {
        console.error('GraphQL Error:', formattedError);
        console.error('Original Error:', error);
        return formattedError;
      },
    });
    
    await server.start();
    
    // Apply Apollo GraphQL middleware with context
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => {
        const authContext = await getAuthContext(req);
        return {
          req,
          ...authContext
        };
      },
    }));
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🚀 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      console.log(`🔍 GraphQL Playground: http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();