
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser.username === username && storedUser.password === password) {
      localStorage.setItem('isAuthenticated', 'true'); // persist auth state
      onLogin(username);
      navigate('/dashboard');
    } else {
      setError('Invalid credentials');
    }
  };

  const handleRegister = () => {
    if (username && password) {
      localStorage.setItem('user', JSON.stringify({ username, password }));
      alert('Registration successful! Please log in.');
      setIsRegistering(false);
    } else {
      setError('Please enter a username and password');
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>{isRegistering ? 'Register' : 'Login'}</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ padding: '10px', marginBottom: '10px', width: '100%' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: '10px', marginBottom: '10px', width: '100%' }}
      />
      {isRegistering ? (
        <button onClick={handleRegister} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Register
        </button>
      ) : (
        <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Login
        </button>
      )}
      <div style={{ marginTop: '10px' }}>
        <button onClick={() => setIsRegistering(!isRegistering)} style={{ padding: '5px 10px', fontSize: '14px' }}>
          {isRegistering ? 'Back to Login' : 'Register an account'}
        </button>
      </div>
      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  );
};

export default Login;
