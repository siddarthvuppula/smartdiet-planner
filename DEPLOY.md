# Smart Diet Planner — Complete Deployment Guide
## Go live for FREE in 30 minutes

After following this guide you will have:
- A **live public URL** anyone can open from their phone or laptop
- A **real database** storing every user permanently
- A **free backend API** running 24/7 on the internet
- An **admin dashboard** to show your professor all user data

**Total cost: $0. No credit card on any platform.**

---

# PART 1 — One-time Setup (do these first)

---

## Step 1A — Install Git on Windows

Git lets you push your code to GitHub. Check if you already have it:
```cmd
git --version
```
If you see `git version 2.x.x` — skip to Step 1B.

If not, install it:
1. Go to https://git-scm.com/download/win
2. Download and run the installer
3. Click Next through all defaults
4. Open a **new** Command Prompt window and run `git --version` to confirm

---

## Step 1B — Create a GitHub account

1. Go to https://github.com
2. Click **Sign up** — use your email, pick a username (e.g. `siddarthvuppula`)
3. Verify your email
4. You now have a free GitHub account

---

## Step 1C — Create a Supabase account (database)

1. Go to https://supabase.com
2. Click **Start your project**
3. Click **Continue with GitHub** (uses the account you just made)
4. Click **New Project**:
   - Organization: your username
   - Name: `smartdiet`
   - Database Password: type something strong like `SmartDiet@2024` — **save this**
   - Region: `Southeast Asia (Singapore)` — closest to India
5. Click **Create new project**
6. Wait about 2 minutes while it spins up (progress bar at top)

**Set up the database tables:**
7. Click **SQL Editor** in the left sidebar
8. Click **New Query**
9. Open the file `backend/supabase_schema.sql` from your project folder in Notepad
10. Copy ALL the text (Ctrl+A, Ctrl+C)
11. Paste it into the Supabase SQL Editor (Ctrl+V)
12. Click **Run** (green button)
13. You should see: `Success. No rows returned` ✓

**Get your API keys (you need these for Step 3):**
14. Click **Settings** (gear icon) in left sidebar → **API**
15. Copy and save these two values:
    - **Project URL**: looks like `https://abcdefghijkl.supabase.co`
    - **anon public** key: a very long string starting with `eyJ...`

---

# PART 2 — Deploy the Application

---

## Step 2 — Push code to GitHub (3 minutes)

**First, extract the ZIP:**
1. Download `SmartDiet_Production.zip`
2. Move it to your Desktop
3. Right-click → Extract All → Extract to Desktop
4. You now have a folder called `SmartDiet_Production` on your Desktop

**Create a GitHub repository:**
5. Go to https://github.com → click the **+** icon → **New repository**
6. Repository name: `smartdiet-planner`
7. Set to **Public**
8. **DO NOT** tick "Add a README file"
9. Click **Create repository**
10. Copy the repository URL shown (looks like `https://github.com/siddarthvuppula/smartdiet-planner.git`)

**Push your code:**
11. Open Command Prompt and run these one at a time:
```cmd
cd %USERPROFILE%\Desktop\SmartDiet_Production
```
```cmd
git init
```
```cmd
git add .
```
```cmd
git commit -m "Smart Diet Planner - MCS 7013 Project"
```
```cmd
git branch -M main
```
```cmd
git remote add origin https://github.com/YOUR_USERNAME/smartdiet-planner.git
```
(Replace `YOUR_USERNAME` with your actual GitHub username)
```cmd
git push -u origin main
```
12. It will ask for your GitHub username and password
    - Username: your GitHub username
    - Password: go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → Generate new token → tick `repo` → Generate → copy the token and use it as password
13. You should see `Branch 'main' set up to track remote branch 'main' from 'origin'` ✓

---

## Step 3 — Deploy backend to Render (10 minutes)

1. Go to https://render.com
2. Click **Get Started for Free**
3. Click **Continue with GitHub** → authorize Render
4. Click **New +** → **Web Service**
5. Find and select your `smartdiet-planner` repository → click **Connect**
6. Fill in the settings:

| Field | Value |
|-------|-------|
| Name | `smartdiet-api` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Free** |

7. Scroll down → click **Advanced** → click **Add Environment Variable** — add all 5:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | your Project URL from Step 1C (e.g. `https://abcdef.supabase.co`) |
| `SUPABASE_ANON_KEY` | your anon public key from Step 1C |
| `PASS_SALT` | type any random text e.g. `mcs7013_salt_siddarth` |
| `JWT_SECRET` | type any random text e.g. `jwt_secret_smartdiet_2024` |
| `ADMIN_KEY` | a password for the admin dashboard e.g. `Prof@SmartDiet24` |

