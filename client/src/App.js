import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HamburgerMenu from './components/HamburgerMenu';
import Home from './components/Home';
import Profile from './components/Profile';
import Search from './components/Search';

function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/session', { credentials: 'include' });
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
        setIsLoading(false); //
      }
    }
    checkSession();
  }, []);


  const handleLogin = async (username, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsAuthenticated(true);
        navigate('/home');
      } else {
        console.error('Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
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

  return (
    <>
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
          element={isAuthenticated ? <Home handleLogout={handleLogout}  user={user} /> : <Navigate to="/login" replace />} />
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

    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
