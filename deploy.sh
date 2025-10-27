#!/bin/bash

# Script to commit and push backend changes to GitHub
# Run this from the backend directory

echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed! Please fix errors before deploying."
    exit 1
fi

echo "Adding changes to git..."
git add package.json

echo "Committing changes..."
git commit -m "Move TypeScript types to dependencies for Render build"

echo "Setting remote URL with token..."
git remote set-url origin https://roel-sundiam:$GITHUB_TOKEN@github.com/roel-sundiam/bracket-ace-backend.git

echo "Pushing to GitHub..."
git push origin main

echo "Cleaning up token from git config..."
git remote set-url origin https://github.com/roel-sundiam/bracket-ace-backend.git

echo "Done! Your changes have been pushed to GitHub."
echo "Render will automatically rebuild your backend."
