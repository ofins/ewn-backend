# To-Do List

## Bug Issues

- [ ] Application shuts down if errors are thrown in creating DB (5.30.2025)
  - `try/catch` blocks are used and issue still occurs
- [ ] Docker compose up throwing error (5.17.2025)

## Backend Development

- [ ] Setup Logger for API and DB
- [ ] Add unit testing
- [ ] Setup CI/CD pipeline in Github Actions
- [ ] Add `phone` and `website` column for restaurant
- [x] Setup `/users/profile` and ensure user can only access own data
- [x] Integrate Schema validation
- [x] Setup `/login` and `/register` API with JWT
- [x] Setup `/restaurants` API
- [x] Setup `/user` API
- [x] Setup CRUD functionality for `/feed` API
- [x] Containerize server/Db with Docker
- [x] Implement Type-ORM

# Database Tasks

- [ ] Optimize PostGIS queries for location-based searches
- [ ] Create database backup script
- [x] Setup `restaurants-users` table
- [x] Setup `users` and `restaurants` table
- [x] Implement initial DB data with migration
- [x] Setup migrations
- [x] Initialize PostgreSQL database

## Documentation

- [ ] Write README.md for project setup instructions
- [ ] Document authentication middleware usage
- [x] Integrate Swagger for API documentation

## Refactoring

- [ ] Refactor `GET /feed` to support filtering by cuisine
- [x] Use absolute paths with `tsc-alias`
- [x] Set up DI container with `tsyringe`
