import bcrypt from 'bcrypt';
import express, { Request, Response } from 'express';
import {
  validateCreateUser,
  validateUserLogin,
} from 'src/db/users/users.schema';
import { signToken } from 'src/middleware/auth';
import { usersRepository } from 'src/server';

const router = express.Router();

router.post('/login', validateUserLogin, (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  usersRepository
    .getUserByEmail(email)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      return bcrypt.compare(password, user.password_hash).then((valid) => {
        if (!valid) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
        const token = signToken({ user_id: user.id });
        res.json({
          data: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            is_active: user.is_active,
            is_verified: user.is_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          token,
        });
      });
    })
    .catch((error) => {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

router.post(
  '/register',
  validateCreateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, username, password, full_name } = req.body;

      if (!email || !username || !password) {
        res.status(400).json({ error: 'Missing info' });
        return;
      }

      const user = await usersRepository.getUserByEmail(email);
      if (user) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await usersRepository.createUser({
        email,
        username,
        password_hash: passwordHash,
        full_name,
      });

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns a JWT token.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, returns user and JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 *
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: password123
 *               full_name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing or invalid registration info
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
