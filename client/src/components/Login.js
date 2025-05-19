import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeUsername, sanitizePassword } from '../../../server/utils/inputSanitizers';
import logo from '../assets/logo-default-profile.png';
import { FaGoogle } from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
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

  const validateUsername = (value) => {
    const cleaned = value.replace(/@/g, ''); // strip @
    const sanitizedValue = sanitizeUsername(cleaned);
    setUsername(sanitizedValue);
    setUsernameTouched(true);
    setUsernameValid(sanitizedValue.length >= 4);
  };

  const validatePassword = (value) => {
    setPasswordTouched(true);
    if (value.length >= 8) {
      setPasswordValid(true);
      setError('');
    } else {
      setPasswordValid(false);
      setError('Password must be at least 8 characters');
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !passwordValid) {
      return setError('Valid email and password required');
    }

    onLogin({ email, password });
  };

  const handleRegister = async () => {
    setError('');
    if (!email || email.length < 5) {
      return setError('Email is required');
    }
    if (username.length < 4) {
      return setError('Username must be at least 4 characters');
    }

    try {
      const response = await fetch(`${process.env.BASE_PATH}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
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
        <div className="logo-section">
          <img src={logo} alt="Logo" className="small-logo" />
        </div>
        <div className="auth-logo-container">
          <h2 className="auth-brand-text">ElevateHER</h2>
        </div>

        {/* Email field */}
        <input
          type="email"
          placeholder="Email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />

        {/* Username shown only during registration */}
        {isRegistering && (
          <input
            type="text"
            placeholder="Username"
            name="username"
            value={username}
            onChange={(e) => validateUsername(e.target.value)}
            className="auth-input auth-input-user"
          />
        )}

        {/* Password field */}
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          name="password"
          value={password}
          onChange={(e) => {
            const input = e.target.value;
            setPassword(input);
            validatePassword(input);
          }}
          className="auth-input"
        />

        {/* Feedback */}
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

        {/* Google login */}
        <button
          type="button"
          onClick={() => window.location.href = `${process.env.BASE_PATH}/api/auth/google`}
          className="auth-button-alt flex items-center justify-center"
        >
          <span>Sign in with Google </span>
          <FaGoogle className="h-5 w-5 ml-2" />
        </button>

        {/* Auth submit */}
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
            type="button"
            disabled={!passwordValid || !email}
          >
            Login
          </button>
        )}

        {/* Toggle form */}
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
