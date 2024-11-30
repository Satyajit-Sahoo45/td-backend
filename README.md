## How to Run Locally

1. Clone the repo on your local(`https://github.com/Satyajit-Sahoo45/td-backend.git`)

2. Install dependencies:

   ### `npm install`

3. Update .env
   ### `add DATABASE_URL, JWT_SECRET and PORT`

4. Run migrations to create the database schema
   ### npm run prisma:migrate --name init

5. Generate the Prisma client
   ### npx prisma generate

6. Install dependencies:

   ### `npm run build`

7. Start the development server:

   ### `npm run server`
