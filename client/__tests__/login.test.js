import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/components/Login';

describe('Login Component (full coverage)', () => {
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

  it('renders inputs, login/register buttons & switch link disabled initially', () => {
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /create an account/i })).toBeEnabled();
  });

  it('enables Login only when username ≥4 and password ≥8', () => {
    const userIn = screen.getByPlaceholderText(/username/i);
    const passIn = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /login/i });

    fireEvent.change(userIn, { target: { value: 'usr' } });
    fireEvent.change(passIn, { target: { value: 'pass123' } });
    expect(loginBtn).toBeDisabled();

    fireEvent.change(userIn, { target: { value: 'user1' } });
    fireEvent.change(passIn, { target: { value: 'password!' } });
    expect(loginBtn).toBeEnabled();
  });

  it('blocks login and shows error if username too short', () => {
    const userIn = screen.getByPlaceholderText(/username/i);
    const passIn = screen.getByPlaceholderText(/password/i);
    fireEvent.change(userIn, { target: { value: 'usr' } });
    fireEvent.change(passIn, { target: { value: 'password!' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('calls onLogin correctly when credentials valid', () => {
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'validUser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'validPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(mockOnLogin).toHaveBeenCalledTimes(1);
    expect(mockOnLogin).toHaveBeenCalledWith('validUser', 'validPass1!');
  });

  it('toggles to Register mode, shows live feedback and enables Register button', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    const userIn = screen.getByPlaceholderText(/username/i);
    const passIn = screen.getByPlaceholderText(/password/i);
    const regBtn = screen.getByRole('button', { name: /register/i });

    expect(regBtn).toBeDisabled();

    // Weak input first
    fireEvent.change(userIn, { target: { value: 'usr' } });
    fireEvent.change(passIn, { target: { value: 'short' } });
    expect(await screen.findByText(/must be at least 4 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/must be at least 8 characters/i)).toBeInTheDocument();

    // Now valid inputs
    fireEvent.change(userIn, { target: { value: 'user1' } });
    fireEvent.change(passIn, { target: { value: 'Password1!' } });

    expect(await screen.findByText(/username looks good/i)).toBeInTheDocument();
    expect(regBtn).toBeEnabled();
  });

  it('shows strong password feedback when valid password entered in Register mode', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));

    const passwordInput = screen.getByPlaceholderText(/password/i);

    fireEvent.change(passwordInput, { target: { value: 'Weak1' } });

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: 'StrongPass1!' } });
  });

  it('submits registration and handles success', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'Newpass1!' } });

    global.fetch.mockResolvedValueOnce({ ok: true });

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/register'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newuser', password: 'Newpass1!' })
      })
    ));

    expect(window.alert).toHaveBeenCalledWith('Registration successful! Please log in.');
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('displays server error on registration failure', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'Password1!' } });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Username already exists' })
    });

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByText(/username already exists/i)).toBeInTheDocument();
  });

  it('displays network error on registration fetch rejection', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'Password1!' } });

    global.fetch.mockRejectedValueOnce(new Error('Network fail'));

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByText(/network error during registration/i)).toBeInTheDocument();
  });
});
