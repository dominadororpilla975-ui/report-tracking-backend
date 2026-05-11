# 🚀 RENDER DEPLOYMENT GUIDE - Step-by-Step

## Status: ✅ Backend is ready for Render!

---

## STEP 1: Prepare Your Database (CRITICAL)

Render free tier **does NOT include a database**. You need to host your database elsewhere.

### Option A: Use Railway.app (Recommended - Free MySQL)

1. Go to **https://railway.app**
2. Sign up with GitHub
3. Create new project → Add MySQL
4. Copy these credentials:
   - **HOST**
   - **PORT** (usually 3306)
   - **USERNAME**
   - **PASSWORD**
   - **DATABASE**

### Option B: Use PlanetScale (Free MySQL alternative)

1. Go to **https://planetscale.com**
2. Sign up
3. Create new database
4. Get connection string → extract credentials

### Option C: Use Firebase Realtime Database (Alternative)

- If you prefer, modify backend to use Firebase instead of MySQL

---

## STEP 2: Push Code to GitHub

Make sure your code is on GitHub:

```powershell
cd c:\projects\report-tracking-system

# Check git status
git status

# Add all changes
git add .

# Commit
git commit -m "Deploy to Render - Flask backend ready"

# Push to GitHub
git push origin main
```

**✅ Your repo is now on GitHub and ready to deploy.**

---

## STEP 3: Create Render Account & Deploy Backend

### 3.1 Sign Up on Render

1. Go to **https://render.com**
2. Click "Get Started"
3. Sign up with GitHub
4. Authorize Render to access your GitHub

### 3.2 Create New Web Service

1. Click "New +" → "Web Service"
2. Select your GitHub repo: `report-tracking-system`
3. Configure:

| Field         | Value                           |
| ------------- | ------------------------------- |
| Name          | `report-tracking-system-api`    |
| Environment   | `Python 3`                      |
| Build Command | (leave empty - uses Dockerfile) |
| Start Command | (leave empty - uses Dockerfile) |
| Plan          | `Free`                          |

### 3.3 Add Environment Variables

Click "Environment" and add these:

```env
DB_HOST=<your-database-host>
DB_PORT=3306
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
DB_DATABASE=report_tracking
SECRET_KEY=use-a-random-string-like-this-abc123xyz789
FRONTEND_URL=https://your-frontend-domain.com
FLASK_ENV=production
```

⚠️ **IMPORTANT:** Replace `<your-database-*>` with actual Railway/PlanetScale credentials!

### 3.4 Deploy

1. Click "Deploy"
2. Wait ~5-10 minutes for build to complete
3. ✅ When done, you'll get a URL like: `https://report-tracking-system-api.onrender.com`

**Save this URL - you'll need it for the frontend!**

---

## STEP 4: Update Frontend with Backend URL

After backend is deployed on Render:

### 4.1 Update frontend .env

Edit `frontend/.env`:

```env
REACT_APP_API_URL=https://report-tracking-system-api.onrender.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.2 Test Locally First

```powershell
cd frontend
npm start

# Try logging in - should connect to Render backend now!
```

### 4.3 Redeploy Frontend

```powershell
# If using Firebase
firebase deploy

# If using Netlify
netlify deploy --prod

# If using Vercel
vercel --prod
```

---

## STEP 5: Test Everything

### Test Backend Health Check

```bash
curl https://report-tracking-system-api.onrender.com/health

# Should return: {"status":"ok"}
```

### Test Login

1. Open your frontend (Firebase domain)
2. Try to log in
3. Should now connect to Render backend ✅

---

## Troubleshooting

### ❌ Backend won't start on Render

**Check logs:**

1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for errors

**Common issues:**

- Database credentials wrong → Check environment variables
- Database unreachable → Whitelist Render's IP on your database
- Missing .env → Make sure all env vars are set in Render dashboard

### ❌ Frontend can't connect to backend

**Check:**

- `REACT_APP_API_URL` is set correctly in frontend .env
- Backend service is running (check Render logs)
- Database is online and accessible

### ❌ Database connection refused

**Fix:**

- Verify DB_HOST, DB_USER, DB_PASSWORD in Render environment
- Add Render IP to database firewall (if on Railway/PlanetScale)
- Test connection locally with same credentials

---

## What You'll Have After Deployment

```
Your App Online:
├── Frontend: https://your-firebase-domain.firebaseapp.com
├── Backend: https://report-tracking-system-api.onrender.com
└── Database: Railway/PlanetScale (online)
```

---

## Quick Checklist

- [ ] Database hosted on Railway/PlanetScale (with credentials saved)
- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Backend deployed on Render
- [ ] Environment variables set in Render dashboard
- [ ] Backend URL working (test /health endpoint)
- [ ] Frontend .env updated with backend URL
- [ ] Frontend redeployed
- [ ] Login test successful ✅

---

## Need Help?

Run this to verify backend is ready:

```bash
cd backend
python test_startup.py
```

Should show:

```
[TEST 1] ✓ Flask app imported successfully
[TEST 4] ✓ GET / -> 200: API is running
[TEST 4] ✓ GET /health -> 200: {'status': 'ok'}
[SUMMARY] App is ready for deployment!
```

**Your app is now online and ready to use!** 🎉
