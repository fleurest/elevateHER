import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HamburgerMenu from './components/HamburgerMenu';
import Home from './components/Home';
import Profile from './components/Profile';
import Search from './components/Search';
import { BASE_PATH } from './config';

function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${process.env.API_BASE}/api/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed', err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);


  const handleLogin = async ({ email, password }) => {
    const res = await fetch('/api/login', {
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
      await fetch('/api/logout', {
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

  console.log('*** loading -->', loading)
  console.log('*** isAuthenticated -->', isAuthenticated)
  console.log('*** user -->', user)


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
