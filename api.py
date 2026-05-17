from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RAGNAR API")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    history: List[Dict[str, Any]] = []
    collection_name: str = "RAGNAR-Q-A"  # Default fallback if not provided

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    import tempfile
    try:
        file_name = file.filename or "uploaded.pdf"
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        try:
            # Trigger the RAG ingestion
            from rag import process_pdf
            collection_name = process_pdf(tmp_path, original_file_name=file_name)
        finally:
            # Always clean up the temporary file after processing
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        return {
            "message": "Document uploaded and processed successfully.",
            "collection_name": collection_name
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
            from g_ai import g_ragnar_chat
            response = g_ragnar_chat(req.query, req.history, req.collection_name)
            return {"response": response}
        elif os.getenv("OPENAI_API_KEY"):
            from o_ai import o_ragnar_chat
            response = o_ragnar_chat(req.query, req.history, req.collection_name)
            return {"response": response}
        else:
            return {"error": "No valid API key found for either Google or OpenAI."}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
