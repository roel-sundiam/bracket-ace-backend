# BracketAce Backend - Deployment Guide

## Quick Deploy to Render

### Option 1: Using PowerShell Script (Windows - Easiest)

```powershell
cd C:\Projects2\BracketAce\backend
.\deploy.ps1
```

### Option 2: Using Bash Script (WSL/Linux/Mac)

```bash
cd /mnt/c/Projects2/BracketAce/backend
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Manual Commands (PowerShell)

```powershell
cd C:\Projects2\BracketAce\backend

# Build the project
npm run build

# Add and commit changes
git add .
git commit -m "Update backend configuration"

# Push to GitHub (with token)
git remote set-url origin https://roel-sundiam:YOUR_GITHUB_TOKEN@github.com/roel-sundiam/bracket-ace-backend.git
git push origin main

# Clean up token
git remote set-url origin https://github.com/roel-sundiam/bracket-ace-backend.git
```

## Render Configuration

Your backend is configured to deploy automatically from GitHub when you push changes.

### Environment Variables (Already Set in Render)

- `NODE_ENV` = `production`
- `MONGODB_URI` = Your MongoDB Atlas connection string
- `JWT_SECRET` = Your generated secret
- `JWT_EXPIRES_IN` = `7d`

### Build & Start Commands

- **Build**: `npm install && npm run build`
- **Start**: `npm start`

## Monitoring Your Deployment

1. Go to https://dashboard.render.com
2. Select your `bracket-ace-backend` service
3. View the **Events** tab to see deployment status
4. Check **Logs** for runtime output

## Backend URL

Once deployed, your GraphQL API will be available at:
```
https://bracket-ace-backend.onrender.com/graphql
```

## Testing Your Backend

Test your GraphQL endpoint:
```bash
curl https://bracket-ace-backend.onrender.com/graphql
```

Or visit the GraphQL Playground at:
```
https://bracket-ace-backend.onrender.com/graphql
```

## Troubleshooting

### Build Fails
- Check the build logs in Render dashboard
- Ensure all TypeScript types are in `dependencies`
- Verify `tsconfig.json` has `moduleResolution: "node"`

### MongoDB Connection Issues
- Verify MongoDB Atlas allows connections from `0.0.0.0/0`
- Check that `MONGODB_URI` environment variable is set correctly
- Ensure MongoDB user has correct permissions

### API Not Responding
- Check if the service is running in Render dashboard
- Review logs for errors
- Verify environment variables are set

## Security Notes

⚠️ **IMPORTANT**: The GitHub token in the scripts should be:
1. Revoked and regenerated after first use
2. Never committed to version control
3. Stored securely (use GitHub CLI for better security)

## Next Steps

After backend is deployed:
1. Note your backend URL
2. Update frontend `GRAPHQL_ENDPOINT` to point to Render URL
3. Deploy frontend to Netlify
4. Test the complete application
