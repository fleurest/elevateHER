import React, { useState } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );
  const handleLogin = (username) => {
    // stored
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify({ username }));
    setIsAuthenticated(true);
    console.log(`${username} logged in`);
    navigate('/profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
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
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/search" element={<Search />} />
        <Route
          path="/profile"
          element={
            isAuthenticated
              ? (
                <Profile
                  username={JSON.parse(localStorage.getItem('user') || '{}').username}
                  handleLogout={handleLogout}
                />
              )
              : <Navigate to="/login" />
          }
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/home"
          element={isAuthenticated ? <Home /> : <Navigate to="/home" />}
        />
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
