### Challenges

### Notes

For client application, use the following tech:

1. SSR
2. PWAs
   1. Location
   2. Notifications
   3. Device Orientation

### 31th

- Test `/users/profile` and fix minor bugs of not being able to find user
- Update Swagger for `/feed`, `/auth`, `/restuarants`, `/users`
- implement schema validation for `/feed` and `/restaurants`

What I learned:

1. By signing JWT with user data and `JWT_SECRET`, it can ensure that user can only access his/her information with that same token.

### 30th

- Display list of API in Swagger Doc for current API endpoints
- Integrate `zod` for schema declaration and input validation
- Test `/users` endpoint with schema validation
- Design `/users/profile` endpoint so that users logged in can only see his/her own profile details

### 29th

- Setup `/auth` and API `login` and `register`
- Test JWT token and password auth

### 28th

- Aggregate `total_upvotes` and `total_downvotes` in `restaurants` repo.
- Setup CRON service to update such data every hour.
- Setup `singleton` for services.
- Feat `/login` with JWT

Issue encountered:

1. Setting `average_ratings` in my restaurants table to `NOT NULL` constraint. Then aggregating causing `null` to appear if ratings are 0.
   1. use `COALESCE` to provide fallback of 0.

What I learned:

1. Use `restaurant-user` join tables to aggregate metadata and save it to `restaurants` table for efficient queries.

### 27th

- Setup join tables for `restaurant-user`
- Setup `restaurants` API and CRUD

### 26th

- Setup `users` table and feature CRUD

### 25th

- remove TypeORM and TSyringe, unnecessary initialially for small projects. Adds unncessary overhead.

### 21th

- setup migrations for initial table data

Issue encountered:

1. Unable to run migrations due to TypeORM CLI not being able to find my `data-source.ts` file at specified path.
   1. Using the command `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/db/restaurant/data-source.ts` solved the issue.
   2. I had to change module in `tsconfig.json` to `commonjs`.
2. Unable to connect to DB when running `docker-compose up` locally.
   1. Error thrown `Error initializing db: Error: Failed to initialize database: password authentication failed for user "postgres"`.
      1. Solved using `docker-compose down -v` likely because Postgres password in `docker-compose.yml` was changed after db was already created, therefore old password is still in the persisted volume.
   2. Error thrown `ERROR: relation "restaurants" does not exist at character 31`.
      1. Solved by running migrations before start server.
3. Trouble connecting to db in Docker via DBeaver.
   1. Error `thrown: psql: error: connection to server at "localhost" (::1), port 5432 failed: FATAL:  password authentication failed for user "postgres"`

Things I learned:

1. TypeORM recommends not importing `entity` classes or seed data directly in migration files. Migration should use raw SQL or the `queryRunner` API because entity code can change and break old migrations.

### 20th

- Implement TypeORM

### 17th

- use absolute path instead of relative path
- add `todo.md` and `notes.md`
- test docker compose locally

Issue encountered:

1. changing `tsconfig.json` settings alone is not allowing me to use absolute path. This is because it lets typescript recognize absolute time during development time, but node.js will not understand these aliases.
   1. solution: install `tsc-alias` to help convert absolute path to relative path after typescript compilation.
2. Docker compose up is throwing errors of DI: `unable to inject restaurantService` into `FeedController`.

### 16th

- setup DI container using `tsyringe`
- replace `route` with `controller`

Things I learned:

1. basic concept of data injection

### 11th

- create basic functionality of `GET /feed` so that it returns restaurants sorted randomly to get the API working.
- precompute and cache randomized list with `restaurant_daily_feed` table and use CRON job to update it daily.
- integrate swagger doc for API
- add pagination to response data

Issue encountered:

1. fetching restaurants randomly does not work well with pagination. Also, querying the database upon each request is inefficient.
   1. precompute and cache daily random order in a separate table
   2. use CRON job to update it on a daily basis with new “random order”

Things I learned:

1. concept of precomputing and caching a specific table order in a separate table.
2. setting up basic CRON job with `node-cron`
3. setup swagger doc

### 10th

- integrate `typescript` and `nodemon`
- install basic middle-wares: `cors` `express.json`
- setup `eslint`, `prettier`
- initialize database with PostgreSQL
- integrate docker
- create GET `/feed` API that accepts location params
- add authentication middleware for extra security

Issue encountered:

1. trying to use version 17 `psql` commands on `psql` version 16 server was giving me a bunch of errors. While reinstalling, it kept prompting me for password even though I never set it, and this was due to me re-installing Postgres without removing `data` folder which had old info. Removing this and reinstalling it fixed the issue.

Things I learned:

1. `nodemon` uses file system `fs` watcher to detect changes in your file and automatically restarts your Node.js app whenever changes are detected.
2. Basic navigation for `psql` in cmd.
3. More comprehensive setup for `restaurantService` to include types for restaurants, creating, updating, deleting, filtering, etc. Also functions like verifying data structure, validating restaurant data, CRUD functionalities potentially for back office.
4. PostGIS is faster and more efficient for “finding X within a radius of Y” as it allows geo-spatial index.
   1. Traditional database (binary tree) are optimized for linear, scalar values. Spatial data is 2D or 3D and involves ranged-based relationships.
   2. PostGIS uses GIST which divide space into bounding boxes, organize it into tree, allowing logarithmic time lookups for spatial operations.
   3. Instead of checking every row in the table, PostgreSQL narrows down relevant rows by their spatial index.

### May 9th

- create `ewn-backend` project and git
- setup basic `server.js` using node

Things I learned:

1. `express` can be used to serve static assets like `html`, `css`, and `js`. While this is not commonly used anymore due to having hosting services like AWS, express can and has been used to serve static files.
