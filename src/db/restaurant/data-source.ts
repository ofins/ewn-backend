import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantDailyFeed } from './entities/restaurantDailyFeed.entity';

dotenv.config();

export const RestaurantDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: [
    __dirname + '/entities/*.{ts,js}',
    Restaurant,
    RestaurantDailyFeed,
  ],
  migrations: ['src/db/migrations/**/*.{ts,js}'],
  subscribers: [],
});
