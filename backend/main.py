"""
Smart Diet Planner — backend/main.py
FastAPI backend for Render.com deployment
Database: Supabase (PostgreSQL)
"""

import os, hashlib, secrets, json
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

# ── Supabase (lazy init so startup never crashes) ─────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
JWT_SECRET   = os.environ.get("JWT_SECRET", "dev_secret_change_me").strip()
PASS_SALT    = os.environ.get("PASS_SALT",  "dev_salt_change_me").strip()
ADMIN_KEY    = os.environ.get("ADMIN_KEY",  "admin").strip()

_supabase = None

def get_db():
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(500, "Supabase not configured — check environment variables")
        try:
            from supabase import create_client
            _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            raise HTTPException(500, f"Supabase connection failed: {str(e)}")
    return _supabase

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(title="Smart Diet Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return hashlib.sha256(f"{PASS_SALT}{password}".encode()).hexdigest()

def make_token(phone: str) -> str:
    raw = f"{phone}:{datetime.now().isoformat()}:{JWT_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]

# ── Routes ────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Smart Diet Planner API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"ok": True, "time": datetime.now().isoformat(),
            "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY)}

# ── POST /api/signup ──────────────────────────────────────────────
@app.post("/api/signup")
def signup(data: dict):
    db    = get_db()
    u     = data.get("user", {})
    phone = str(u.get("phone", "")).strip()
    if not phone:
        raise HTTPException(400, "Phone required")

    age      = int(u.get("age", 0))
    diabetic = bool(u.get("diabetic", False))
    band     = "young" if age <= 35 else "middle"
    cond     = "diabetic" if diabetic else "non-diabetic"
    now      = datetime.now().isoformat()

    # Duplicate check
    existing = db.table("users").select("phone").eq("phone", phone).execute()
    if existing.data:
        raise HTTPException(409, "User already exists")

    row = {
        "phone":           phone,
        "mobile":          u.get("mobile", ""),
        "country_code":    u.get("countryCode", "+91"),
        "first_name":      u.get("fname", ""),
        "last_name":       u.get("lname", ""),
        "diet_preference": u.get("diet", "vegan"),
        "age":             age,
        "age_group":       "18-35" if band == "young" else "36-59",
        "diabetic":        diabetic,
        "profile_key":     f"{cond}-{band}",
        "password_hash":   hash_password(str(u.get("pass", u.get("password", "")))),
        "signup_date":     now,
        "last_login":      now,
    }
    db.table("users").insert(row).execute()

    token = make_token(phone)
    db.table("sessions").upsert({"phone": phone, "token": token, "created_at": now}).execute()

    print(f"[Signup] {row['first_name']} {row['last_name']} | {phone} | {cond}-{band}")
    return {"ok": True, "token": token}

# ── POST /api/login ───────────────────────────────────────────────
@app.post("/api/login")
def login(data: dict):
    db       = get_db()
    phone    = str(data.get("phone", "")).strip()
    password = str(data.get("password", "")).strip()

    res = db.table("users").select("*").eq("phone", phone).execute()
    if not res.data:
        raise HTTPException(401, "User not found. Please sign up first.")

    user = res.data[0]
    if user["password_hash"] != hash_password(password):
        raise HTTPException(401, "Incorrect password.")

    now   = datetime.now().isoformat()
    token = make_token(phone)
    db.table("users").update({"last_login": now}).eq("phone", phone).execute()
    db.table("sessions").upsert({"phone": phone, "token": token, "created_at": now}).execute()

    print(f"[Login]  {user['first_name']} {user['last_name']} | {phone}")
    return {
        "ok": True, "token": token,
        "user": {
            "phone":       user["phone"],
            "mobile":      user.get("mobile", ""),
            "countryCode": user.get("country_code", "+91"),
            "fname":       user["first_name"],
            "lname":       user["last_name"],
            "diet":        user["diet_preference"],
            "age":         user["age"],
            "diabetic":    user["diabetic"],
            "profile_key": user["profile_key"],
        }
    }

# ── POST /api/save ────────────────────────────────────────────────
@app.post("/api/save")
def save_data(data: dict):
    db    = get_db()
    u     = data.get("user", {})
    phone = str(u.get("phone", "")).strip()
    full  = f'{u.get("fname","")}{" " if u.get("lname","") else ""}{u.get("lname","")}'
    now   = datetime.now().isoformat()

    # ── Meal log ──────────────────────────────────────────────────
    log_rows = []
    for day, meals in data.get("weekLog", {}).items():
        for meal, mdata in meals.items():
            if mdata.get("skipped"):
                log_rows.append({
                    "phone": phone, "full_name": full, "day": day, "meal_type": meal,
                    "food_name": "SKIPPED", "calories": 0, "protein": 0, "fat": 0,
                    "carbs": 0, "fiber": 0, "sugar": 0, "skipped": True, "logged_at": now
                })
            for f in mdata.get("foods", []):
                log_rows.append({
                    "phone": phone, "full_name": full, "day": day, "meal_type": meal,
                    "food_name": f.get("food_name", ""),
                    "calories": round(float(f.get("calories", 0)), 1),
                    "protein":  round(float(f.get("protein",  0)), 1),
                    "fat":      round(float(f.get("fat",      0)), 1),
                    "carbs":    round(float(f.get("carbs",    0)), 1),
                    "fiber":    round(float(f.get("fiber",    0)), 1),
                    "sugar":    round(float(f.get("sugar",    0)), 1),
                    "skipped": False, "logged_at": now
                })

    if log_rows:
        db.table("meal_logs").delete().eq("phone", phone).execute()
        db.table("meal_logs").insert(log_rows).execute()

    # ── Meal plan ─────────────────────────────────────────────────
    carryover = data.get("carryover", {})
    plan_rows = []
    for day, meals in data.get("weekPlan", {}).items():
        for meal, foods in meals.items():
            comp = bool(carryover.get(day, {}).get(meal))
            for f in foods:
                plan_rows.append({
                    "phone": phone, "full_name": full, "day": day, "meal_type": meal,
                    "food_name": f.get("food_name", ""),
                    "calories": round(float(f.get("calories", 0)), 1),
                    "protein":  round(float(f.get("protein",  0)), 1),
                    "fat":      round(float(f.get("fat",      0)), 1),
                    "carbs":    round(float(f.get("carbs",    0)), 1),
                    "fiber":    round(float(f.get("fiber",    0)), 1),
                    "sugar":    round(float(f.get("sugar",    0)), 1),
                    "compensation_active": comp, "generated_at": now
                })

    if plan_rows:
        db.table("meal_plans").delete().eq("phone", phone).execute()
        db.table("meal_plans").insert(plan_rows).execute()

    print(f"[Save]   {full} | {phone} | log:{len(log_rows)} | plan:{len(plan_rows)}")
    return {"ok": True}

# ── GET /api/users ────────────────────────────────────────────────
@app.get("/api/users")
def get_users(x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(403, "Unauthorized — wrong admin key")
    db  = get_db()
    res = db.table("users").select(
        "phone,mobile,country_code,first_name,last_name,"
        "diet_preference,age,age_group,diabetic,profile_key,"
        "signup_date,last_login"
    ).order("signup_date", desc=True).execute()
    return {"users": res.data, "total": len(res.data)}

# ── GET /api/user/{phone} ─────────────────────────────────────────
@app.get("/api/user/{phone}")
def get_user(phone: str, x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(403, "Unauthorized — wrong admin key")
    db    = get_db()
    user  = db.table("users").select("*").eq("phone", phone).execute()
    logs  = db.table("meal_logs").select("*").eq("phone", phone).execute()
    plans = db.table("meal_plans").select("*").eq("phone", phone).execute()
    if not user.data:
        raise HTTPException(404, "User not found")
    return {"user": user.data[0], "log": logs.data, "plan": plans.data}
