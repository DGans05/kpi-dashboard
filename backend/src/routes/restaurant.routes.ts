/**
 * Restaurant Routes
 * Express router for restaurant management endpoints
 */

import { Router } from 'express';
import * as restaurantController from '../controllers/restaurant.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// Get all restaurants (admin only)
router.get('/', authenticate, authorize(['admin']), restaurantController.getAllRestaurants);

// Get single restaurant (admin can view any, manager can view own)
router.get('/:id', authenticate, restaurantController.getRestaurantById);

// Admin-only routes
router.post('/', authenticate, authorize(['admin']), restaurantController.createRestaurant);
router.patch('/:id', authenticate, authorize(['admin']), restaurantController.updateRestaurant);
router.delete('/:id', authenticate, authorize(['admin']), restaurantController.deleteRestaurant);

export { router };
