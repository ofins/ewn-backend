import dotenv from 'dotenv';
import cron from 'node-cron';
import {
  DEFAULT_LIMIT,
  DEFAULT_RADIUS_KM,
  MAX_SEARCH_RADIUS,
} from 'src/config';
import { PaginatedResponse, paginateResponse } from 'src/utils/pagination';
import BaseRepository from '../base.repo';
import { CreateRestaurant, UpdateRestaurant } from './restaurants.schema';
import {
  CreateRestaurantData,
  IRestaurant,
  RestaurantFilterOptions,
  RestaurantsRepositoryConfig,
} from './restaurants.type';
import restaurantData from './seed.json';

dotenv.config();

const TABLE_NAME = 'restaurants';

export class RestaurantsRepository extends BaseRepository<RestaurantsRepositoryConfig> {
  constructor(
    config: RestaurantsRepositoryConfig = {
      connectionString: process.env.DATABASE_URL || '',
      maxSearchRadius: MAX_SEARCH_RADIUS,
      defaultLimit: DEFAULT_LIMIT,
    }
  ) {
    super(config.connectionString, TABLE_NAME);
    this.config = config;

    this.initializeDatabase()
      .then(() => this.verifyDatabaseStructure())
      .then(() => this.createRestaurantDailyFeed())
      .then(() => this.shuffleRestaurantDailyFeed())
      .then(() => {
        this.aggregateUserData();
        cron.schedule('0 * * * *', async () => {
          try {
            this.aggregateUserData();
          } catch (error) {
            console.error('Error running CRON in restaurantRepo:', error);
          }
        });
      })
      // .then(() => {
      //   cron.schedule('0 0 * * *', async () => {
      //     console.log('Running daily restaurant shuffle...');
      //     this.shuffleRestaurantDailyFeed();
      //   });
      // })
      .catch((error) => {
        console.error('Error initializing database:', error);
      });
  }

  protected async createTable(): Promise<void> {
    try {
      // Create table with schema
      await this.db.none(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          cuisine_type VARCHAR(100) NOT NULL,
          price_range DECIMAL(3, 2) NOT NULL CHECK (price_range >= 0 AND price_range <= 5),
          rating DECIMAL(3, 2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
          longitude DECIMAL(11, 8) NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          open_hours TEXT,
          contact_info TEXT,
          total_upvotes INT DEFAULT 0,
          total_downvotes INT DEFAULT 0,
          total_favorites INT DEFAULT 0,
          total_comments INT DEFAULT 0,
          average_ratings DECIMAL(3, 2) NOT NULL CHECK (average_ratings >=0 AND average_ratings <= 5),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes separately
      await this.db.none(`
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_location ON ${TABLE_NAME} (longitude, latitude);
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_cuisine ON ${TABLE_NAME} (cuisine_type);
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_rating ON ${TABLE_NAME} (rating);
      `);

      // Check if data already exists before inserting
      const existingData = await this.db.oneOrNone(
        `SELECT COUNT(*) FROM ${TABLE_NAME}`
      );
      if (existingData && parseInt(existingData.count) > 0) {
        console.log(
          'Restaurants table already contains data, skipping seed data insertion'
        );
        return;
      }
      // Seed data in a separate method for better organization
      await this.seedData();

      console.log('Restaurants table created and seeded successfully');
    } catch (error) {
      console.error('Failed to create restaurants table:', error);
      throw error;
    }
  }

  public async seedData(): Promise<void> {
    // Use a transaction for bulk insert
    this.db.tx(async (t) => {
      const queries = restaurantData.map((restaurant) => {
        return t.none(
          `
          INSERT INTO ${TABLE_NAME} (
            name, address, cuisine_type, price_range, rating,
            longitude, latitude, open_hours, contact_info,
            total_upvotes, total_downvotes, total_favorites, total_comments, average_ratings,
            created_at, updated_at
          ) VALUES (
            $<name>, $<address>, $<cuisine_type>, $<price_range>, $<rating>,
            $<longitude>, $<latitude>, $<open_hours>, $<contact_info>,
            $<total_upvotes>, $<total_downvotes>, $<total_favorites>, $<total_comments>, $<average_ratings>,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `,
          restaurant
        );
      });

      return t.batch(queries);
    });
  }

  async getRestaurantById(id: number) {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid restaurant ID');
      }

      return await this.db.oneOrNone<IRestaurant>(
        `SELECT * FROM ${TABLE_NAME} WHERE id = $1`,
        [id]
      );
    } catch (error) {
      console.error(`Error fetching restaurant by ID ${id}:`, error);
    }
  }

