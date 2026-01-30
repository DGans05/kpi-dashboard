/**
 * User Routes
 * Express router for user management endpoints
 */

import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// Admin-only routes
router.get('/', authenticate, authorize(['admin']), userController.getAllUsers);
router.get('/:id', authenticate, authorize(['admin']), userController.getUserById);
router.post('/', authenticate, authorize(['admin']), userController.createUser);
router.patch('/:id', authenticate, authorize(['admin']), userController.updateUser);
router.delete('/:id', authenticate, authorize(['admin']), userController.deleteUser);

// Self-service route (any authenticated user)
router.post('/change-password', authenticate, userController.changePassword);

export { router };
