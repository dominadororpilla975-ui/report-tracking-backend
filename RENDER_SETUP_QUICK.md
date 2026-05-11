# 🚀 Deploy Backend to Render - Quick Setup

## Current Status:

- ✅ Frontend: https://record-monitoring-and-tracking.web.app (Firebase - ONLINE)
- ❌ Backend: Not deployed (GitHub only)
- Problem: Frontend can't connect to backend at localhost

---

## STEP 1: Set Up Database on Railway (FREE)

This is **REQUIRED** before deploying on Render.

### 1.1 Go to Railway

- Open: https://railway.app
- Sign up with GitHub
- Click "Start a New Project"
- Select "Provision PostgreSQL" or "MySQL"

### 1.2 Get Database Credentials

Once created, click on your database and copy:

- **DATABASE_URL** or these individual values:
  - HOST
  - PORT
  - USER
  - PASSWORD
  - DATABASE

**⚠️ Save these! You'll need them for Render.**

---

## STEP 2: Update Backend .env File (LOCAL)

Edit `backend/.env`:

```env
# Database (from Railway)
DB_HOST=your-railway-host.railway.app
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-railway-password
DB_DATABASE=railway

# Frontend URL (pointing to Firebase)
FRONTEND_URL=https://record-monitoring-and-tracking.web.app

# Security
SECRET_KEY=your-super-secret-key-here-use-something-random-like-abc123xyz789def456

# Email (optional for now)
BREVO_API_KEY=
EMAIL_FROM=noreply@report-tracking.com
BREVO_SENDER_NAME=Report Tracking

# Google
GOOGLE_CLIENT_ID=
```

---

## STEP 3: Push Updates to GitHub

```powershell
cd c:\projects\report-tracking-system\backend

# Make sure .env is added
git add .env .env.example

# Commit
git commit -m "Add database and deployment configuration"

# Push
git push origin main
```

**✅ Backend repo now has deployment config**

---

## STEP 4: Deploy Backend on Render

### 4.1 Go to Render

- Open: https://render.com
- Sign in with GitHub
- Click "New +" → "Web Service"

### 4.2 Select Repository

- Search and select: `report-tracking-backend`
- Click "Connect"

### 4.3 Configure Service

| Setting         | Value                     |
| --------------- | ------------------------- |
| **Name**        | `report-tracking-backend` |
| **Environment** | `Docker`                  |
| **Region**      | Choose closest to you     |
| **Plan**        | `Free`                    |

### 4.4 Add Environment Variables

Click "Environment" and add these:

```env
DB_HOST=your-railway-host
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-railway-password
DB_DATABASE=railway
FRONTEND_URL=https://record-monitoring-and-tracking.web.app
SECRET_KEY=abc123xyz789def456ghi789
FLASK_ENV=production
```

### 4.5 Deploy

- Click "Create Web Service"
- Wait 5-10 minutes for deployment
- Once done, you'll get a URL like: `https://report-tracking-backend-xxxx.onrender.com`

**✅ Copy this URL - you need it next!**

---

## STEP 5: Update Frontend to Use Render Backend

### 5.1 Update Frontend .env

Edit `frontend/.env`:

```env
REACT_APP_API_URL=https://report-tracking-backend-xxxx.onrender.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

Replace `xxxx` with your actual Render URL from Step 4.5

### 5.2 Deploy Frontend

```powershell
cd c:\projects\report-tracking-system\frontend

# Deploy to Firebase
firebase deploy
```

---

## STEP 6: Test Everything

### 6.1 Test Backend is Online

```bash
curl https://report-tracking-backend-xxxx.onrender.com/health

# Should return: {"status":"ok"}
```

### 6.2 Test Frontend Login

1. Open: https://record-monitoring-and-tracking.web.app
2. Try to login
3. Should work now! ✅

---

## Troubleshooting

### ❌ Render deployment fails

**Check Render logs:**

1. Go to https://render.com dashboard
2. Click your service
3. Scroll down to "Logs"
4. Look for error messages

**Common issues:**

- `MODULE_NOT_FOUND`: Database credentials wrong
- `CONNECTION_REFUSED`: Database not accessible
- `Build failed`: Missing dependency in requirements.txt

**Solution:**

- Verify DATABASE credentials in Render Environment
- Make sure Railway database is online
- Check requirements.txt has all packages

### ❌ Frontend still shows ERR_CONNECTION_REFUSED

1. Clear browser cache: Ctrl+Shift+Delete
2. Verify `REACT_APP_API_URL` in frontend .env
3. Run `firebase deploy` again
4. Wait 2-3 minutes for Firebase to update
5. Refresh page

---

## What You'll Have

```
✅ Backend (Render):        https://report-tracking-backend-xxxx.onrender.com
✅ Frontend (Firebase):      https://record-monitoring-and-tracking.web.app
✅ Database (Railway):       Automatic backups
✅ Email (Optional):         Brevo/SMTP configured
```

---

## Quick Checklist

- [ ] Created Railway database (saved credentials)
- [ ] Updated backend/.env locally
- [ ] Pushed backend to GitHub
- [ ] Created Render account with GitHub
- [ ] Deployed backend on Render
- [ ] Got Render backend URL
- [ ] Updated frontend/.env with Render URL
- [ ] Deployed frontend to Firebase
- [ ] Tested /health endpoint
- [ ] Tested login on frontend ✅

---

## Next: Verify Everything Works

Once deployed, send me:

1. Your Render backend URL
2. Try login and tell me if it works
3. If error, share the Render logs

**You're almost there! 🎉**
