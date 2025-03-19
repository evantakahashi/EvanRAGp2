# Backend Deployment Guide

This document provides instructions for deploying your RAG system backend to various cloud platforms.

## Option 1: Railway.app (Recommended for easy deployment)

Railway offers a simple way to deploy Python applications:

1. Create an account on [Railway.app](https://railway.app/)
2. Create a new project and link your GitHub repository
3. Configure the project:
   - Set the start command to `uvicorn api:app --host 0.0.0.0 --port $PORT`
   - Add environment variables for your OpenAI and Pinecone API keys
4. Deploy the application

## Option 2: Heroku

1. Install the Heroku CLI and log in
2. Create a new Heroku app: `heroku create your-rag-backend`
3. Create a `Procfile` with: `web: uvicorn api:app --host=0.0.0.0 --port=$PORT`
4. Create a `runtime.txt` with your Python version: `python-3.10.x`
5. Set environment variables: `heroku config:set OPENAI_API_KEY=your_key PINECONE_API_KEY=your_key`
6. Deploy: `git push heroku main`

## Option 3: AWS Lambda with Mangum

For serverless deployment on AWS Lambda:

1. Install Mangum: `pip install mangum`
2. Update your `api.py` to include:

```python
from mangum import Mangum

# Keep your existing FastAPI app code

# Add this at the end of the file
handler = Mangum(app)
```

3. Create a deployment package following AWS Lambda Python guidelines
4. Set up API Gateway to trigger your Lambda function

## Updating the API URL in your Frontend

After deployment, get your API URL and update the environment variable in Vercel:

1. Go to your Vercel project settings
2. Add/update the environment variable:
   - `NEXT_PUBLIC_API_URL` = Your backend URL (e.g., `https://your-rag-backend.railway.app`)

## Important Considerations

1. **API Keys**: Securely store your OpenAI and Pinecone API keys in environment variables
2. **CORS Configuration**: Update the `allow_origins` list in `api.py` with your actual frontend domain
3. **Cold Start**: Serverless deployments may experience cold starts which can delay initial responses
4. **Resources**: Ensure your hosting plan provides sufficient memory for embedding generation
5. **Costs**: Monitor usage to avoid unexpected costs, especially with OpenAI API usage

Remember to test your API after deployment by accessing the `/health` endpoint. 