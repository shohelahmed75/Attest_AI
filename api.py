from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import shutil
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import get_db, User, Document
from auth import get_password_hash, verify_password, create_access_token, get_current_user

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

class UserCreate(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    query: str
    history: List[Dict[str, Any]] = []
    collection_name: str

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/files")
def get_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    files = db.query(Document).filter(Document.user_id == current_user.id).all()
    return [{"id": f.id, "filename": f.filename, "collection_name": f.collection_name, "created_at": f.created_at} for f in files]

@app.delete("/files/{file_id}")
def delete_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        doc = db.query(Document).filter(Document.id == file_id, Document.user_id == current_user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="File not found or not authorized")
        
        from qdrant_client import QdrantClient
        try:
            client = QdrantClient(url="http://localhost:6333")
            client.delete_collection(collection_name=doc.collection_name)
        except Exception:
            pass

        db.delete(doc)
        db.commit()

        return {"message": "File deleted successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        file_name = file.filename or "uploaded.pdf"
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        try:
            # Trigger the RAG ingestion
            from rag import process_pdf
            collection_name = process_pdf(tmp_path, original_file_name=file_name, user_id=current_user.id)
            
            # Save document to database
            new_doc = Document(filename=file_name, collection_name=collection_name, user_id=current_user.id)
            # Check if this collection already exists for this user, if so, update it (or just rely on Qdrant overwriting and DB keeping duplicate records, wait, let's delete old one)
            existing_doc = db.query(Document).filter(Document.collection_name == collection_name).first()
            if existing_doc:
                db.delete(existing_doc)
            db.add(new_doc)
            db.commit()

        finally:
            # Always clean up the temporary file after processing
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        return {
            "message": "Document uploaded and processed successfully.",
            "collection_name": collection_name,
            "filename": file_name
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Verify ownership unless in General Chat Mode
        if req.collection_name and req.collection_name != "general":
            doc = db.query(Document).filter(Document.collection_name == req.collection_name, Document.user_id == current_user.id).first()
            if not doc:
                raise HTTPException(status_code=403, detail="Not authorized to access this collection")

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
