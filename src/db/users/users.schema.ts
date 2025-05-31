import { NextFunction, Request, Response } from 'express';
import { paginationSchema } from 'src/utils/schema';
import z from 'zod';

// * Schemas
export const userSchema = z.object({
  id: z.string().uuid().describe('uuid for the user'),
  email: z.string().email().describe('Email address of the user'),
  username: z.string().describe('Username of the user'),
  password_hash: z
    .string()
    .describe('Hashed password of the user, stored securely'),
  full_name: z.string().optional().describe('Full name of the user'),
  avatar_url: z
    .string()
    .url()
    .optional()
    .describe("URL of the user's avatar image"),
  is_active: z
    .boolean()
    .default(true)
    .describe('Indicates if the user account is active'),
  is_verified: z
    .boolean()
    .default(false)
    .describe('Indicates if the user has verified their email'),
  created_at: z.date().describe('Timestamp when the user was created'),
  updated_at: z
    .date()
    .optional()
    .describe('Timestamp when the user was last updated'),
});

export const userFilterOptionsSchema = paginationSchema.extend({
  email: z.string().email().optional(),
  username: z.string().optional(),
  full_name: z.string().optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  full_name: z.string().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type CreateUserDBSchema = {
  email: string;
  username: string;
  password_hash: string; // Hashed password
  full_name?: string; // Optional full name
};

export const validateCreateUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    createUserSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: error instanceof z.ZodError ? error.errors : 'Invalid request',
    });
  }
};

export const validateUserLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    userLoginSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: error instanceof z.ZodError ? error.errors : 'Invalid request',
    });
  }
};

// * Types
export type CreateUser = z.infer<typeof createUserSchema>;
export type UserFilterOptions = z.infer<typeof userFilterOptionsSchema>;
export type IUser = z.infer<typeof userSchema>;
