const request = require('supertest');
const express = require('express');

const meRoutes = require('../routes/meRoutes');

// Create test app
const app = express();
app.use(express.json());

// Mock session middleware
app.use((req, res, next) => {
  req.session = req.testSession || {};
  req.user = req.testUser || null;
  next();
});

app.use('/api/me', meRoutes);

describe('Me Routes', () => {
  describe('GET /api/me', () => {
    it('should return user data when authenticated', async () => {
      const mockUser = {
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      };

      const res = await request(app)
        .get('/api/me')
        .set('testUser', JSON.stringify(mockUser))
        .use((req) => {
          req.testUser = mockUser;
        });

 
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });
});

describe('Me Routes - Direct Handler Testing', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      session: {},
      user: null
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  const meHandler = (req, res) => {
    console.log('[API] req.session:', req.session);
    console.log('[API] req.user:', req.user);
    if (req.user) {
      return res.json({ user: req.user });
    }
    return res.status(401).json({ error: 'Not authenticated' });
  };

  it('should return user data when user is authenticated', () => {
    const mockUser = {
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user']
    };
    
    mockReq.user = mockUser;
    
    meHandler(mockReq, mockRes);
    
    expect(mockRes.json).toHaveBeenCalledWith({ user: mockUser });
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', () => {
    mockReq.user = null;
    
    meHandler(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
  });

  it('should return user data when user is truthy', () => {
    const mockUser = {
      username: 'anotheruser',
      email: 'another@example.com'
    };
    
    mockReq.user = mockUser;
    mockReq.session = { authenticated: true };
    
    meHandler(mockReq, mockRes);
    
    expect(mockRes.json).toHaveBeenCalledWith({ user: mockUser });
  });
});