  /**
   * Get restaurants by location within a radius
   * @param options Filter options for the search
   * @returns Array of restaurants matching the criteria
   */
  async getRestaurants(
    options: RestaurantFilterOptions = {}
  ): Promise<PaginatedResponse<IRestaurant>> {
    try {
      // Validate inputs
      const {
        longitude,
        latitude,
        radius = DEFAULT_RADIUS_KM,
        cuisineType,
        priceRange,
        minRating = 0,
        limit = this.config.defaultLimit,
        offset = 0,
      } = options;

      if (minRating < 0 || minRating > 5) {
        throw new Error('Rating must be between 0 and 5.');
      }

      if (radius > this.config.maxSearchRadius) {
        throw new Error(
          `Search radius cannot exceed ${this.config.maxSearchRadius}`
        );
      }

      // Build query based on provided filters
      let query = `
      SELECT r.*
      FROM restaurant_daily_feed f
      JOIN restaurants r on r.id = f.restaurant_id
      WHERE f.date = current_date
    `;
      const params: unknown[] = [];
      let paramIndex = 1;

      // If location is provided, search by proximity
      if (longitude !== undefined && latitude !== undefined) {
        // Use Haversine formula to calculate distance
        query += `
        AND (
          6371 * acos(
            cos(radians($${paramIndex++})) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians($${paramIndex++})) +
            sin(radians($${paramIndex++})) *
            sin(radians(latitude))
          )
        ) <= $${paramIndex++}
      `;
        params.push(latitude, longitude, latitude, radius);
      }

      if (cuisineType) {
        query += ` AND cuisine_type = $${paramIndex++}`;
        params.push(cuisineType);
      }

      if (priceRange) {
        query += ` AND price_range = $${paramIndex++}`;
        params.push(priceRange);
      }

      if (minRating > 0) {
        query += ` AND rating >= $${paramIndex++}`;
        params.push(minRating);
      }

      query += ' ORDER BY f.position';

      if (limit > 0) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(limit);
      }

      if (offset > 0) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }

      const data = await this.db.any<IRestaurant>(query, params);
      const total = await this.db.one(
        'SELECT COUNT(*) FROM restaurants',
        [],
        (row) => +row.count
      );