8. Click **Create Web Service**
9. Wait 3–5 minutes for first deploy (watch the logs — you'll see `Application startup complete`)
10. Your API URL appears at the top: `https://smartdiet-api.onrender.com`

**Test it:** Open your API URL in browser.
You should see:
```json
{"status": "Smart Diet Planner API running", "version": "1.0.0"}
```
Also try: `https://smartdiet-api.onrender.com/docs` — you'll see the full API documentation ✓

---

## Step 4 — Connect frontend to your API (1 minute)

**Great news — the `vercel.json` in this project automatically proxies all `/api/*` calls to your Render backend. No code changes needed.**

You only need to update one thing: tell `vercel.json` your Render URL.

1. Open `SmartDiet_Production/vercel.json` in Notepad
2. Find this line:
```json
"destination": "https://smartdiet-api.onrender.com/api/:path*"
```
3. Replace `smartdiet-api` with your actual Render service name if it is different
4. Save the file

**Push to GitHub:**
```cmd
cd %USERPROFILE%\Desktop\SmartDiet_Production
git add vercel.json
git commit -m "Set Render API URL in vercel proxy"
git push
```

That is it — Vercel will proxy all API calls for you. No CORS errors, no URL changes in JS files.

---

## Step 5 — Deploy frontend to Vercel (5 minutes)

1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub**
3. Click **Add New...** → **Project**
4. Find `smartdiet-planner` in the list → click **Import**
5. Settings:
   - **Framework Preset**: Other
   - **Root Directory**: leave as `.` (dot — the project root)
   - Everything else leave as default
6. Click **Deploy**
7. Wait about 1 minute
8. Click **Continue to Dashboard**
9. Your live URL is shown at the top — looks like `https://smartdiet-planner.vercel.app`

**Click the URL — your app is LIVE on the internet!** 🎉

---

## Step 6 — Test everything end-to-end

1. Open your Vercel URL on your phone or a different browser
2. Click **Sign Up** and create an account
3. Log some meals on any day → click **Save Day & Generate Plan**
4. Check the Weekly Plan tab — you should see AI-generated meals
5. Now open the admin dashboard:
   `https://your-vercel-url.vercel.app/admin/dashboard.html`
6. When asked for admin key, enter the `ADMIN_KEY` you set in Render (e.g. `Prof@SmartDiet24`)
7. You should see your user listed with all their data ✓

---

# PART 3 — Share and use

---

## Sharing the app with your professor

Give them this URL: **`https://smartdiet-planner.vercel.app`**

They can open it from any browser, any device. No installation needed.

For the admin dashboard (to show all user data):
**`https://smartdiet-planner.vercel.app/admin/dashboard.html`**
Admin key: whatever you set as `ADMIN_KEY` in Render

---

## Useful links after deployment

| What | URL |
|------|-----|
| **Your App** | `https://smartdiet-planner.vercel.app` |
| **Admin Dashboard** | `https://smartdiet-planner.vercel.app/admin/dashboard.html` |
| **API Health** | `https://smartdiet-api.onrender.com/health` |
| **API Docs** | `https://smartdiet-api.onrender.com/docs` |
| **Database** | `https://supabase.com/dashboard` |
| **Backend logs** | Render dashboard → smartdiet-api → Logs |

---

## Every time you make changes

After editing any file:
```cmd
cd %USERPROFILE%\Desktop\SmartDiet_Production
git add .
git commit -m "describe what you changed"
git push
```
Vercel automatically redeploys the frontend within 1 minute.
Render automatically redeploys the backend within 3 minutes.

---

# Troubleshooting

**"Cannot find module" or pip error on Render:**
Make sure Root Directory is set to `backend` in your Render service settings.

**Login works locally but fails on live URL:**
Open browser DevTools (F12) → Console tab. If you see a CORS error, double-check that `SMARTDIET_API_URL` in `index.html` exactly matches your Render URL (no trailing slash).

**First login is very slow (30 seconds):**
Render free tier sleeps after 15 minutes of no traffic. The first request wakes it up. Completely normal — after that it responds instantly.

**Admin dashboard says "Unauthorized":**
Enter exactly the value you put in `ADMIN_KEY` environment variable on Render (it is case-sensitive).

**Supabase says "Project paused":**
Free Supabase projects pause after 1 week of zero database activity. Go to https://supabase.com/dashboard → your project → click the green **Restore** button. Takes about 1 minute.

**git push asks for password every time:**
Run this once to cache your credentials:
```cmd
git config --global credential.helper manager
```

**"src refspec main does not match any" error:**
Run `git status` first to confirm files were added, then retry `git commit`.

