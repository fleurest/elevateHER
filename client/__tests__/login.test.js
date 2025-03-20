import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/components/Login';

test('creates login form and verifies submission', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  
  const usernameInput = screen.getByPlaceholderText(/username/i);
  const passwordInput = screen.getByPlaceholderText(/password/i);
  const submitButton = screen.getByRole('button', { name: /login/i });

  fireEvent.change(usernameInput, { target: { value: 'testuser' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.click(submitButton);

  expect(usernameInput.value).toBe('testuser');
  expect(passwordInput.value).toBe('password123');
});
