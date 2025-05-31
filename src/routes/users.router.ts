import express, { Request, Response } from 'express';
import { authenticateAPIKey, authenticateToken } from 'src/middleware/auth';
import { usersRepository } from 'src/server';

const router = express.Router();

// * Internal
router.get('/', authenticateAPIKey, (req: Request, res: Response) => {
  const { limit, offset } = req.query;

  usersRepository
    .getUsers({
      limit: parseFloat(limit as string),
      offset: parseFloat(offset as string),
    })
    .then((data) => {
      res.send(data);
    })
    .catch((error) => {
      console.log(`Error fetching users:${error}`);
      res.status(500).send({ error: 'Internal Server Error' });
    });
});

// * Public
router.get('/profile', authenticateToken, (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (req as any).userId;
  console.log(userId);

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  usersRepository
    .getUserById(userId)
    .then((user) => {
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ data: user });
    })
    .catch((error) => {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

export default router;

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (internal)
 *     description: Returns a paginated list of all users. Requires API key authentication.
 *     tags:
 *       - Users
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: Number of users to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *         required: false
 *         description: Number of users to skip
 *     responses:
 *       200:
 *         description: A paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
 *
 * /users/profile:
 *   get:
 *     summary: Get current user's profile
 *     description: Returns the profile of the currently authenticated user. Requires Bearer token authentication.
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
