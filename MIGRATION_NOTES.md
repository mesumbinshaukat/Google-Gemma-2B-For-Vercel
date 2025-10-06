# Migration to Standard MongoDB Atlas

## Summary

Successfully migrated from deprecated MongoDB Data API to standard MongoDB Atlas connection with Mongoose.

## Changes Made

### 1. Runtime Change
- **Before**: Edge Runtime
- **After**: Node.js Serverless Runtime
- **Reason**: Mongoose requires Node.js APIs not available in Edge Runtime

### 2. Database Connection
- **Before**: MongoDB Data API (fetch-based)
- **After**: Standard MongoDB connection string with Mongoose
- **File Changes**:
  - Removed: `lib/mongodb-edge.ts`
  - Added: `lib/mongodb.ts` (with connection pooling)
  - Added: `models/ChatSession.ts` (Mongoose schema)

### 3. Environment Variables
- **Before**:
  ```env
  MONGODB_DATA_API_URL=https://data.mongodb-api.com/app/...
  MONGODB_DATA_API_KEY=your_key
  ```
- **After**:
  ```env
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gemma-chat?retryWrites=true&w=majority
  ```

### 4. Configuration Updates
- **vercel.json**: Removed `runtime: 'edge'`, increased `maxDuration` to 60s
- **next.config.js**: Added mongoose to external packages, improved webpack config
- **app/api/chat/route.ts**: Removed `export const runtime = 'edge'`

### 5. Dependencies
- **Added**: `mongoose@8.8.4`
- **Kept**: All other dependencies unchanged

## Setup Instructions

### For Existing Users

1. **Update environment variables**:
   ```bash
   # Remove old variables
   unset MONGODB_DATA_API_URL
   unset MONGODB_DATA_API_KEY
   
   # Add new variable
   export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/gemma-chat?retryWrites=true&w=majority"
   ```

2. **Get MongoDB Atlas connection string**:
   - Go to Atlas Dashboard
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` and `<database>` placeholders

3. **Whitelist Vercel IPs** (for production):
   - Atlas Dashboard → Network Access
   - Add IP Address: `0.0.0.0/0` (allow all)
   - Or use specific Vercel IP ranges

4. **Redeploy**:
   ```bash
   git pull origin main
   npm install
   vercel --prod
   ```

### For New Users

Follow the updated README.md instructions. No Data API setup needed!

## Benefits

✅ **Standard MongoDB**: Use familiar Mongoose patterns
✅ **Better Performance**: Direct connection vs REST API overhead
✅ **No Deprecation**: Standard connection strings are stable
✅ **Connection Pooling**: Efficient database connections
✅ **Full Mongoose Features**: Schemas, validation, middleware, etc.

## Compatibility

- ✅ Works on Vercel free tier
- ✅ Works with MongoDB Atlas free tier (M0)
- ✅ No breaking changes to API endpoints
- ✅ Same request/response format
- ✅ All prompt engineering features preserved

## Build Status

```
✅ TypeScript: No errors
✅ Build: Successful
✅ Dependencies: Installed (125 packages)
✅ Vulnerabilities: None
```

## Testing

```bash
# Local test
npm run dev

# Test API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, test message"}'
```

## Rollback (if needed)

If you need to rollback to Data API version:

```bash
git checkout 401fe0b  # Last commit with Data API
```

However, since Data API is deprecated, this is not recommended.

## Support

- MongoDB Atlas connection issues: Check Network Access whitelist
- Mongoose errors: Verify connection string format
- Vercel deployment: Ensure MONGODB_URI is set in environment variables

---

**Migration Date**: 2025-10-07
**Status**: ✅ Complete
**Commits**: 
- `b98953a` - Refactor to standard MongoDB
- `6205e15` - Update documentation
