import { body, validationResult } from 'express-validator';

export const validatePerson = [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('nationality').optional().trim().escape(),
  body('gender').optional().isIn(['Female', 'Male', 'Other']),
  body('profileImage').optional().isURL(),
  body('birthDate').optional().isISO8601(),
  body('roles').optional().isArray(),
  body('primaryRole').optional().trim().escape(),
  body('sport').optional().trim().escape(),
  body('email')
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Must be a valid email')
  .normalizeEmail(),
];

export const validateRegistration = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 4 }).withMessage('Username must be at least 4 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/)
    .withMessage('Password must include a letter, number, and symbol'),
];

export const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

export function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}