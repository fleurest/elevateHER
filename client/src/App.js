import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HamburgerMenu from './components/HamburgerMenu';
import Home from './components/Home';
import Profile from './components/Profile';
import Search from './components/Search';
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${BASE_URL}/api/session`, { credentials: 'include' });

        const contentType = res.headers.get('content-type');

        if (!res.ok) {
          console.warn("Session check failed with status:", res.status);
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Session check failed", err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleLogin = async ({ email, password }) => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const raw = await res.text();
    console.log('RAW RESPONSE:', raw);

    if (!res.ok) {
      console.error('Login failed:', raw);
      return;
    }

    try {
      const data = JSON.parse(raw);
      setUser(data.user);
      setIsAuthenticated(true);
      navigate('/home');
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      setError('Unexpected server response');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/profile" /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/login"
            element={<Login onLogin={handleLogin} />}
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard handleLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/home"
            element={
              loading ? (
                <div>Loading...</div>
              ) : isAuthenticated && user ? (
                <Home handleLogout={handleLogout} user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated && user ? (
                <Profile handleLogout={handleLogout} username={user.username} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <Router basename={process.env.BASE_PATH || '/'}>
      <AppContent />
    </Router>
  );
}

export default App;
