# Backend Setup Verification

Use this guide to verify the backend is properly configured for Quick Tournaments.

## 1. Environment Check

**Verify .env file exists:**
```bash
cd backend
cat .env
```

**Should contain:**
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/bracketace
JWT_SECRET=your-secret-key-here
```

## 2. Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📱 Health check: http://localhost:3001/api/health
🚀 GraphQL endpoint: http://localhost:3001/graphql
🔍 GraphQL Playground: http://localhost:3001/graphql
✅ MongoDB Connected Successfully
```

## 3. Test GraphQL Endpoint

**Browser Test:**
- Open: http://localhost:3001/graphql
- You should see Apollo Server landing page or GraphQL Playground

**Health Check:**
```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{"status":"OK","message":"BracketAce GraphQL API is running"}
```

## 4. Test Authentication

**Get a Token (using curl):**
```bash
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"admin@bracketace.com\", password: \"SuperAdmin123!\" }) { token user { id email firstName lastName role } } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "...",
        "email": "admin@bracketace.com",
        "firstName": "Super",
        "lastName": "Admin",
        "role": "superadmin"
      }
    }
  }
}
```

**Save the token for next steps**

## 5. Test Tournament Creation

**Create a Tournament:**
```bash
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation { createTournament(input: { name: \"Test Tournament\", mode: doubles, registrationType: open, bracketingMethod: manual }) { id name mode status bracketingMethod } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "createTournament": {
      "id": "...",
      "name": "Test Tournament",
      "mode": "doubles",
      "status": "registration",
      "bracketingMethod": "manual"
    }
  }
}
```

**Save the tournament ID for next steps**

## 6. Test Quick Player Creation

**Create a Player:**
```bash
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation { createQuickPlayer(input: { firstName: \"John\", lastName: \"Doe\", gender: male, tournamentId: \"YOUR_TOURNAMENT_ID\" }) { id firstName lastName gender } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "createQuickPlayer": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "gender": "male"
    }
  }
}
```

## 7. Test Get Tournament Players

**Query Players:**
```bash
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { tournamentPlayers(tournamentId: \"YOUR_TOURNAMENT_ID\") { id firstName lastName gender } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "tournamentPlayers": [
      {
        "id": "...",
        "firstName": "John",
        "lastName": "Doe",
        "gender": "male"
      }
    ]
  }
}
```

## 8. Verify in MongoDB

**Check Tournament:**
```bash
mongosh bracketace
db.tournaments.find().pretty()
```

**Check Players:**
```bash
db.players.find().pretty()
```

## Common Issues

### Issue: "MongoDB Connection Error"

**Solution:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Issue: "Port 3001 already in use"

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Issue: "Authentication required"

**Causes:**
1. Missing or invalid token
2. Token expired
3. User not found in database

**Solution:**
- Login again to get a fresh token
- Ensure admin user exists in database
- Check JWT_SECRET in .env matches

### Issue: "GraphQL validation error"

**Check:**
1. Schema is valid: `npm run build` (should complete without errors)
2. All enum values match (e.g., `doubles` not `"doubles"`)
3. Required fields are provided
4. Field types match schema

### Issue: "Failed to create tournament: ..."

**Enable verbose logging:**

Edit `backend/src/server.ts` and ensure `formatError` is logging:
```typescript
formatError: (formattedError, error) => {
  console.error('GraphQL Error:', formattedError);
  console.error('Original Error:', error);
  return formattedError;
}
```

**Check backend console** - detailed error will be logged there

## Success Checklist

- [ ] Backend server starts without errors
- [ ] MongoDB connection successful
- [ ] Health check endpoint returns OK
- [ ] GraphQL endpoint accessible
- [ ] Login mutation returns token
- [ ] Create tournament mutation works
- [ ] Create player mutation works
- [ ] Query players returns data
- [ ] Data persists in MongoDB

## Next Steps

Once all checks pass:
1. Start the frontend: `cd bracket-ace && npm start`
2. Navigate to: http://localhost:4200/quick-tournament
3. Try creating a tournament through the UI
4. If errors occur, check the debug panel in the UI
5. Cross-reference with backend console logs
