# ⚡ QUICK FIX: Deploy Backend to Render (5 Minutes)

## You need ONE of these:

- Railway database credentials (free at railway.app)
- OR PlanetScale (free MySQL)
- OR any online MySQL/PostgreSQL you have

## If you DON'T have a database yet:

### Option A: Use Railway (EASIEST - 2 minutes)

```
1. Go to https://railway.app
2. Sign up with GitHub
3. Create project → Provision MySQL
4. Copy these:
   - HOST
   - PORT (3306)
   - USER
   - PASSWORD
   - DATABASE
```

### Option B: Use PlanetScale (Alternative)

```
1. Go to https://planetscale.com
2. Sign up
3. Create database
4. Get connection string
```

---

## Then Deploy Backend on Render

### Step 1: Go to Render

https://render.com → Sign in with GitHub

### Step 2: Create Web Service

- New + → Web Service
- Select: `report-tracking-backend`
- Connect

### Step 3: Configure

- Name: `report-tracking-backend`
- Environment: `Docker`
- Plan: `Free`

### Step 4: Add Environment Variables (CRITICAL)

Copy these and replace with YOUR database credentials from Railway:

```env
DB_HOST=your-railway-host-here
DB_PORT=3306
DB_USER=your-railway-user
DB_PASSWORD=your-railway-password
DB_DATABASE=your-railway-database
FRONTEND_URL=https://record-monitoring-and-tracking.web.app
GMAIL_USER=dominadororpilla975@gmail.com
GMAIL_APP_PASSWORD=udguznlcinnvpctq
EMAIL_FROM=dominadororpilla975@gmail.com
SECRET_KEY=backend-secret-key-2024
FLASK_ENV=production
```

### Step 5: Deploy

- Click "Create Web Service"
- Wait 5-10 minutes
- Copy your URL when ready (example: `https://report-tracking-backend-xyz.onrender.com`)

---

## Then Fix Frontend

### Update frontend/.env

Replace:

```
REACT_APP_API_URL=http://localhost:5000
```

With your Render URL:

```
REACT_APP_API_URL=https://report-tracking-backend-xyz.onrender.com
```

### Redeploy Frontend

```powershell
cd c:\projects\report-tracking-system\frontend
git add .env
git commit -m "Fix API URL to Render backend"
git push
firebase deploy
```

Wait 2 minutes → Test at https://record-monitoring-and-tracking.web.app ✅

---

## Need Help?

Tell me:

1. Do you have a Render backend URL already? (Share it)
2. OR do you have Railway database credentials? (Share them)
3. OR should I walk you through Railway setup first?

I can update everything for you once you have these!
