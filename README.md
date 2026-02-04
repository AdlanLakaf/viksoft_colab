# CSV Collaboration Platform

A real-time collaborative platform for teams to work together on CSV data entry and validation. Built with Next.js 14, Supabase, and real-time collaboration features.

![CSV Collaboration Platform](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## 🚀 Features

### 👥 User Management
- **Email/Password Authentication** with Supabase Auth
- **Admin Approval System** - New users must be approved before accessing the platform
- **Role-Based Access Control** - Admin and User roles with different permissions
- **User Color Coding** - Each user gets a unique color for easy identification

### 📊 Collaborative CSV Editing
- **Real-time Updates** - See changes as they happen with Supabase Realtime
- **Row Locking** - Prevent conflicts by locking rows while editing
- **Visual Indicators** - Color-coded rows show who's working on what
- **Status Management** - Mark rows as Pending, Working, Completed, or Blocked
- **In-line Editing** - Click to edit cells directly in the table
- **Notes & Comments** - Add notes to rows for team communication

### 📈 Admin Dashboard
- **User Approval** - Approve or reject new user registrations
- **CSV File Upload** - Upload new CSV files for team collaboration
- **File Management** - Delete files and track progress
- **User Statistics** - View user activity and performance
- **Activity Logging** - Track all actions for audit trails

### 📱 User Dashboard
- **Personal Statistics** - See your completed, working, and blocked tasks
- **Quick Actions** - Easy access to workspace and settings
- **Profile Management** - Update your profile and preferences

### 🔧 Productivity Features
- **Advanced Filtering** - Filter by status, search through data
- **Export Functionality** - Download edited CSV files
- **Progress Tracking** - Visual progress bars for each file
- **Active User Display** - See who else is currently working
- **Responsive Design** - Works on desktop, tablet, and mobile

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- Basic knowledge of Next.js and React

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
# Navigate to the project directory
cd csv-collab-platform

# Install dependencies
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project (choose a region close to you)
4. Wait for the project to be ready

#### Run the Database Schema
1. In your Supabase project, go to the **SQL Editor**
2. Open the `supabase-schema.sql` file from this project
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click **RUN** to execute the schema

This will create:
- All necessary tables (profiles, csv_files, csv_rows, activity_log, user_statistics)
- Row Level Security (RLS) policies for data protection
- Triggers for automatic updates
- Functions for user registration

#### Get Your API Keys
1. Go to **Project Settings** > **API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp  .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create First Admin User

1. Start the development server:
```bash
npm run dev
```

2. Open http://localhost:3000 in your browser
3. Click "Sign up" and create an account
4. After signing up, go back to Supabase

5. In Supabase SQL Editor, run this query to make yourself an admin:
```sql
-- First, get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then, update your profile to admin
UPDATE public.profiles 
SET role = 'admin', status = 'approved' 
WHERE id = 'your-user-id-from-above';
```

6. Log out and log back in - you should now have admin access!

### 5. Start Using the Platform

#### As Admin:
1. Go to Admin Dashboard
2. Approve new users
3. Upload CSV files
4. Monitor team activity

#### As User:
1. Wait for admin approval
2. Access the workspace
3. Lock rows to work on them
4. Edit data, change status, add notes
5. Complete your tasks

## 📁 Project Structure

```
csv-collab-platform/
├── app/
│   ├── page.tsx              # Login/Signup page
│   ├── dashboard/
│   │   └── page.tsx          # User dashboard
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard
│   ├── workspace/
│   │   └── page.tsx          # Collaborative CSV editor
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── lib/
│   ├── supabase.ts           # Supabase client & types
│   └── auth.ts               # Authentication helpers
├── supabase-schema.sql       # Database schema
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js` and `app/globals.css` to customize the color scheme.

### Add More CSV Columns
The platform dynamically adapts to any CSV structure - just upload your file!

### Modify User Roles
Edit the `user_role` enum in `supabase-schema.sql` to add more roles.

### Custom Status Types
Edit the `row_status` enum to add custom statuses for your workflow.

## 🔒 Security Features

- **Row Level Security (RLS)** - Users can only access data they're authorized to see
- **Real-time Authorization** - All Supabase operations respect user permissions
- **Admin-Only Actions** - Critical operations restricted to admins
- **Session Management** - Automatic token refresh and session validation
- **SQL Injection Protection** - Parameterized queries prevent injection attacks

## 📊 Database Schema

### Main Tables

**profiles** - User information and settings
- Links to Supabase Auth users
- Stores role, status, and user color
- Automatically created on signup

**csv_files** - Uploaded CSV files
- Tracks file metadata and progress
- Stores total and completed row counts

**csv_rows** - Individual CSV data rows
- Stores row data as JSONB (flexible for any CSV structure)
- Tracks status, assignment, and locking
- Linked to files via foreign key

**activity_log** - Audit trail
- Records all user actions
- Useful for compliance and debugging

**user_statistics** - Performance metrics
- Automatically updated via triggers
- Tracks completed, working, and blocked tasks

## 🚀 Production Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

### Supabase Production

Your Supabase project is already production-ready! Just make sure to:
- Enable email confirmations in Auth settings (optional)
- Set up custom SMTP for emails (optional)
- Monitor usage in the Supabase dashboard

## 🐛 Troubleshooting

### "Access Denied" Errors
- Make sure your user status is 'approved' in the database
- Check that RLS policies are properly set up
- Verify your API keys are correct

### Real-time Not Working
- Check Supabase Realtime is enabled in project settings
- Verify your browser supports WebSockets
- Check browser console for connection errors

### CSV Upload Fails
- Ensure CSV file is properly formatted
- Check file size (adjust if needed in Supabase storage settings)
- Verify you're logged in as admin

### Users Can't Sign Up
- Check that the signup trigger is created in the database
- Verify email is unique
- Check Supabase Auth logs for errors

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the MIT License.

## 🎯 Roadmap

Future enhancements:
- [ ] Bulk operations (select multiple rows)
- [ ] Excel file support (.xlsx)
- [ ] Data validation rules
- [ ] Export to different formats
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] API endpoints for integrations
- [ ] Automated backups
- [ ] Version history for rows

## 💡 Tips for Best Use

1. **Start Small** - Upload a test CSV with 10-20 rows first
2. **Train Your Team** - Show users how to lock, edit, and unlock rows
3. **Use Statuses** - Encourage consistent use of status updates
4. **Add Notes** - Communicate blockers through row notes
5. **Monitor Progress** - Check the admin dashboard regularly
6. **Export Often** - Download backups of your progress

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review Supabase documentation
- Check Next.js documentation
- Create an issue in the repository

---

Built with ❤️ using Next.js and Supabase
# viksoft_colab
