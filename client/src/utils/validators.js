const { body, validationResult } = require('express-validator');

const validatePerson = [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('nationality').optional().trim().escape(),
  body('gender').optional().isIn(['Female', 'Male', 'Other']),
  body('profileImage').optional().isURL(),
  body('birthDate').optional().isISO8601(),
  body('roles').optional().isArray(),
  body('primaryRole').optional().trim().escape(),
  body('sport').optional().trim().escape(),
];

// runs as a final check
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validatePerson,
  checkValidation
};
