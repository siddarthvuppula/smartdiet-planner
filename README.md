# 🥗 Smart Diet Planner
**AI-powered nutritional recommendation system**
MCS 7013 Research Project · Siddarth Vuppula · Dr. Wisam Bukaita

---

## Live Demo
Once deployed:
- **App**: https://smartdiet-planner.vercel.app
- **Admin**: https://smartdiet-planner.vercel.app/admin/dashboard.html
- **API**: https://smartdiet-api.onrender.com/docs

---

## Tech Stack
| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | HTML5 · CSS3 · Vanilla JS | Vercel (free) |
| Backend API | Python · FastAPI | Render (free) |
| Database | PostgreSQL via Supabase | Supabase (free) |
| Food Database | 2,350 foods · FDC + NDB | Embedded JS |

---

## Features
- 4 nutrition profiles (diabetic/non-diabetic × age group)
- WHO/FAO + ADA 2024 nutrient targets
- AI plan generator (MAE scoring with diabetic sugar penalty)
- Missed meal compensation engine
- Weekly overview heatmap with NAR
- Multi-user auth with country code + mobile number
- Admin dashboard with user data export

---

## Deploy
See `DEPLOY.md` for complete step-by-step instructions.
Everything deploys free on Supabase + Render + Vercel.

---

## Run Locally
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase keys
uvicorn main:app --reload --port 8080
```
Then open `index.html` via `python -m http.server 8080` in the root folder.
