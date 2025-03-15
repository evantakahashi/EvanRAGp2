# RAG System with LangChain, FastAPI, Pinecone, and Streamlit

This project implements a Retrieval-Augmented Generation (RAG) system that allows you to query your own documents using natural language.

## Components

- **rag_system.py**: Core RAG implementation using LangChain and Pinecone
- **api.py**: FastAPI backend providing REST endpoints
- **frontend.py**: Streamlit frontend for user interaction
- **documents/**: Directory to store your text files

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set up your environment variables by editing the `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENVIRONMENT=your_pinecone_environment
   PINECONE_INDEX_NAME=your_pinecone_index_name
   ```

3. Create a Pinecone index with the following dimensions:
   - Dimensions: 1536 (for OpenAI embeddings)
   - Metric: cosine

## Usage

1. Start the FastAPI backend:
   ```
   python api.py
   ```

2. In a separate terminal, start the Streamlit frontend:
   ```
   streamlit run frontend.py
   ```

3. Place your text files in the `documents/` directory.

4. Use the Streamlit interface to:
   - Ingest documents (process and store them in Pinecone)
   - Ask questions about your documents

## API Endpoints

- `POST /query`: Query the RAG system with a question
- `POST /ingest`: Ingest documents into the RAG system
- `GET /health`: Health check endpoint

## Notes

- This system uses OpenAI embeddings and the GPT-3.5-Turbo model
- Documents are split into chunks of 1000 characters with 200 character overlap
- The system retrieves the 3 most relevant document chunks for each query 