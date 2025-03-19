FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api.py rag_system.py ./
COPY lambda_handler.py ./

# Create documents directory
RUN mkdir -p ./documents

# The port that your application will listen on
ENV PORT 8000

# Run the application
CMD exec uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}