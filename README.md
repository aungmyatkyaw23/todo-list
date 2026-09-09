# Todo List App

A simple todo-list app built with Node.js, Express, and MongoDB.

## Features

- Create, edit, complete, and delete tasks
- Register, log in, and log out with session-based auth
- Store tasks in MongoDB with Mongoose
- Keep each user's todos private to their own account
- Filter by status, priority, and search text
- Responsive single-page front end served by the Node app

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and update the MongoDB connection string:

   ```bash
   cp .env.example .env
   ```

3. Set a session secret in `.env`:

   ```env
   SESSION_SECRET=replace-this-with-a-random-secret
   ```

4. Start MongoDB locally, or point `MONGODB_URI` to MongoDB Atlas.

5. Run the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`

## MongoDB example

Local MongoDB:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/todo_app
```

MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/todo_app?retryWrites=true&w=majority
```
src/
  config/        environment setup
  controllers/   auth logic
  middlewares/   auth + validation
  models/        MongoDB schemas
  routes/        API endpoints
public/
  views/         SPA page templates
  app.js         client behavior
  router.js      client routing