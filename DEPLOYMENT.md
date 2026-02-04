# 🚀 Deployment Guide

Deploy your CSV Collaboration Platform to production in minutes!

## Option 1: Deploy to Vercel (Recommended)

### Why Vercel?
- Free tier available
- Automatic HTTPS
- Global CDN
- Zero configuration
- Perfect for Next.js

### Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/csv-collab-platform.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables**
   In Vercel dashboard:
   - Go to Settings > Environment Variables
   - Add these variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL = your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
     ```

4. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live! 🎉

### Custom Domain (Optional)
1. In Vercel dashboard, go to Settings > Domains
2. Add your domain (e.g., `csvcollab.yourdomain.com`)
3. Follow DNS instructions
4. SSL certificate is automatic!

---

## Option 2: Deploy to Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to https://netlify.com
   - Drag and drop the `.next` folder
   - Or connect your GitHub repository

3. **Configure Environment Variables**
   - Go to Site settings > Environment variables
   - Add your Supabase credentials

4. **Set Build Command**
   - Build command: `npm run build`
   - Publish directory: `.next`

---

## Option 3: Deploy to Your Own Server

### Requirements:
- Node.js 18+ installed
- Nginx or Apache
- PM2 for process management

### Steps:

1. **Clone to Server**
   ```bash
   ssh user@yourserver.com
   git clone https://github.com/yourusername/csv-collab-platform.git
   cd csv-collab-platform
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   nano .env.local
   # Add your Supabase credentials
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start npm --name "csv-collab" -- start
   pm2 startup
   pm2 save
   ```

5. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## Supabase Production Checklist

### Security Settings

1. **Enable Email Confirmations** (Optional)
   - Go to Authentication > Settings
   - Enable "Confirm email"

2. **Set Up Custom SMTP** (Optional)
   - Go to Settings > Auth > SMTP Settings
   - Configure your email provider

3. **Configure Auth Settings**
   - Set Site URL to your production URL
   - Add your domain to allowed redirect URLs

4. **Review RLS Policies**
   - All policies are already set up
   - Double-check in Database > Policies

### Performance Optimization

1. **Enable Connection Pooling**
   - Go to Settings > Database
   - Enable connection pooling (included in free tier)

2. **Set Up Backups** (Paid Plans)
   - Go to Settings > Database
   - Configure automated backups

3. **Monitor Usage**
   - Dashboard shows API requests, database size, bandwidth
   - Free tier limits:
     - 500MB database
     - 2GB bandwidth
     - 50,000 monthly active users

---

## Post-Deployment Checklist

### Essential Steps

- [ ] Test user signup and login
- [ ] Create admin account
- [ ] Upload a test CSV file
- [ ] Test real-time updates with 2 browsers
- [ ] Verify email notifications (if enabled)
- [ ] Test on mobile devices
- [ ] Check browser console for errors

### Security

- [ ] Change default admin password
- [ ] Review user roles and permissions
- [ ] Test RLS policies
- [ ] Enable HTTPS (automatic on Vercel/Netlify)
- [ ] Set up monitoring/logging

### Performance

- [ ] Test with large CSV files
- [ ] Check page load times
- [ ] Verify real-time performance
- [ ] Monitor Supabase usage

---

## Scaling Considerations

### When You Grow

**Database:**
- Free tier: 500MB database
- Pro tier ($25/mo): 8GB database + more features
- Consider migrating to Pro when you hit 400MB

**Users:**
- Free tier: 50,000 monthly active users
- This is usually more than enough for small-medium teams

**Storage:**
- If you need to store uploaded CSVs (not just processed data)
- Enable Supabase Storage
- Set up automatic cleanup of old files

### Performance Optimization

1. **Add Database Indexes** (if queries are slow)
   ```sql
   CREATE INDEX idx_csv_rows_file_status ON csv_rows(file_id, status);
   ```

2. **Enable Caching** (Vercel)
   - Add `Cache-Control` headers
   - Use SWR for client-side caching

3. **Optimize Bundle Size**
   ```bash
   npm run build
   # Check .next/analyze for bundle size
   ```

---

## Monitoring & Maintenance

### Set Up Monitoring

1. **Vercel Analytics** (Free)
   - Automatic on Vercel
   - Shows page views, performance

2. **Supabase Logs**
   - Go to Logs > Postgres Logs
   - Monitor slow queries

3. **Error Tracking** (Optional)
   - Integrate Sentry for error monitoring
   - Set up alerts for critical errors

### Regular Maintenance

- **Weekly:** Check Supabase usage dashboard
- **Monthly:** Review activity logs for suspicious activity
- **Quarterly:** Update dependencies (`npm update`)
- **As needed:** Database backups (if not automated)

---

## Environment-Specific Configuration

### Development
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-dev-key
```

### Staging
```env
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key
```

### Production
```env
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-key
```

---

## Troubleshooting Deployment Issues

### Build Fails
- Check Node.js version (need 18+)
- Clear cache: `rm -rf .next node_modules && npm install`
- Check for TypeScript errors: `npm run build`

### Real-time Doesn't Work in Production
- Verify WebSocket connections aren't blocked
- Check Supabase Realtime is enabled
- Ensure CORS is configured correctly

### Users Can't Access
- Verify environment variables are set
- Check Supabase Auth settings
- Review RLS policies

---

## Cost Estimation

### Free Tier (Perfect for Small Teams)
- **Supabase:** Free
- **Vercel:** Free
- **Total:** $0/month
- Limits: 500MB DB, 100GB bandwidth

### Small Team (10-50 users)
- **Supabase Pro:** $25/month
- **Vercel Pro:** $20/month (optional)
- **Total:** $25-45/month

### Medium Team (50-200 users)
- **Supabase Pro:** $25/month
- **Vercel Pro:** $20/month
- **Total:** $45/month

Most teams can run comfortably on the free tier!

---

## Support & Updates

### Getting Help
- Check documentation
- Review Supabase status page
- Check Vercel status page

### Keeping Updated
```bash
# Update dependencies
npm update

# Check for security issues
npm audit

# Fix security issues
npm audit fix
```

---

🎉 **You're all set for production!**

Your CSV Collaboration Platform is now live and ready for your team to use.

For questions or issues, refer to the main README.md or create an issue in the repository.
