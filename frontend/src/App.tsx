import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './index.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hail, traveler! I am RAGNAR. Upload your scrolls (PDFs) and ask of me what you will.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);
  const [collectionName, setCollectionName] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadStatus({ type: 'error', text: 'Only PDF files are allowed.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadStatus({ type: 'info', text: 'Forging knowledge from your scroll... Please wait.' });
    
    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.error) {
        setUploadStatus({ type: 'error', text: response.data.error });
      } else {
        setUploadStatus({ type: 'success', text: `Knowledge absorbed! (${response.data.collection_name})` });
        if (response.data.collection_name) {
          setCollectionName(response.data.collection_name);
        }
      }
    } catch (error) {
      setUploadStatus({ type: 'error', text: 'Failed to upload document.' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length && fileInputRef.current) {
      // Use DataTransfer to set files to the input element
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      // Trigger onChange manually
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
      // Let's call the function directly since dispatchEvent doesn't trigger React's synthetic event
      handleFileUpload({ target: { files: dataTransfer.files } } as any);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Exclude the initial greeting from history if you want, but sending it is fine
      // Exclude system message and only send user/assistant history to the backend
      const history = newMessages.slice(1, -1).map(m => ({ role: m.role, content: m.content }));
      
      const payload: any = {
        query: userMessage.content,
        history: history
      };
      
      if (collectionName) {
        payload.collection_name = collectionName;
      }
      
      const response = await axios.post('http://localhost:8000/chat', payload);

      if (response.data.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${response.data.error}` }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Alas! The connection to the gods was lost.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Simple Markdown parser for bold and line breaks
  const renderMarkdown = (text: string) => {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>RAGNAR</h1>
        <p>Document Intelligence Engine</p>
      </header>

      <main className="main-content">
        {/* Sidebar / Upload Area */}
        <aside className="sidebar">
          <div className="glass-panel">
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--text-bright)' }}>
              Provide Context
            </h2>
            <div 
              className="upload-section"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">
                {/* SVG Icon for Upload */}
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <p>Drag & Drop your PDF here</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-dim)', marginTop: '0.5rem' }}>or click to browse</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="file-input" 
                accept="application/pdf"
              />
            </div>

            {uploadStatus && (
              <div className={`status-message status-${uploadStatus.type === 'info' ? 'success' : uploadStatus.type}`} style={{ opacity: uploadStatus.type === 'info' ? 0.8 : 1 }}>
                {uploadStatus.text}
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-dim)', marginBottom: '0.5rem' }}>System Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71', display: 'inline-block' }}></span>
                API Connected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginTop: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71', display: 'inline-block' }}></span>
                Vector DB Ready
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="chat-container glass-panel">
          <div className="chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
                {renderMarkdown(msg.content)}
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble chat-assistant typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Ask RAGNAR a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
            />
            <button 
              className="send-btn" 
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
