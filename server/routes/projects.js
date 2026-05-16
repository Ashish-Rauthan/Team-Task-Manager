const express = require('express');
const router  = express.Router();

const { requireAuth }                          = require('../middleware/auth');
const { requireRole, requireProjectRole,
        requireProjectMembership }             = require('../middleware/roles');
const { projectRules, validate }               = require('../middleware/validate');
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getMembers, addMember, updateMemberRole, removeMember, getActivity
} = require('../controllers/projectController');

// All project routes require auth
router.use(requireAuth);

// ── Project CRUD ──────────────────────────────────────────────────────────────
router.get('/',    getProjects);
router.post('/',   requireRole('admin', 'manager'), projectRules, validate, createProject);
router.get('/:id', requireProjectMembership, getProject);
router.patch('/:id',
  requireProjectRole('manager'), projectRules, validate, updateProject);

// Admins can delete ANY project regardless of membership.
// Project managers can delete projects they manage.
router.delete('/:id',
  (req, res, next) => {
    if (req.profile?.role === 'admin') return next();
    requireProjectRole('manager')(req, res, next);
  },
  deleteProject
);

// ── Members ───────────────────────────────────────────────────────────────────
router.get('/:projectId/members',
  requireProjectMembership, getMembers);

// Admins AND project managers can add/update/remove members
router.post('/:projectId/members',
  requireProjectRole('manager'), addMember);
router.patch('/:projectId/members/:memberId',
  requireProjectRole('manager'), updateMemberRole);
router.delete('/:projectId/members/:memberId',
  requireProjectRole('manager'), removeMember);

// ── Activity ──────────────────────────────────────────────────────────────────
router.get('/:projectId/activity',
  requireProjectMembership, getActivity);

module.exports = router;