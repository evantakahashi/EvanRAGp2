# Vercel Environment Setup

To connect your frontend to your backend API when deployed on Vercel, follow these steps:

## Setting Environment Variables in Vercel

1. Go to your Vercel dashboard and select your project
2. Click on "Settings" tab
3. Select "Environment Variables" from the left menu
4. Add a new environment variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: Your backend API URL (e.g., `https://your-backend-api.com`)
5. Make sure to select all environments (Production, Preview, Development)
6. Click "Save"
7. Redeploy your application for the changes to take effect

## Important Notes

- The backend API must be deployed and accessible from the internet
- Make sure CORS is configured on your backend to allow requests from your Vercel domain
- Without a proper backend deployment, your RAG application won't work in production

## Deployment Options for Backend

You can deploy your FastAPI backend on:
1. Railway
2. Heroku
3. AWS Lambda
4. Vercel Serverless Functions (requires modifications)
5. Any other hosting platform that supports Python

Remember to update your environment variable `NEXT_PUBLIC_API_URL` after deploying your backend. 