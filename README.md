# RAGNAR - Multi-User Document Intelligence Engine ⚔️

RAGNAR is a powerful, full-stack Retrieval-Augmented Generation (RAG) AI assistant. Built with **FastAPI**, **React**, and **LangChain**, it allows multiple users to create accounts, securely upload PDF documents, and chat with an AI that derives its answers strictly from their personal uploaded scrolls.

RAGNAR dynamically supports both **OpenAI** and **Google Gemini** models depending on your available API keys, utilizing **Qdrant** as a lightning-fast local vector database.

---

## ✨ Features

- **Full-Stack Web App:** A sleek, responsive, glassmorphism React frontend built with Vite.
- **Secure Authentication:** JWT-based user authentication with bcrypt password hashing and SQLite for user management.
- **Data Privacy & Isolation:** Uploaded PDFs and their vector embeddings are strictly tied to individual user accounts. Users cannot access or query each other's files.
- **Dynamic Context Switching:** Upload multiple PDFs and seamlessly click between them in your personalized dashboard sidebar to switch the AI's context on the fly.
- **Scroll Management:** Easily delete old documents to instantly purge their vector embeddings from the database.
- **Multi-Provider LLM Support:** Automatically detects your `.env` configuration to use either OpenAI (GPT) or Google Gemini.
- **Conversational Memory:** Remembers your past questions and context within a continuous chat session.
- **Hallucination Prevention:** The AI is strictly grounded in the provided document context.

---

## 🛠️ Technology Stack

**Backend**
- Python 3.10+, FastAPI, SQLAlchemy, SQLite, passlib (bcrypt), PyJWT
- LangChain, PyPDFLoader, Unstructured
- Qdrant (Vector Database)

**Frontend**
- React 18, Vite, TypeScript
- React Router DOM, Axios, jwt-decode
- Modern CSS (Flexbox, Glassmorphism, CSS Variables)

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Python 3.10+**
- **Node.js** (v16 or higher)
- **Docker & Docker Compose** (to run the Qdrant database)
- An API Key from **OpenAI** or **Google (Gemini)**

### 2. Clone the Repository
```bash
git clone https://github.com/shohelahmed75/RAGNAR.ai
cd RAGNAR.ai
```

### 3. Start the Vector Database
Launch the local Qdrant instance using Docker:
```bash
docker-compose up -d
```
*(This starts Qdrant locally on port 6333)*

### 4. Setup the FastAPI Backend
Create a virtual environment and install the required Python dependencies:
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On macOS/Linux (use .\venv\Scripts\activate on Windows)

# Install requirements
pip install -r req.txt
```

Create a `.env` file in the root directory and add your preferred API keys and a secret key for JWT encryption:
```env
# Add at least one of the following:
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

Start the backend server:
```bash
python api.py
```
*(The API will run on http://0.0.0.0:8000. SQLite database `ragnar.db` will be auto-generated).*

### 5. Setup the React Frontend
Open a new terminal window, navigate to the `frontend` folder, and install the Node dependencies:
```bash
cd frontend
npm install
npm run dev
```
*(The React app will run on http://localhost:5173).*

---

## 📖 Usage Guide

1. **Access the App:** Open `http://localhost:5173` in your browser or on your mobile device (the UI is fully responsive!).
2. **Create an Account:** Register a new user account. Passwords are encrypted instantly.
3. **Upload a Scroll:** Drag and drop or select a PDF to upload. RAGNAR will securely cache it, process the text embeddings into Qdrant, and delete the physical file from the server.
4. **Chat:** Select your uploaded scroll from the sidebar and begin asking questions. The AI will analyze the specific document and provide grounded answers!
5. **Manage Data:** Click the `✕` next to any scroll in your sidebar to permanently delete it and its vector embeddings.

---

## 📁 Project Structure

- **`api.py`**: The FastAPI backend entry point containing routing, auth protection, and file management endpoints.
- **`auth.py`**: Handles JWT token generation and bcrypt password hashing.
- **`database.py`**: SQLAlchemy ORM models (`User`, `Document`) and SQLite initialization.
- **`config.py`**: Centralized configuration for AI system prompts.
- **`rag.py`**: Handles PDF loading, text chunking, and isolated Qdrant vector ingestion.
- **`g_ai.py` / `o_ai.py`**: Google Gemini and OpenAI chat implementations featuring multi-turn memory integration.
- **`frontend/`**: The complete React/Vite frontend application (routing, global auth context, dynamic dashboard).
- **`docker-compose.yml`**: Configuration for spinning up the local Qdrant service.
