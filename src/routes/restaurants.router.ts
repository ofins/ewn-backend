import express, { Request, Response } from 'express';
import {
  CreateRestaurantUser,
  validateCreateRestaurantSchema,
  validateCreateRestaurantUserSchema,
  validateUpdateRestaurantSchema,
} from 'src/db/restaurants/restaurants.schema';
import { authenticateAPIKey } from 'src/middleware/auth';
import { restaurantRepository, restaurantUserRepository } from 'src/server';

const router = express.Router();

router.post(
  '/',
  authenticateAPIKey,
  validateCreateRestaurantSchema,
  (req: Request, res: Response) => {
    restaurantRepository
      .createRestaurant(req.body)
      .then((data) => res.send(data))
      .catch((error) => {
        console.log(`Error creating restaurant: ${error}`);
        res.status(500).send({ error: `Internal Server Error` });
      });
  }
);

router.put(
  '/:id',
  authenticateAPIKey,
  validateUpdateRestaurantSchema,
  (req: Request, res: Response) => {
    const { id } = req.params;
    restaurantRepository
      .updateRestaurant(Number(id), req.body)
      .then((data) => res.send(data))
      .catch((error) => {
        console.log(`Error updating restaurant: ${error}`);
        res.status(500).send({ error: `Internal Server Error` });
      });
  }
);

router.delete('/:id', authenticateAPIKey, (req: Request, res: Response) => {
  const { id } = req.params;
  restaurantRepository
    .deleteRestaurant(Number(id))
    .then((data) => res.send(data))
    .catch((error) => {
      console.log(`Error deleting restaurant: ${error}`);
      res.status(500).send({ error: `Internal Server Error` });
    });
});

router.post(
  '/user',
  authenticateAPIKey,
  validateCreateRestaurantUserSchema,
  (req: Request, res: Response) => {
    const data: CreateRestaurantUser = {
      user_id: req.body.user_id,
      restaurant_id: req.body.restaurant_id,
      upvoted: req.body.upvoted,
      downvoted: req.body.downvoted,
      favorited: req.body.favorited,
      rating: req.body.rating,
      comment: req.body.comment,
      visited_at: req.body.visited_at,
    };

    restaurantUserRepository
      .addRelationship(data)
      .then((data) => res.send(data))
      .catch((error) => {
        console.log(`Error adding relationship: ${error}`);
        res.status(500).send({ error: `Internal Server Error` });
      });
  }
);

export default router;

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     description: Creates a new restaurant. Requires API key authentication.
 *     tags:
 *       - Restaurants
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRestaurantSchema'
 *     responses:
 *       200:
 *         description: Restaurant created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 *
 * /restaurants/{id}:
 *   put:
 *     summary: Update a restaurant
 *     description: Updates a restaurant by ID. Requires API key authentication.
 *     tags:
 *       - Restaurants
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRestaurantSchema'
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal Server Error
 *   delete:
 *     summary: Delete a restaurant
 *     description: Deletes a restaurant by ID. Requires API key authentication.
 *     tags:
 *       - Restaurants
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal Server Error
 *
 * /restaurants/user:
 *   post:
 *     summary: Add or update user-restaurant relationship
 *     description: Adds or updates a relationship between a user and a restaurant (e.g., upvote, favorite, comment). Requires API key authentication.
 *     tags:
 *       - Restaurants
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRestaurantUserSchema'
 *     responses:
 *       200:
 *         description: Relationship added/updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
