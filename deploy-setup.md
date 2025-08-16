# Vercel + Supabase Deployment Setup

## Current Status

✅ Local development working with SQLite  
✅ Prisma schema updated for PostgreSQL  
✅ Database created and synced

## Next Steps

### 1. Fix Supabase Connection

- Go to your Supabase dashboard
- Check if database is "Paused" and click "Resume"
- Wait 1-2 minutes for database to wake up

### 2. Get Correct Connection String

From Supabase dashboard → Settings → Database:

- Use "Session Pooler" connection (port 5432) for both app and CLI operations
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
- **No DIRECT_URL needed** when using Session Pooler

### 3. Test Supabase Connection

```bash
# Update .env with Supabase connection string
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Test connection
npx prisma db push
```

### 4. Vercel Deployment

1. Add environment variable in Vercel dashboard:
   - Name: `DATABASE_URL`
   - Value: Your Supabase connection string
2. Deploy to Vercel

### 5. Environment Files

- `.env` - Local development (SQLite)
- Vercel Environment Variables - Production (Supabase)

## Troubleshooting

- If Supabase connection fails, check if database is paused
- Use Session Pooler (port 5432) for both app and CLI operations
- Use Transaction Pooler (port 6543) only if you need `DIRECT_URL` for migrations
- **Session Pooler is recommended** as it works for both without needing `DIRECT_URL`
