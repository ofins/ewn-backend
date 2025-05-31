import express, { Request, Response } from 'express';
import { validateRestaurantFilterOptionsSchema } from 'src/db/restaurants/restaurants.schema';
import { restaurantRepository } from 'src/server';

const router = express.Router();

router.get(
  '/',
  validateRestaurantFilterOptionsSchema,
  (req: Request, res: Response) => {
    const {
      longitude,
      latitude,
      radius,
      cuisineType,
      priceRange,
      minRating,
      limit,
      offset,
    } = req.query;

    restaurantRepository
      .getRestaurants({
        longitude: parseFloat(longitude as string),
        latitude: parseFloat(latitude as string),
        radius: parseFloat(radius as string), // Default 5km radius
        cuisineType: typeof cuisineType === 'string' ? cuisineType : undefined,
        priceRange: priceRange === 'string' ? priceRange : undefined,
        minRating: parseFloat(minRating as string),
        limit: parseFloat(limit as string),
        offset: parseFloat(offset as string),
      })
      .then((data) => {
        res.send(data);
      })
      .catch((error) => {
        console.log(`Error fetching restaurants:${error}`);
        res.status(500).send({ error: 'Internal Server Error' });
      });
  }
);

export default router;

/**
 * @swagger
 * /feed:
 *   get:
 *     summary: Get restaurants feed
 *     description: Returns a paginated list of restaurants for the daily feed, filtered by location and other criteria.
 *     tags:
 *       - Feed
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         required: false
 *         description: Longitude for location-based search
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         required: false
 *         description: Latitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         required: false
 *         description: Search radius in kilometers
 *       - in: query
 *         name: cuisineType
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by cuisine type
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by price range
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         required: false
 *         description: Minimum rating
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *         required: false
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: A paginated list of restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RestaurantSchema'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
