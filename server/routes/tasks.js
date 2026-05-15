const express = require('express');
const router  = express.Router();

const { requireAuth }                       = require('../middleware/auth');
const { requireProjectMembership,
        requireProjectRole }                = require('../middleware/roles');
const { taskRules, validate }               = require('../middleware/validate');
const {
  getTasks, getMyTasks, getTask, createTask, updateTask,
  updateTaskStatus, deleteTask, addComment, deleteComment, getDashboard
} = require('../controllers/taskController');

router.use(requireAuth);

// ── Cross-project routes ──────────────────────────────────────────────────────
router.get('/my',       getMyTasks);
router.get('/dashboard', getDashboard);

// ── Per-project task routes ───────────────────────────────────────────────────
router.get('/:projectId/tasks',
  requireProjectMembership, getTasks);

router.post('/:projectId/tasks',
  requireProjectMembership, taskRules, validate, createTask);

router.get('/:projectId/tasks/:id',
  requireProjectMembership, getTask);

router.patch('/:projectId/tasks/:id',
  requireProjectMembership, taskRules, validate, updateTask);

router.patch('/:projectId/tasks/:id/status',
  requireProjectMembership, updateTaskStatus);

router.delete('/:projectId/tasks/:id',
  requireProjectRole('manager'), deleteTask);

// ── Comments ──────────────────────────────────────────────────────────────────
router.post('/:projectId/tasks/:id/comments',
  requireProjectMembership, addComment);

router.delete('/:projectId/tasks/:taskId/comments/:commentId',
  requireProjectMembership, deleteComment);

module.exports = router;
