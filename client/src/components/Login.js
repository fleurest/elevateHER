
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('isAuthenticated', 'true');
        onLogin(data.username);
        navigate('/dashboard');
      } else {
        const err = await response.json();
        setError(err.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error during login');
    }
  };

  const handleRegister = async () => {
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        alert('Registration successful! Please log in.');
        setIsRegistering(false);
      } else {
        const err = await response.json();
        setError(err.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error during registration');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-container">
          <img
            src="/images/logo-default-profile.png"
            alt="ElevateHER Logo"
            className="auth-logo"
          />
          <h2 className="auth-brand-text">ElevateHER</h2>
        </div>
        <h1 className="auth-title">{isRegistering ? 'Register' : ''}</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="auth-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
        {isRegistering ? (
          <button onClick={handleRegister} className="auth-button-alt">
            Register
          </button>
        ) : (
          <button onClick={handleLogin} className="auth-button">
            Login
          </button>
        )}
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="auth-switch-link"
        >
          {isRegistering ? '← Back to Login' : 'Create an account →'}
        </button>
        {error && <div className="auth-error">{error}</div>}
      </div>
    </div>
  );
};

export default Login;
