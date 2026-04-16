"""
Smart Diet Planner — backend/main.py
FastAPI backend for Render.com + Supabase
"""

import os, hashlib, secrets
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
JWT_SECRET   = os.environ.get("JWT_SECRET",  "dev_secret").strip()
PASS_SALT    = os.environ.get("PASS_SALT",   "dev_salt").strip()
ADMIN_KEY    = os.environ.get("ADMIN_KEY",   "admin").strip()

app = FastAPI(title="Smart Diet Planner API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── Supabase lazy init ────────────────────────────────────────────
_sb = None
def db():
    global _sb
    if _sb is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(500, "Supabase env vars missing")
        import supabase as sb_module
        _sb = sb_module.create_client(SUPABASE_URL, SUPABASE_KEY)
    return _sb

def hp(p): return hashlib.sha256(f"{PASS_SALT}{p}".encode()).hexdigest()
def tok(phone): return hashlib.sha256(f"{phone}{JWT_SECRET}{datetime.now().isoformat()}".encode()).hexdigest()[:32]

# ── Routes ────────────────────────────────────────────────────────
@app.get("/")
def root(): return {"status": "Smart Diet Planner API running", "version": "1.0.0"}

@app.get("/health")
def health(): return {"ok": True, "time": datetime.now().isoformat(),
                      "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY)}

@app.post("/api/signup")
def signup(data: dict):
    u     = data.get("user", {})
    phone = str(u.get("phone", "")).strip()
    if not phone: raise HTTPException(400, "Phone required")

    age  = int(u.get("age", 0))
    diab = bool(u.get("diabetic", False))
    band = "young" if age <= 35 else "middle"
    cond = "diabetic" if diab else "non-diabetic"
    now  = datetime.now().isoformat()

    d = db()
    if d.table("users").select("phone").eq("phone", phone).execute().data:
        raise HTTPException(409, "User already exists")

    weight     = float(u.get("weight", 0) or 0)
    height_cm  = float(u.get("height", 0) or 0)
    height_str = str(u.get("heightDisplay", "")).strip()
    bmi        = round(weight / ((height_cm/100)**2), 1) if height_cm > 0 and weight > 0 else 0

    d.table("users").insert({
        "phone": phone, "mobile": u.get("mobile",""),
        "country_code": u.get("countryCode","+91"),
        "first_name": u.get("fname",""), "last_name": u.get("lname",""),
        "diet_preference": u.get("diet","vegan"),
        "age": age, "age_group": "18-35" if band=="young" else "36-59",
        "diabetic": diab, "profile_key": f"{cond}-{band}",
        "weight_kg": weight, "height_cm": height_cm,
        "height_display": height_str, "bmi": bmi,
        "password_hash": hp(str(u.get("pass", u.get("password","")))),
        "signup_date": now, "last_login": now
    }).execute()

    t = tok(phone)
    d.table("sessions").upsert({"phone": phone, "token": t, "created_at": now}).execute()
    print(f"[Signup] {u.get('fname','')} {u.get('lname','')} | {phone}")
    return {"ok": True, "token": t}

@app.post("/api/login")
def login(data: dict):
    phone = str(data.get("phone","")).strip()
    pwd   = str(data.get("password","")).strip()
    d     = db()
    res   = d.table("users").select("*").eq("phone", phone).execute()
    if not res.data: raise HTTPException(401, "User not found")
    u = res.data[0]
    if u["password_hash"] != hp(pwd): raise HTTPException(401, "Wrong password")
    now = datetime.now().isoformat()
    t   = tok(phone)
    d.table("users").update({"last_login": now}).eq("phone", phone).execute()
    d.table("sessions").upsert({"phone": phone, "token": t, "created_at": now}).execute()
    print(f"[Login]  {u['first_name']} {u['last_name']} | {phone}")
    return {"ok": True, "token": t, "user": {
        "phone": u["phone"], "mobile": u.get("mobile",""),
        "countryCode": u.get("country_code","+91"),
        "fname": u["first_name"], "lname": u["last_name"],
        "diet": u["diet_preference"], "age": u["age"],
        "diabetic": u["diabetic"], "profile_key": u["profile_key"],
        "weight": u.get("weight_kg", 0),
        "height": u.get("height_cm", 0),
        "heightDisplay": u.get("height_display", ""),
        "bmi": u.get("bmi", 0)
    }}

@app.post("/api/save")
def save(data: dict):
    u     = data.get("user", {})
    phone = str(u.get("phone","")).strip()
    full  = f'{u.get("fname","")} {u.get("lname","")}'.strip()
    now   = datetime.now().isoformat()
    d     = db()

    logs = []
    for day, meals in data.get("weekLog", {}).items():
        for meal, md in meals.items():
            if md.get("skipped"):
                logs.append({"phone":phone,"full_name":full,"day":day,"meal_type":meal,
                    "food_name":"SKIPPED","calories":0,"protein":0,"fat":0,
                    "carbs":0,"fiber":0,"sugar":0,"skipped":True,"logged_at":now})
            for f in md.get("foods",[]):
                logs.append({"phone":phone,"full_name":full,"day":day,"meal_type":meal,
                    "food_name":f.get("food_name",""),
                    "calories":round(float(f.get("calories",0)),1),
                    "protein":round(float(f.get("protein",0)),1),
                    "fat":round(float(f.get("fat",0)),1),
                    "carbs":round(float(f.get("carbs",0)),1),
                    "fiber":round(float(f.get("fiber",0)),1),
                    "sugar":round(float(f.get("sugar",0)),1),
                    "skipped":False,"logged_at":now})
    if logs:
        d.table("meal_logs").delete().eq("phone",phone).execute()
        d.table("meal_logs").insert(logs).execute()

    plans = []
    co = data.get("carryover",{})
    for day, meals in data.get("weekPlan",{}).items():
        for meal, foods in meals.items():
            comp = bool(co.get(day,{}).get(meal))
            for f in foods:
                plans.append({"phone":phone,"full_name":full,"day":day,"meal_type":meal,
                    "food_name":f.get("food_name",""),
                    "calories":round(float(f.get("calories",0)),1),
                    "protein":round(float(f.get("protein",0)),1),
                    "fat":round(float(f.get("fat",0)),1),
                    "carbs":round(float(f.get("carbs",0)),1),
                    "fiber":round(float(f.get("fiber",0)),1),
                    "sugar":round(float(f.get("sugar",0)),1),
                    "compensation_active":comp,"generated_at":now})
    if plans:
        d.table("meal_plans").delete().eq("phone",phone).execute()
        d.table("meal_plans").insert(plans).execute()

    print(f"[Save] {full} | log:{len(logs)} plan:{len(plans)}")
    return {"ok": True}

@app.get("/api/users")
def get_users(x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_KEY: raise HTTPException(403, "Unauthorized")
    d   = db()
    res = d.table("users").select(
        "phone,mobile,country_code,first_name,last_name,"
        "diet_preference,age,age_group,diabetic,profile_key,"
        "weight_kg,height_cm,height_display,bmi,signup_date,last_login"
    ).order("signup_date", desc=True).execute()
    return {"users": res.data, "total": len(res.data)}

@app.get("/api/user/{phone}")
def get_user(phone: str, x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_KEY: raise HTTPException(403, "Unauthorized")
    d     = db()
    user  = d.table("users").select("*").eq("phone", phone).execute()
    logs  = d.table("meal_logs").select("*").eq("phone", phone).execute()
    plans = d.table("meal_plans").select("*").eq("phone", phone).execute()
    if not user.data: raise HTTPException(404, "User not found")
    return {"user": user.data[0], "log": logs.data, "plan": plans.data}
