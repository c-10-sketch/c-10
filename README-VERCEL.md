# Vercel Deployment Guide

This project is configured for zero-config deployment on Vercel.

## Quick Deploy

1. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your Git repository
   - Vercel will automatically detect the configuration

2. **Environment Variables (Optional):**
   - If you want to use a different MongoDB connection, add:
     - `MONGODB_URI` - Your MongoDB connection string
     - `MONGODB_DB_NAME` - Your database name (defaults to "noir-emporium")
   - Otherwise, it will use the default connection string

3. **Deploy:**
   - Click "Deploy"
   - That's it! 🎉

## What's Configured

- ✅ `vercel.json` - Routing and build configuration
- ✅ `api/index.ts` - Serverless function handler
- ✅ MongoDB connection with environment variable support
- ✅ Automatic build and deployment
- ✅ Static file serving for the frontend

## First Time Setup

After the first deployment, you may want to run the migration script to populate your MongoDB database:

```bash
npm run migrate:mongodb
```

Or you can do this locally before deploying - the data will be in MongoDB and available to your deployed app.

## Notes

- The app automatically builds and serves both the API and frontend
- MongoDB connection is configured to work in serverless environment
- All routes are handled through the single serverless function
