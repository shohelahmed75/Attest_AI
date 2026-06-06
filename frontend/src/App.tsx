import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { FiFileText, FiLogOut, FiMenu, FiSend, FiTrash2, FiUploadCloud, FiX } from 'react-icons/fi';
import './index.css';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UserFile {
  id: number;
  filename: string;
  collection_name: string;
}

// Premium custom Markdown parsing component with inline rendering, styled fallback panels, lists, headings, and interactive copyable code blocks.
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const isFallback = text.includes('[GENERAL_KNOWLEDGE_FALLBACK]');
  const cleanText = text.replace('[GENERAL_KNOWLEDGE_FALLBACK]', '').trim();

  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  const renderTextWithInlineFormatting = (txt: string) => {
    const inlineParts: React.ReactNode[] = [];
    const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const segments = txt.split(inlineRegex);

    segments.forEach((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        inlineParts.push(<strong key={i} className="md-bold">{seg.slice(2, -2)}</strong>);
      } else if (seg.startsWith('*') && seg.endsWith('*')) {
        inlineParts.push(<em key={i} className="md-italic">{seg.slice(1, -1)}</em>);
      } else if (seg.startsWith('`') && seg.endsWith('`')) {
        inlineParts.push(<code className="inline-code-badge" key={i}>{seg.slice(1, -1)}</code>);
      } else {
        inlineParts.push(seg);
      }
    });
    return inlineParts;
  };

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderBlocks = (blockText: string) => {
    const lines = blockText.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];
    let inOrderedList = false;
    let orderedListItems: React.ReactNode[] = [];

    const flushList = (listKey: string) => {
      if (inList && listItems.length > 0) {
        elements.push(<ul className="md-unordered-list" key={`ul-${listKey}`}>{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      if (inOrderedList && orderedListItems.length > 0) {
        elements.push(<ol className="md-ordered-list" key={`ol-${listKey}`}>{orderedListItems}</ol>);
        orderedListItems = [];
        inOrderedList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
      const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);

      if (bulletMatch) {
        flushList(`before-bullet-${index}`);
        inList = true;
        listItems.push(<li key={`li-${index}`} className="md-li">{renderTextWithInlineFormatting(bulletMatch[2])}</li>);
      } else if (orderedMatch) {
        flushList(`before-ordered-${index}`);
        inOrderedList = true;
        orderedListItems.push(<li key={`oli-${index}`} className="md-li">{renderTextWithInlineFormatting(orderedMatch[2])}</li>);
      } else if (headingMatch) {
        flushList(`before-heading-${index}`);
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const Tag = `h${level}` as any;
        elements.push(<Tag className={`md-heading md-h${level}`} key={`h-${index}`}>{renderTextWithInlineFormatting(headingText)}</Tag>);
      } else if (trimmed === '') {
        flushList(`blank-${index}`);
      } else {
        flushList(`before-p-${index}`);
        elements.push(<p className="md-paragraph" key={`p-${index}`}>{renderTextWithInlineFormatting(line)}</p>);
      }
    });

    flushList('end');
    return elements;
  };

  let codeIndex = 0;
  while ((match = codeBlockRegex.exec(cleanText)) !== null) {
    const textBefore = cleanText.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(<div key={`text-${key++}`}>{renderBlocks(textBefore)}</div>);
    }

    const language = match[1] || 'plaintext';
    const codeContent = match[2].trim();
    const currentCodeIndex = codeIndex++;

    parts.push(
      <div className="code-block-container" key={`code-${key++}`}>
        <div className="code-block-header">
          <span className="code-lang">{language.toUpperCase()}</span>
          <button
            className="copy-code-btn"
            onClick={() => handleCopyCode(codeContent, currentCodeIndex)}
          >
            {copiedIndex === currentCodeIndex ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <pre className="code-block-pre">
          <code>{codeContent}</code>
        </pre>
      </div>
    );

    lastIndex = codeBlockRegex.lastIndex;
  }

  const textAfter = cleanText.substring(lastIndex);
  if (textAfter.trim()) {
    parts.push(<div key={`text-${key++}`}>{renderBlocks(textAfter)}</div>);
  }

  return (
    <div className="markdown-render-root">
      {isFallback && (
        <div className="fallback-callout-panel">
          <div className="fallback-header">
            <span className="fallback-icon">⚠️</span>
            <span className="fallback-title">General Knowledge Fallback</span>
          </div>
          <p className="fallback-description">
            The requested details are not present in the current document. RAGNAR has synthesized this response from general intelligence.
          </p>
        </div>
      )}
      <div className="markdown-body-content">
        {parts}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Welcome, ${user?.username}. I am RAGNAR, your advanced document intelligence engine. Ask a general question to start in **General Chat Mode**, or upload/select a PDF from the library to begin **Document QA Mode**.` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:8000/files`);
      setUserFiles(response.data);
    } catch (e) {
      console.error("Failed to fetch files");
    }
  };

  const handleDelete = async (fileId: number, collectionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`http://${window.location.hostname}:8000/files/${fileId}`);
      if (activeCollection === collectionName) {
        setActiveCollection('');
        setMessages([{ role: 'assistant', content: 'Context cleared. Please select another document or use General Chat.' }]);
      }
      fetchFiles();
    } catch (error) {
      console.error("Failed to delete file");
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

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

    setUploadStatus({ type: 'info', text: 'Indexing your document. Please wait.' });

    try {
      const response = await axios.post(`http://${window.location.hostname}:8000/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.error) {
        setUploadStatus({ type: 'error', text: response.data.error });
      } else {
        setUploadStatus({ type: 'success', text: `Document indexed: ${response.data.filename}` });
        if (response.data.collection_name) {
          setActiveCollection(response.data.collection_name);
        }
        fetchFiles(); // Refresh list
        setIsSidebarOpen(false); // Close sidebar on mobile after upload
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
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
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
      const history = newMessages.slice(1, -1).map(m => ({ role: m.role, content: m.content }));

      const payload: any = {
        query: userMessage.content,
        history: history,
        collection_name: activeCollection || "general"
      };

      const response = await axios.post(`http://${window.location.hostname}:8000/chat`, payload);

      if (response.data.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${response.data.error}` }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setMessages([...newMessages, { role: 'assistant', content: 'You are not authorized to query this collection.' }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'The connection dropped. Please try again.' }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const activeFile = userFiles.find(f => f.collection_name === activeCollection);

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand-cluster">
          <button
            className="icon-btn mobile-menu-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? 'Close document library' : 'Open document library'}
          >
            {isSidebarOpen ? <FiX /> : <FiMenu />}
          </button>
          <div className="brand-copy">
            <h1>RAGNAR</h1>
            <p className="subtitle">Document Intelligence Engine</p>
          </div>
        </div>


        <div className="header-right">
          <span className="logged-in-text">Signed in as {user?.username}</span>
          <button onClick={logout} className="contact-btn logout-btn">
            <span>Logout</span>
            <FiLogOut />
          </button>
        </div>
      </header>


      <main className="main-content">
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <section className="panel upload-panel">
            <div className="panel-heading">
              <p className="section-kicker">U p l o a d . 0 1</p>
              <h2>New Document</h2>
            </div>
            <div
              className="upload-section"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click();
                }
              }}
            >
              <FiUploadCloud className="upload-icon" />
              <p>Drop a PDF or click to browse</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="file-input"
                accept="application/pdf"
              />
            </div>
            {uploadStatus && (
              <div className={`status-message status-${uploadStatus.type === 'info' ? 'success' : uploadStatus.type}`}>
                {uploadStatus.text}
              </div>
            )}
          </section>

          <section className="panel library-panel">
            <div className="panel-heading">
              <p className="section-kicker">L i b r a r y . 0 2</p>
              <h2>Your Files</h2>
            </div>
            {userFiles.length === 0 ? (
              <p className="empty-state">No documents uploaded yet.</p>
            ) : (
              <ul className="file-list">
                {userFiles.map(f => (
                  <li
                    key={f.id}
                    className={`file-item ${activeCollection === f.collection_name ? 'active' : ''}`}
                  >
                    <button className="file-select-btn" onClick={() => setActiveCollection(f.collection_name)}>
                      <FiFileText />
                      <span>{f.filename}</span>
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(f.id, f.collection_name, e)}
                      title="Delete document"
                      aria-label={`Delete ${f.filename}`}
                    >
                      <FiTrash2 />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section className="chat-container panel">
          <div className="chat-header">
            <div>
              <p className="section-kicker">A s k . 0 3</p>
              <h2>Conversation</h2>
            </div>
            <div className="context-strip-container">
              <span className={`status-badge ${activeCollection ? 'badge-document' : 'badge-general'}`}>
                {activeCollection ? '📄 Document QA Mode' : '🌐 General Chat Mode'}
              </span>
              {activeCollection && (
                <div className="context-strip">
                  <span className="context-filename">Active: {activeFile?.filename || activeCollection}</span>
                  <button
                    className="clear-context-btn"
                    onClick={() => {
                      setActiveCollection('');
                      setMessages([...messages, { role: 'assistant', content: 'Returned to **General Chat Mode**. Ask me anything!' }]);
                    }}
                    title="Switch to General Chat Mode"
                    aria-label="Exit Document QA Mode"
                  >
                    <FiX />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
                {msg.role === 'user' ? msg.content : <MarkdownRenderer text={msg.content} />}
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
              placeholder={activeCollection ? 'Ask RAGNAR a question about this document...' : 'Ask RAGNAR a general question (General Chat)...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
