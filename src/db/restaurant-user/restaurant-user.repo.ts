import BaseRepository from '../base.repo';
import { CreateRestaurantUser } from '../restaurants/restaurants.schema';
import restaurantUserData from './restaurant-user-seed.json';

const TABLE_NAME = 'restaurant_user';

export interface RestaurantUser {
  id: number;
  user_id: number;
  restaurant_id: number;
  upvoted: boolean;
  downvoted: boolean;
  favorited: boolean;
  rating: number | null;
  comment: string | null;
  visited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRestaurantUserData {
  user_id: number;
  restaurant_id: number;
  upvoted?: boolean;
  downvoted?: boolean;
  favorited?: boolean;
  rating?: number;
  comment?: string;
  visited_at?: Date;
}

export class RestaurantUserRepository extends BaseRepository {
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
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            restaurant_id INT NOT NULL,
            upvoted BOOLEAN DEFAULT FALSE,
            downvoted BOOLEAN DEFAULT FALSE,
            favorited BOOLEAN DEFAULT FALSE,
            rating INT CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            visited_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            UNIQUE (user_id, restaurant_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
            CHECK (NOT (upvoted AND downvoted))
          );
            `);
    } catch (error) {
      console.error('Failed to create restaurant_user table:', error);
      throw error;
    }
  }

  public async seedData(): Promise<void> {
    this.db.tx((t) => {
      const queries = restaurantUserData.map((r) => {
        return t.none(
          `
          INSERT INTO ${TABLE_NAME} (
            user_id, restaurant_id, upvoted, downvoted, favorited, rating, comment, visited_at, created_at, updated_at
          ) VALUES (
            $<user_id>, $<restaurant_id>, $<upvoted>, $<downvoted>, $<favorited>, $<rating>, $<comment>, $<visited_at>,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
          ) 
          `,
          r
        );
      });
      return t.batch(queries);
    });
  }

  async addRelationship(data: CreateRestaurantUser): Promise<RestaurantUser> {
    return this.db.one(
      `
    INSERT INTO ${TABLE_NAME} (
      user_id, restaurant_id, upvoted, downvoted, favorited, rating, comment, visited_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
    ON CONFLICT (user_id, restaurant_id) DO UPDATE
    SET
      upvoted = EXCLUDED.upvoted,
      downvoted = EXCLUDED.downvoted,
      favorited = EXCLUDED.favorited,
      rating = EXCLUDED.rating,
      comment = EXCLUDED.comment,
      visited_at = EXCLUDED.visited_at,
      updated_at = now()
    RETURNING *
    `,
      [
        data.user_id,
        data.restaurant_id,
        data.upvoted ?? false,
        data.downvoted ?? false,
        data.favorited ?? false,
        data.rating ?? null,
        data.comment ?? null,
        data.visited_at ?? null,
      ]
    );
  }

  async getRestaurantsForUser(userId: number) {
    return this.db.any(`SELECT * FROM ${TABLE_NAME} WHERE user_id = $1`, [
      userId,
    ]);
  }

  async getUsersForRestaurant(restaurantId: number) {
    return this.db.any(`SELECT * FROM ${TABLE_NAME} WHERE restaurant_id = $1`, [
      restaurantId,
    ]);
  }

  async getRestaurantDetails(restaurantId: number) {
    const rows = await this.getUsersForRestaurant(restaurantId);

    const totalUpvotes = rows.filter((r) => r.upvoted).length;
    const totalDownvotes = rows.filter((r) => r.downvoted).length;
    const totalFavorites = rows.filter((r) => r.favorited).length;
    const ratings = rows
      .map((r) => r.rating)
      .filter((r) => typeof r === 'number') as number[];
    const averageRating = ratings.length
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;
    const comments = rows
      .filter((r) => r.comment)
      .map((r) => ({ user_id: r.user_id, comment: r.comment }));

    return {
      restaurant_id: restaurantId,
      totalUpvotes,
      totalDownvotes,
      totalFavorites,
      averageRating,
      comments,
      userCount: rows.length,
      users: rows,
    };
  }
}
