from pathlib import Path
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
import os

load_dotenv()
pdf_path = Path(__file__).parent / "Q&A.pdf"

loader = PyPDFLoader(file_path = pdf_path)
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size = 1000,
    chunk_overlap = 300
)

chunks = text_splitter.split_documents(documents = docs)

if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    embedding_model = GoogleGenerativeAIEmbeddings(
        model = "gemini-embedding-001"
    )

    vector_store = QdrantVectorStore.from_documents(
    documents = chunks,
    embedding = embedding_model,
    url = "http://localhost:6333",
    collection_name = "RAGNAR_GOOGLE"
    )

elif os.getenv("OPENAI_API_KEY"):
    from langchain_openai import OpenAIEmbeddings

    embedding_model = OpenAIEmbeddings(
        model = "text-embedding-3-small"
    )

    vector_store = QdrantVectorStore.from_documents(
    documents = chunks,
    embedding = embedding_model,
    url = "http://localhost:6333",
    collection_name = "RAGNAR_OPENAI"
    )

print("Find Vector DB here: http://localhost:6333/dashboard#/collections")