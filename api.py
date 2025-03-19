from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_system import RAGSystem
import uvicorn

app = FastAPI(title="RAG API", description="API for Retrieval-Augmented Generation")

# Add CORS middleware with improved configuration
app.add_middleware(
    CORSMiddleware,
    # Allow specific origins including local development and Vercel domains
    allow_origins=[
        #"http://localhost:3000",            # Local Next.js development
        "https://evan-rag.vercel.app",    # Your main Vercel domain (change this to your actual domain)
        #"https://evan-ragp2-git-main.vercel.app",  # Git branch specific domain
        #"https://evanragp2.vercel.app",     # Alternative domain format
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Specify the HTTP methods you actually use
    allow_headers=["*"],
)

# Initialize RAG system
rag = RAGSystem()

# Auto-ingest documents on startup
@app.on_event("startup")
async def startup_ingest_documents():
    try:
        cleared = rag.clear_vector_store()
        print(f"vector store cleared: {cleared}")
        chunks_ingested = rag.ingest_documents("./documents")
        print(f"ingested {chunks_ingested} chunks")
    except Exception as e:
        print(f"{str(e)}")

class QueryRequest(BaseModel):
    question: str

class IngestRequest(BaseModel):
    directory_path: str = "./documents"

class QueryResponse(BaseModel):
    answer: str

class IngestResponse(BaseModel):
    chunks_ingested: int
    message: str

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    try:
        answer = rag.query(request.question)
        return QueryResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500)

@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(request: IngestRequest, background_tasks: BackgroundTasks):
    try:
        chunks_ingested = rag.ingest_documents(request.directory_path)
        return IngestResponse(
            chunks_ingested=chunks_ingested,
            message=f"ingested {chunks_ingested} chunks"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"error ingesting {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True) 