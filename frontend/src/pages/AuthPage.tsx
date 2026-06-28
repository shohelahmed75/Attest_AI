import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import AttestLogo from '../components/AttestLogo';
import '../index.css';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post(`http://${window.location.hostname}:8000/login`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        login(response.data.access_token);
        navigate('/');
      } else {
        await axios.post(`http://${window.location.hostname}:8000/register`, { username, password });
        setIsLogin(true); // Switch to login after successful register
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred.');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Attest introduction">
        <div className="auth-visual-copy">
          <AttestLogo className="attest-logo-hero" />
          <p>Upload PDFs, ask questions, and turn dense documents into clear answers.</p>
        </div>
      </section>

      <section className="auth-card" aria-label={isLogin ? 'Login form' : 'Register form'}>
        <div className="panel-heading auth-heading">
          <p className="section-kicker">{isLogin ? 'L o g i n . 0 1' : 'J o i n . 0 1'}</p>
          <h2>{isLogin ? 'Enter Attest' : 'Create Account'}</h2>
        </div>

        {error && (
          <div className={`status-message ${error.includes('successful') ? 'status-success' : 'status-error'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
          <button type="submit" className="auth-submit">
            <span>{isLogin ? 'Continue' : 'Register'}</span>
            <FiArrowRight />
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already forged an account? "}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </section>
    </main>
  );
};

export default AuthPage;
