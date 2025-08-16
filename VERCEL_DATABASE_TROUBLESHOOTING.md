# Vercel Database Troubleshooting Guide

## Common Issues and Solutions

### 1. Database Connection Issues

**Symptoms:**

- Rules not saving to database
- "Database connection failed" errors
- 503 Service Unavailable errors

**Solutions:**

#### A. Check Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Ensure `DATABASE_URL` is set correctly
4. The format should be: `postgresql://username:password@host:port/database`

#### B. Test Database Connection

Visit `/api/debug/database` to test the connection:

```bash
curl https://your-app.vercel.app/api/debug/database
```

#### C. Check Database Provider

- Ensure your database is accessible from Vercel's servers
- For Supabase: Check if your database is paused (free tier)
- For other providers: Verify IP allowlist includes Vercel's IPs

### 2. Prisma Client Issues

**Symptoms:**

- "Prisma Client error" in logs
- Connection timeouts

**Solutions:**

#### A. Regenerate Prisma Client

```bash
npx prisma generate
```

#### B. Check Prisma Schema

Ensure your schema matches the deployed database:

```bash
npx prisma db push
```

### 3. Vercel-Specific Issues

**Symptoms:**

- Works locally but fails on Vercel
- Intermittent connection issues

**Solutions:**

#### A. Connection Pooling

For production databases, consider using connection pooling:

- Supabase: Use connection pooling URL
- Other providers: Configure connection pooling

#### B. Cold Starts

- Vercel functions have cold starts
- First request might be slower
- Consider using Vercel's Edge Functions for better performance

### 4. Debugging Steps

#### Step 1: Check Health Endpoint

```bash
curl https://your-app.vercel.app/api/health
```

#### Step 2: Test Database Debug Endpoint

```bash
curl https://your-app.vercel.app/api/debug/database
```

#### Step 3: Check Vercel Logs

1. Go to Vercel dashboard
2. Navigate to Functions tab
3. Check for error logs

#### Step 4: Test Database Operations

```bash
curl -X POST https://your-app.vercel.app/api/debug/database \
  -H "Content-Type: application/json" \
  -d '{"action": "test-insert"}'
```

### 5. Environment-Specific Configurations

#### Development vs Production

- Development: Uses local database
- Production: Uses Vercel environment variables

#### Database URL Format

```
postgresql://username:password@host:port/database?sslmode=require
```

### 6. Common Error Codes

- **P1001**: Can't reach database server
- **P1002**: Database server doesn't exist
- **P2002**: Unique constraint violation
- **P2003**: Foreign key constraint violation

### 7. Prevention

#### A. Use Connection Pooling

```env
DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=5&pool_timeout=0"
```

#### B. Implement Retry Logic

The updated code includes retry logic and better error handling.

#### C. Monitor Database Health

Regularly check the health endpoint to ensure database connectivity.

## Quick Fix Checklist

- [ ] Check `DATABASE_URL` in Vercel environment variables
- [ ] Ensure database is not paused (Supabase free tier)
- [ ] Test connection with `/api/debug/database`
- [ ] Check Vercel function logs
- [ ] Verify database schema is up to date
- [ ] Test with a simple database operation

## Support

If issues persist:

1. Check Vercel function logs
2. Test database connection manually
3. Verify environment variables
4. Contact database provider support
