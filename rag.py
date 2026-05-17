from pathlib import Path
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
import os

load_dotenv()

def process_pdf(file_path: str, original_file_name: str = None):
    import re
    # Use the original filename if provided, else fall back to the path's stem
    file_name = Path(original_file_name).stem if original_file_name else Path(file_path).stem
    # Clean the filename for the collection name (replace spaces and invalid chars with dashes)
    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '-', file_name)
    collection_name = f"RAGNAR-{clean_name}"
    
    loader = PyPDFLoader(file_path = file_path)
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
            collection_name = collection_name,
            force_recreate=True
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
            collection_name = collection_name,
            force_recreate=True
        )

    print(f"Find Vector DB here: http://localhost:6333/dashboard#/collections (Collection: {collection_name})")
    return collection_name

if __name__ == "__main__":
    pdf_path = str(Path(__file__).parent / "Q&A.pdf")
    process_pdf(pdf_path)