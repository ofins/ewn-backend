import { isUUID } from 'src/utils/misc';
import { PaginatedResponse, paginateResponse } from 'src/utils/pagination';
import BaseRepository from '../base.repo';
import seed from './seed.json';
import { CreateUserDBSchema, IUser, UserFilterOptions } from './users.schema';

const TABLE_NAME = 'users';
export class UsersRepository extends BaseRepository {
  constructor(
    config = {
      connectionString: process.env.DATABASE_URL || '',
    }
  ) {
    super(config.connectionString, TABLE_NAME);
    this.config = config;

    this.initializeDatabase().then(() => this.verifyDatabaseStructure());
  }

  protected async createTable(): Promise<void> {
    try {
      await this.db.none(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(32) UNIQUE,
          password_hash TEXT,
          full_name VARCHAR(100),
          avatar_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        `);

      const existingData = await this.db.oneOrNone(
        `SELECT COUNT(*) FROM ${TABLE_NAME}`
      );

      if (existingData && parseInt(existingData.count) > 0) {
        console.log(
          'Users table already contains data, skipping seed data insertion'
        );
        return;
      }

      // seed
      await this.seedData();
    } catch (error) {
      console.error('Failed to create users table:', error);
      throw error;
    }
  }

  public async seedData(): Promise<void> {
    this.db.tx((t) => {
      const queries = seed.map((user) => {
        return t.none(
          `
          INSERT INTO ${TABLE_NAME} (
            id, email, username, password_hash, full_name,
            avatar_url, is_active, is_verified, created_at, updated_at
          ) VALUES (
            $<id>, $<email>, $<username>, $<password_hash>, $<full_name>,
            $<avatar_url>, $<is_active>, $<is_verified>, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
          )
          `,
          user
        );
      });
      return t.batch(queries);
    });
  }

  async getUserById(id: string) {
    try {
      if (!isUUID(id)) {
        throw new Error('Invalid user ID');
      }

      return await this.db.oneOrNone<IUser>(
        `SELECT id, email, username, full_name, 
          avatar_url, is_active, is_verified, 
          created_at, updated_at FROM ${TABLE_NAME} WHERE id = $1`,
        [id]
      );
    } catch (error) {
      console.error(`Error fetching user by ID ${id}:`, error);
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await this.db.oneOrNone<IUser>(
        `SELECT * FROM ${TABLE_NAME} WHERE email = $1`,
        [email]
      );
    } catch (error) {
      console.error(`Error fetching user by email ${email}:`, error);
    }
  }

  async getUsers(
    options: UserFilterOptions
  ): Promise<PaginatedResponse<IUser>> {
    try {
      const { full_name, limit, offset } = options;

      let query = `
      SELECT * FROM users
      `;

      if (full_name) {
        query += `
        AND full_name = $${full_name}
        `;
      }

      const params: unknown[] = [];
      let paramIndex = 1;

      if (limit > 0) {
        query += `LIMIT $${paramIndex++}`;
        params.push(limit);
      }

      if (offset > 0) {
        query += `OFFSET $${paramIndex++}`;
        params.push(offset);
      }

      const data = await this.db.any<IUser>(query, params);
      const total = await this.db.one(
        'SELECT COUNT(*) FROM users',
        [],
        (row) => +row.count
      );

      return paginateResponse<IUser>(
        data,
        total,
        Number.isInteger(limit) ? limit : 10,
        Number.isInteger(offset) ? offset : 0
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async createUser(data: CreateUserDBSchema) {
    try {
      const now = new Date();
      return await this.db.one<IUser>(
        `INSERT INTO ${TABLE_NAME} (
          email, username, password_hash, full_name, avatar_url,
          is_active, is_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *`,
        [
          data.email,
          data.username,
          data.password_hash,
          data.full_name,
          '', // avatar_url default
          true, // is_active default
          false, // is_verified default
          now, // created_at
          now, // updated_at
        ]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}
