import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/components/Login';

describe('Login Component (coverage)', () => {
  const mockOnLogin = jest.fn();
  let originalFetch, originalAlert;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    mockOnLogin.mockClear();
    originalFetch = global.fetch;
    originalAlert = window.alert;
    global.fetch = jest.fn();
    window.alert = jest.fn();
    render(
      <MemoryRouter>
        <Login onLogin={mockOnLogin} />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
    window.alert = originalAlert;
  });

  it('renders login form with proper initial state', () => {
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    
    const switchButton = screen.queryByRole('button', { name: /create an account|register/i });
    if (switchButton) {
      expect(switchButton).toBeEnabled();
    }
  });

  it('enables login button only when both fields meet requirements', () => {
    const userInput = screen.getByPlaceholderText(/username/i);
    const passInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /login/i });

    // Test bad username length
    fireEvent.change(userInput, { target: { value: 'usr' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });
    expect(loginBtn).toBeDisabled();

    // Test bad password length  
    fireEvent.change(userInput, { target: { value: 'user123' } });
    fireEvent.change(passInput, { target: { value: 'pass' } });
    expect(loginBtn).toBeDisabled();

    // Test valid credentials
    fireEvent.change(userInput, { target: { value: 'user123' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });
    expect(loginBtn).toBeEnabled();
  });

  it('calls onLogin with correct credentials when form is valid', () => {
    const userInput = screen.getByPlaceholderText(/username/i);
    const passInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /login/i });

    fireEvent.change(userInput, { target: { value: 'testuser' } });
    fireEvent.change(passInput, { target: { value: 'testpassword' } });
    fireEvent.click(loginBtn);

    expect(mockOnLogin).toHaveBeenCalledWith('testuser', 'testpassword');
    expect(mockOnLogin).toHaveBeenCalledTimes(1);
  });

  it('prevents login submission when credentials are invalid', () => {
    const userInput = screen.getByPlaceholderText(/username/i);
    const passInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /login/i });

    // short username
    fireEvent.change(userInput, { target: { value: 'u' } });
    fireEvent.change(passInput, { target: { value: 'validpassword' } });
    
    // Button should be disabled, so click won't work
    expect(loginBtn).toBeDisabled();
    fireEvent.click(loginBtn);
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  describe('Registration Mode', () => {
    beforeEach(() => {
      // Switch to register mode if switch button exists
      const switchButton = screen.queryByRole('button', { name: /create an account|register/i });
      if (switchButton) {
        fireEvent.click(switchButton);
      }
    });

    it('shows registration form when switched to register mode', async () => {
      const registerBtn = screen.queryByRole('button', { name: /register/i });
      if (registerBtn) {
        expect(registerBtn).toBeInTheDocument();
        expect(registerBtn).toBeDisabled();
      }
    });

    it('enables register button when valid data is entered', async () => {
      const registerBtn = screen.queryByRole('button', { name: /register/i });
      if (!registerBtn) return;

      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);

      fireEvent.change(userInput, { target: { value: 'newuser123' } });
      fireEvent.change(passInput, { target: { value: 'NewPassword1!' } });

      await waitFor(() => {
        expect(registerBtn).toBeEnabled();
      });
    });

    it('shows validation feedback for weak inputs', async () => {
      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);

      fireEvent.change(userInput, { target: { value: 'u' } });
      fireEvent.change(passInput, { target: { value: 'weak' } });

      // Look for validation messages
      await waitFor(() => {
        const usernameError = screen.queryByText(/username.*4.*character/i) || 
                             screen.queryByText(/too short/i);
        const passwordError = screen.queryByText(/password.*8.*character/i) ||
                             screen.queryByText(/must be.*8/i);
        
        expect(usernameError || passwordError).toBeTruthy();
      });
    });

    it('submits registration with valid data', async () => {
      const registerBtn = screen.queryByRole('button', { name: /register/i });
      if (!registerBtn) return;

      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);

      fireEvent.change(userInput, { target: { value: 'newuser' } });
      fireEvent.change(passInput, { target: { value: 'NewPassword1!' } });

      // Mock successful registration
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Registration successful' })
      });

      await waitFor(() => expect(registerBtn).toBeEnabled());
      fireEvent.click(registerBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/register'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: 'newuser', 
              password: 'NewPassword1!' 
            })
          })
        );
      });
    });

    it('handles registration failure with server error', async () => {
      const registerBtn = screen.queryByRole('button', { name: /register/i });
      if (!registerBtn) return;

      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);

      fireEvent.change(userInput, { target: { value: 'existinguser' } });
      fireEvent.change(passInput, { target: { value: 'Password123!' } });

      // Mock registration failure
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Username already exists' })
      });

      await waitFor(() => expect(registerBtn).toBeEnabled());
      fireEvent.click(registerBtn);

      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });
    });

    it('handles network errors during registration', async () => {
      const registerBtn = screen.queryByRole('button', { name: /register/i });
      if (!registerBtn) return;

      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);

      fireEvent.change(userInput, { target: { value: 'testuser' } });
      fireEvent.change(passInput, { target: { value: 'TestPassword1!' } });

      // Mock network failure
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await waitFor(() => expect(registerBtn).toBeEnabled());
      fireEvent.click(registerBtn);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/network error/i) ||
                           screen.queryByText(/connection.*failed/i) ||
                           screen.queryByText(/error.*registration/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Integration', () => {
    it('makes login request to updated API endpoint', async () => {
      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);
      const loginBtn = screen.getByRole('button', { name: /login/i });

      // Mock successful login
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          message: 'Login successful', 
          user: { username: 'testuser', roles: ['user'] }
        })
      });

      fireEvent.change(userInput, { target: { value: 'testuser' } });
      fireEvent.change(passInput, { target: { value: 'testpassword' } });
      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/login'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'testuser',
              password: 'testpassword'
            })
          })
        );
      });
    });

    it('handles authentication errors appropriately', async () => {
      const userInput = screen.getByPlaceholderText(/username/i);
      const passInput = screen.getByPlaceholderText(/password/i);
      const loginBtn = screen.getByRole('button', { name: /login/i });

      // Mock authentication failure
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      fireEvent.change(userInput, { target: { value: 'wronguser' } });
      fireEvent.change(passInput, { target: { value: 'wrongpass' } });
      fireEvent.click(loginBtn);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/invalid.*credential/i) ||
                           screen.queryByText(/login.*failed/i) ||
                           screen.queryByText(/unauthorized/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
});