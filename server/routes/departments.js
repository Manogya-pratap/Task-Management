const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Protect all routes
router.use(protect);

// Get all departments (all authenticated users)
router.get('/', departmentController.getAllDepartments);

// Create new department (ADMIN/MD only)
router.post('/', checkRole('ADMIN', 'MD'), departmentController.createDepartment);

// Get department by name
router.get('/name/:name', departmentController.getDepartmentByName);

// Get single department
router.get('/:id', departmentController.getDepartment);

// Update department (ADMIN/MD only)
router.patch('/:id', checkRole('ADMIN', 'MD'), departmentController.updateDepartment);

// Delete department (ADMIN/MD only)
router.delete('/:id', checkRole('ADMIN', 'MD'), departmentController.deleteDepartment);

// Get department users
router.get('/:id/users', departmentController.getDepartmentUsers);

// Get department projects
router.get('/:id/projects', departmentController.getDepartmentProjects);

// Get department statistics
router.get('/:id/stats', departmentController.getDepartmentStats);

module.exports = router;
