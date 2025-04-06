
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeUsername, sanitizePassword } from '../utils/inputSanitizers';


const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const [passwordValid, setPasswordValid] = useState(false);
  const [usernameValid, setUsernameValid] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  const sanitizeInput = (value) => {
    // Allows alphanumeric, ., @, -, _
    return value.replace(/[\x00-\x1F\x7F]/g, '');
  };

  const validateUsername = (value) => {
    const sanitizedValue = sanitizeUsername(value);
    setUsername(sanitizedValue);
    setUsernameTouched(true);
    setUsernameValid(sanitizedValue.length >= 4);
  };
  
  const validatePassword = (value) => {
    const sanitizedValue = sanitizePassword(value);
    setPassword(sanitizedValue);
    setPasswordTouched(true);
    setPasswordValid(passwordRegex.test(sanitizedValue));
  };

  const handleLogin = async () => {
    setError('');

    if (username.length < 4) {
      setError('Username must be at least 4 characters long');
      return;
    }

    // Validate password (min 8 chars, includes letter, number, and symbol)
    if (!passwordRegex.test(password)) {
      setError(
        'Password must be at least 8 characters and include a letter, number, and symbol'
      );
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
    if (username.length < 4) {
      setError('Username must be at least 4 characters long');
      return;
    }
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
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => validateUsername(e.target.value)}
          className="auth-input auth-input-user"
        />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => validatePassword(e.target.value)}
          className="auth-input"
        />

        {isRegistering && usernameTouched && (
          <p className={`auth-feedback ${usernameValid ? 'valid' : 'invalid'}`}>
            {usernameValid ? '✅ Username looks good' : '❌ Must be at least 4 characters'}
          </p>
        )}

        {isRegistering && passwordTouched && (
          <p className={`auth-feedback ${passwordValid ? 'valid' : 'invalid'}`}>
            {passwordValid
              ? '✅ Strong password'
              : '❌ Must include letter, number, symbol (min 8 chars)'}
          </p>
        )}


        {isRegistering ? (
          <button
            onClick={handleRegister}
            className="auth-button-alt"
            disabled={!usernameValid || !passwordValid}
          >
            Register
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="auth-button"
            disabled={!usernameValid || !passwordValid}
          >
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
