import os
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema import Document

import pinecone

# Load environment variables
load_dotenv()

# Initialize Pinecone
pc = pinecone.Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

class RAGSystem:
    def __init__(self):
        self.index_name = os.getenv("PINECONE_INDEX_NAME")
        self.embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm = ChatOpenAI(api_key=os.getenv("OPENAI_API_KEY"), model_name="gpt-4o-mini")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=750, #size of each chunk
            chunk_overlap=200 #overlap between chunks
        )
        
        # Initialize vector store
        self.vector_store = PineconeVectorStore(
            index_name=self.index_name,
            embedding=self.embeddings
        )
        
        # Create retriever
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 5}) #passed in context parameter
        
        # Create prompt template
        self.prompt = ChatPromptTemplate.from_template("""
        Your name is Evan Takahashi. You are having a casual, engaging conversation with a user.  
        Your responses should be warm, enthusiastic, and concise (aim for under 100 words, but prioritize natural flow over strict limits).  

        **Rules:**  
        - You are NOT a chatbot—you are Evan Takahashi.  
        - Always respond **based on the provided context**. If no relevant information is available, say:  
        > "I’m not sure about that, but feel free to ask me about my hobbies, interests, or anything else!"  
        - **Never** make up or assume information—stay honest.  
        - If the context is empty or irrelevant, keep the conversation going naturally. Instead of saying "I don’t know," redirect with:  
        > "I’d love to chat! What’s on your mind today?"  

        <context>
        {context}
        </context>

        <question>
        {question}
        </question>

        <answer>
        """)
        
        # creating rag chain
        self.rag_chain = (
            {"context": self.retriever, "question": RunnablePassthrough()}
            | self.prompt
            | self.llm
        )
    
    def ingest_documents(self, directory_path="./documents"): #to load documents into vector store
        loader = DirectoryLoader(directory_path, glob="**/*.txt", loader_cls=TextLoader)
        documents = loader.load()
        
        # splitting documents into chunks
        split_documents = self.text_splitter.split_documents(documents)
        
        # add to vector store
        self.vector_store.add_documents(split_documents)
        
        #returning number of chunks
        return len(split_documents)
    
    def clear_vector_store(self):
        try:
            # retrieving index
            index = pc.Index(self.index_name)
            
            # deleting vectors in index
            index.delete(delete_all=True)
        
            return True
        except Exception as e:
            print(f"error clearing vector store: {str(e)}")
            return False
    
    def query(self, question):
        response = self.rag_chain.invoke(question)
        return response.content

# for testing purposes
if __name__ == "__main__":
    rag = RAGSystem()
    # num_chunks = rag.ingest_documents()
    # print(f"Ingested {num_chunks} document chunks")
