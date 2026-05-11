# 🚀 CONNECT FRONTEND & BACKEND - STEP BY STEP

## Your Setup:

- ✅ Frontend: **https://record-monitoring-and-tracking.web.app** (Firebase - Online)
- ❌ Backend: **GitHub only** (Not deployed yet)
- Database: **Need to set up**

---

## ⚠️ IMPORTANT: You Need a Database First!

### Option 1: Railway (Recommended - FREE)

1. Go to: https://railway.app
2. Sign up with GitHub
3. Create new project → Select "Provision MySQL"
4. Copy your connection details:
   - **DATABASE_URL** OR these values:
     - HOST
     - PORT (usually 3306)
     - USER
     - PASSWORD
     - DATABASE

**Save these somewhere safe!** You'll need them for Render.

---

## STEP 1: Push Backend to GitHub

Your .env file is already updated to point to Firebase frontend.

```powershell
cd c:\projects\report-tracking-system\backend

# Add and commit
git add .env
git commit -m "Configure backend for Firebase frontend and Render deployment"

# Push to GitHub
git push origin main
```

✅ Your backend code is now on GitHub!

---

## STEP 2: Deploy Backend on Render

### 2.1 Go to Render Dashboard

- Open: https://render.com
- Sign in with GitHub

### 2.2 Create Web Service

1. Click: "New +" → "Web Service"
2. Search for repo: **report-tracking-backend**
3. Click "Connect"

### 2.3 Configure

Fill in these settings:

| Setting     | Value                     |
| ----------- | ------------------------- |
| Name        | `report-tracking-backend` |
| Environment | `Docker`                  |
| Region      | Choose closest to you     |
| Plan        | `Free`                    |

### 2.4 Add Environment Variables ⚠️ CRITICAL

Click "Environment" tab and add **ALL** of these:

```env
DB_HOST=<your-railway-host>
DB_PORT=3306
DB_USER=<your-railway-user>
DB_PASSWORD=<your-railway-password>
DB_DATABASE=<your-railway-database>
FRONTEND_URL=https://record-monitoring-and-tracking.web.app
GMAIL_USER=dominadororpilla975@gmail.com
GMAIL_APP_PASSWORD=udguznlcinnvpctq
EMAIL_FROM=dominadororpilla975@gmail.com
BREVO_SENDER_NAME=Report Tracking System
SECRET_KEY=report-tracking-system-secret-key-2024
FLASK_ENV=production
```

**⚠️ Replace these with YOUR Railway database info:**

- `<your-railway-host>`
- `<your-railway-user>`
- `<your-railway-password>`
- `<your-railway-database>`

### 2.5 Deploy

1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Watch the "Logs" tab for build progress
4. When done, you'll see a URL like:
   ```
   https://report-tracking-backend-xxxxx.onrender.com
   ```

**✅ SAVE THIS URL!** You need it next.

---

## STEP 3: Get Your Backend URL

After Step 2, your Render dashboard shows your backend URL.

Example:

```
https://report-tracking-backend-abc123.onrender.com
```

**Copy the full URL!**

---

## STEP 4: Update Frontend to Use Your Backend

### 4.1 Update Frontend .env

Edit: `frontend/.env`

Replace this:

```env
REACT_APP_API_URL=http://localhost:5000
```

With your Render backend URL:

```env
REACT_APP_API_URL=https://report-tracking-backend-abc123.onrender.com
```

**Example:**

```env
# Before
REACT_APP_API_URL=http://localhost:5000

# After
REACT_APP_API_URL=https://report-tracking-backend-xyz789.onrender.com
```

### 4.2 Commit & Push Frontend Changes

```powershell
cd c:\projects\report-tracking-system\frontend

git add .env
git commit -m "Update backend API URL to Render deployment"
git push origin main
```

### 4.3 Redeploy Frontend on Firebase

```powershell
firebase deploy
```

Wait 2-3 minutes for Firebase to update.

---

## STEP 5: Test Everything! ✅

### Test 1: Backend Health Check

Open in browser:

```
https://report-tracking-backend-xyz789.onrender.com/health
```

Should show:

```json
{ "status": "ok" }
```

### Test 2: Frontend Login

1. Open: https://record-monitoring-and-tracking.web.app
2. Try to login
3. Should work now! ✅

If error appears, check browser console (F12) for what's wrong.

---

## Troubleshooting

### ❌ Render build fails

**Fix:**

1. Go to Render dashboard
2. Click your service
3. Scroll to "Logs"
4. Look for red error text
5. Common issues:
   - Database credentials wrong
   - Database not online
   - Missing environment variables

### ❌ Frontend still shows "ERR_CONNECTION_REFUSED"

**Fix:**

1. Clear browser cache (Ctrl+Shift+Delete)
2. Verify backend URL in `frontend/.env`
3. Run `firebase deploy` again
4. Wait 3 minutes and refresh

### ❌ Database connection error on Render

**Fix:**

1. Double-check Railway credentials in Render environment
2. Make sure Railway database is running
3. If using Railway, you might need to whitelist Render's IP

---

## Checklist ✅

- [ ] Created Railway database (saved credentials)
- [ ] Updated backend `.env` (already done ✓)
- [ ] Pushed backend to GitHub
- [ ] Deployed backend on Render
- [ ] Added environment variables on Render
- [ ] Got backend URL from Render
- [ ] Updated frontend `.env` with backend URL
- [ ] Pushed frontend changes to GitHub
- [ ] Redeployed frontend on Firebase
- [ ] Tested `/health` endpoint
- [ ] Tested login on frontend ✅

---

## 🎉 You're Done!

Your app is now:

- ✅ Frontend: Online on Firebase
- ✅ Backend: Online on Render
- ✅ Database: Online on Railway
- ✅ Connected: Frontend → Backend → Database

**Share your app link: https://record-monitoring-and-tracking.web.app** 🚀
