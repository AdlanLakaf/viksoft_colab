# 🚀 Quick Start Guide

Get your CSV Collaboration Platform running in 10 minutes!

## Step 1: Install Dependencies (1 minute)

```bash
cd csv-collab-platform
npm install
```

## Step 2: Create Supabase Project (2 minutes)

1. Go to https://supabase.com and sign up (it's free!)
2. Click "New Project"
3. Fill in:
   - Project name: `csv-collab`
   - Database password: (create a strong password)
   - Region: (choose closest to you)
4. Click "Create new project"
5. Wait 1-2 minutes for setup

## Step 3: Set Up Database (2 minutes)

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Open the file `supabase-schema.sql` from this project
3. Copy ALL the SQL code (Ctrl/Cmd + A, then Ctrl/Cmd + C)
4. Paste it into the SQL Editor
5. Click **RUN** button
6. You should see "Success. No rows returned"

## Step 4: Configure Environment (1 minute)

1. In Supabase, go to **Settings** > **API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key (the long string under "Project API keys")
4. Create a file named `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=paste-your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
```

## Step 5: Start the App (1 minute)

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## Step 6: Create Admin Account (3 minutes)

1. Click **Sign up** on the login page
2. Enter your email and password
3. After signing up, go back to Supabase
4. In the SQL Editor, run this query (replace with your email):

```sql
-- Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

5. Copy the `id` that appears
6. Run this query (replace with your ID):

```sql
-- Make yourself admin
UPDATE public.profiles 
SET role = 'admin', status = 'approved' 
WHERE id = 'paste-your-id-here';
```

7. Go back to the app and log in again!

## 🎉 You're Done!

### What to do next:

**As Admin:**
1. Click "Admin Dashboard"
2. Upload a CSV file (any CSV will work!)
3. Invite team members to sign up
4. Approve them in the User Management section

**Test It Out:**
1. Open the app in 2 different browsers
2. Log in with different accounts
3. Go to Workspace
4. Watch real-time collaboration in action!

## 📝 Sample CSV for Testing

Create a file named `sample.csv`:

```csv
name,email,status,priority
John Doe,john@example.com,pending,high
Jane Smith,jane@example.com,in-progress,medium
Bob Johnson,bob@example.com,completed,low
```

Upload this in the Admin Dashboard to get started!

## ⚡ Common Issues

**Can't log in after signup?**
- Make sure you ran the SQL to make yourself admin and set status to 'approved'

**Real-time updates not working?**
- Refresh the page
- Check that Supabase Realtime is enabled (it is by default)

**CSV upload fails?**
- Make sure you're logged in as admin
- Check that your CSV is properly formatted

## 🎯 Next Steps

- Read the full README.md for detailed features
- Customize colors in `tailwind.config.js`
- Add your team members
- Start collaborating!

Need help? Check the Troubleshooting section in README.md
