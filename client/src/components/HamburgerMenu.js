import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';

const handleLogout = () => {
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('user');
  setIsAuthenticated(false);
  navigate('/login');
};

function HamburgerMenu({handleLogout}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="hamburger-menu">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          fontSize: '24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <FaBars />
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '0',
            background: 'white',
            padding: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          }}
        >
          <Link to="/" style={{ display: 'block', padding: '10px' }}>
            Profile
          </Link>
          <Link to="/home" style={{ display: 'block', padding: '10px' }}>
            Home
          </Link>
          <Link to="/dashboard" style={{ display: 'block', padding: '10px' }}>
            Dashboard
          </Link>
          <Link
            to="/login"
            onClick={() => {/*TODO*/}}
            style={{
              display: "block",
              padding: "10px",
              color: "red",
              textDecoration: "none",
            }}
          >
            Logout
          </Link>
        </div>
      )}
    </div>
  );
}

export default HamburgerMenu;