      return paginateResponse<IRestaurant>(
        data,
        total,
        // todo: doesn't seem like the best solution but it works
        Number.isInteger(limit) ? limit : 10,
        Number.isInteger(offset) ? offset : 0
      );
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  }

  /**
   * Create a new restaurant
   * @param data Restaurant data
   * @returns Created restaurant
   */
  async createRestaurant(data: CreateRestaurant): Promise<IRestaurant> {
    try {
      this.validateRestaurantData(data);

      return await this.db.one<IRestaurant>(
        `INSERT INTO ${TABLE_NAME} (
          name, address, cuisine_type, price_range, rating,
          longitude, latitude, open_hours, contact_info
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *`,
        [
          data.name,
          data.address,
          data.cuisine_type,
          data.price_range,
          0,
          data.longitude,
          data.latitude,
          data.open_hours || null,
          data.contact_info || null,
        ]
      );
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  }

  /**
   * Update an existing restaurant
   * @param id Restaurant ID
   * @param data Updated restaurant data
   * @returns Updated restaurant or null if not found
   */
  async updateRestaurant(
    id: number,
    data: UpdateRestaurant
  ): Promise<IRestaurant | null> {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid restaurant ID');
      }

      if (Object.keys(data).length === 0) {
        throw new Error('No update data provided');
      }

      // Prepare update query
      const updateColumns: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      // Build update statement dynamically based on provided fields
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updateColumns.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      // Add updated_at timestamp
      updateColumns.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      // Add WHERE clause parameter
      values.push(id);

      const query = `
        UPDATE restaurants
        SET ${updateColumns.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      return await this.db.oneOrNone<IRestaurant>(query, values);
    } catch (error) {
      console.error(`Error updating restaurant with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a restaurant by ID
   * @param id Restaurant ID
   * @returns True if restaurant was deleted, false if not found
   */
  async deleteRestaurant(id: number): Promise<boolean> {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid restaurant ID');
      }
      const result = await this.db.tx(async (t) => {
        const dailyFeedDelete = await t.result(
          `DELETE FROM restaurant_daily_feed WHERE restaurant_id = $1`,
          [id],
          (r) => r.rowCount
        );

        const restaurantDelete = await t.result(
          `DELETE FROM restaurants WHERE id = $1`,
          [id],
          (r) => r.rowCount
        );

        return dailyFeedDelete + restaurantDelete;
      });

      return result > 1;
    } catch (error) {
      console.error(`Error deleting restaurant with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get popular cuisines in the database
   * @param limit Maximum number of cuisine types to return
   * @returns Array of cuisine types with their counts
   */
  async getPopularCuisines(
    limit = 10
  ): Promise<{ cuisine_type: string; count: number }[]> {
    try {
      return await this.db.any(
        `SELECT cuisine_type, COUNT(*) as count
         FROM restaurants
         GROUP BY cuisine_type
         ORDER BY count DESC
         LIMIT $1`,
        [limit]
      );
    } catch (error) {
      console.error('Error fetching popular cuisines:', error);
      throw error;
    }
  }

  /**
   * Get top rated restaurants
   * @param limit Maximum number of restaurants to return
   * @returns Array of top rated restaurants
   */
  async getTopRatedRestaurants(limit = 10): Promise<IRestaurant[]> {
    try {
      return await this.db.any<IRestaurant>(
        'SELECT * FROM restaurants ORDER BY rating DESC LIMIT $1',
        [limit]
      );
    } catch (error) {
      console.error('Error fetching top rated restaurants:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    try {
      await this.db.$pool.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  async createRestaurantDailyFeed() {
    await this.db.none(`
      CREATE TABLE IF NOT EXISTS restaurant_daily_feed (
      date DATE NOT NULL,
      position INT NOT NULL,
      restaurant_id INTEGER NOT NULL,
      PRIMARY KEY (date, position),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    );
      `);
  }

  async shuffleRestaurantDailyFeed(): Promise<void> {
    try {
      await this.db.none(`DELETE FROM restaurant_daily_feed;`);
      await this.db.none(`
        INSERT INTO restaurant_daily_feed (date, position, restaurant_id)
        SELECT current_date, row_number() OVER (ORDER BY RANDOM()), id
        FROM restaurants
        ON CONFLICT (date, position) DO UPDATE
        SET restaurant_id = EXCLUDED.restaurant_id
      `);
    } catch (error) {
      console.error(`Error inserting daily feed:`, error);
    }
  }

  /**
   * Validate restaurant data
   * @param data Restaurant data to validate
   * @private
   */
  private validateRestaurantData(data: CreateRestaurantData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Restaurant name is required');
    }

    if (!data.address || data.address.trim().length === 0) {
      throw new Error('Restaurant address is required');
    }

    if (!data.cuisine_type || data.cuisine_type.trim().length === 0) {
      throw new Error('Cuisine type is required');
    }

    if (!data.price_range || data.price_range < 0 || data.price_range > 5) {
      throw new Error('Price range must be between 0 and 5');
    }

    if (data.rating < 0 || data.rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
  }

  private async aggregateUserData(): Promise<void> {
    try {
      await this.db.none(`
        UPDATE ${TABLE_NAME} r
        SET total_upvotes = (
          SELECT COUNT(*)
          FROM restaurant_user ru
          WHERE ru.restaurant_id = r.id AND ru.upvoted = true
        ),
        total_downvotes = (
          SELECT COUNT(*)
          FROM restaurant_user ru
          WHERE ru.restaurant_id = r.id AND ru.downvoted = true
        ),
        total_favorites = (
          SELECT COUNT(*)
          FROM restaurant_user ru
          WHERE ru.restaurant_id = r.id AND ru.favorited = true
        ),
        total_comments = (
          SELECT COUNT(*)
          FROM restaurant_user ru 
          WHERE ru.restaurant_id = r.id AND comment IS NOT NULL AND ru.comment <> ''
        ),
        average_ratings = (
          SELECT COALESCE(AVG(ru.rating), 0)
          FROM restaurant_user ru
          WHERE ru.restaurant_id = r.id AND ru.rating IS NOT NULL
        )
        `);
      console.log('Users data aggregated successfully');
    } catch (error) {
      console.error('Error aggregating Users data:', error);
      throw error;
    }
  }
}
