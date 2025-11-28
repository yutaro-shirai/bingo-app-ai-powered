# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: bingo-app (or any name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for setup to complete

## 2. Get Database Connection String

1. In your Supabase project, go to **Settings** > **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the database password you set in step 1

## 3. Configure Backend

1. In `packages/backend`, create `.env` file (or update existing):
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
   ADMIN_PASSWORD="your-admin-password"
   ```

2. Run Prisma migration:
   ```bash
   cd packages/backend
   npx prisma migrate dev --name init
   npx prisma generate
   ```

## 4. Verify Connection

1. In Supabase dashboard, go to **Table Editor**
2. You should see `rooms` and `players` tables created by Prisma

## 5. Deploy (Optional)

For production, use the same DATABASE_URL in your deployment environment variables.

### Environment Variables for Deployment:
- `DATABASE_URL`: Your Supabase connection string
- `ADMIN_PASSWORD`: Admin dashboard password
