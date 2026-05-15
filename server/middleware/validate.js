const { validationResult, body, param } = require('express-validator');

// Run validators and return 422 if any fail
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// ── Auth validators ───────────────────────────────────────────────────────────
const signupRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Invalid role')
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
];

// ── Project validators ────────────────────────────────────────────────────────
const projectRules = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex code')
];

// ── Task validators ───────────────────────────────────────────────────────────
const taskRules = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'in_review', 'done'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('due_date must be ISO 8601 (YYYY-MM-DD)'),
  body('assignee_id').optional().isUUID().withMessage('assignee_id must be UUID')
];

// ── UUID param validator ──────────────────────────────────────────────────────
const uuidParam = (name) =>
  param(name).isUUID().withMessage(`${name} must be a valid UUID`);

module.exports = {
  validate,
  signupRules,
  loginRules,
  projectRules,
  taskRules,
  uuidParam
};
