/* Smart Diet Planner -- js/state.js
   Production version: uses Supabase backend via Render API
   Falls back to localStorage when offline                    */
'use strict';

// ── API URL — set to your Render backend URL after deploying ─────
// During local dev this is empty string (relative URL = same server)
// After deploying to Render, set this to your Render URL:
//   e.g. 'https://smartdiet-api.onrender.com'
const API_BASE = window.SMARTDIET_API_URL || '';

const LS_SESSION_KEY = 'smartdiet_session';
const LS_DATA_KEY    = (p) => 'smartdiet_data_' + p;
const LS_USERS_KEY   = 'smartdiet_all_users';

let STATE = {
  user: null, token: null,
  currentLogDay: 'Monday', currentPlanDay: 'Monday',
  currentThermalDay: 'Monday',
  weekLog: {}, weekPlan: {}, carryover: {},
  thermalLog: {}
};

// ── LOCAL USER REGISTRY (offline support) ────────────────────────
function getAllUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS_KEY) || '{}'); }
  catch(e) { return {}; }
}
function saveAllUsers(u) { localStorage.setItem(LS_USERS_KEY, JSON.stringify(u)); }
function registerUser(obj) { var u = getAllUsers(); u[obj.phone] = obj; saveAllUsers(u); }
function findUser(phone)   { return getAllUsers()[phone] || null; }

// ── STATE PERSISTENCE ─────────────────────────────────────────────
function saveState() {
  if (!STATE.user) return;
  try {
    var data = JSON.stringify(STATE);
    localStorage.setItem(LS_DATA_KEY(STATE.user.phone), data);
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify({
      phone: STATE.user.phone, token: STATE.token
    }));
  } catch(e) { console.warn('[State] save failed:', e); }
  _pushToServer();
}

function loadState() {
  try {
    var raw = localStorage.getItem(LS_SESSION_KEY);
    if (!raw) return;
    var session = JSON.parse(raw);
    if (!session.phone) return;
    STATE.token = session.token;
    var userData = localStorage.getItem(LS_DATA_KEY(session.phone));
    if (userData) STATE = Object.assign({}, STATE, JSON.parse(userData));
  } catch(e) { console.warn('[State] load failed:', e); }
}

function loadStateForUser(phone) {
  try {
    var raw = localStorage.getItem(LS_DATA_KEY(phone));
    if (raw) STATE = Object.assign({}, STATE, JSON.parse(raw));
  } catch(e) {}
}

function resetWeekData() {
  STATE.weekLog = {}; STATE.weekPlan = {}; STATE.carryover = {};
  STATE.thermalLog = {};
  STATE.currentLogDay = 'Monday'; STATE.currentPlanDay = 'Monday';
  STATE.currentThermalDay = 'Monday';
}

// ── SERVER SYNC ───────────────────────────────────────────────────
function _pushToServer() {
  if (!STATE.user) return;
  fetch(API_BASE + '/api/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user:      STATE.user,
      token:     STATE.token || '',
      weekLog:   STATE.weekLog,
      weekPlan:  STATE.weekPlan,
      carryover: STATE.carryover,
      thermalLog: STATE.thermalLog
    })
  }).catch(function() {});  // silent — localStorage already saved
}

function apiSignup(userObj) {
  return fetch(API_BASE + '/api/signup', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user: userObj})
  }).then(function(r) { return r.json(); })
    .catch(function() { return {ok: true, dev: true}; });
}

function apiLogin(phone, password) {
  return fetch(API_BASE + '/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({phone: phone, password: password})
  }).then(function(r) { return r.json(); })
    .catch(function() { return {ok: true, dev: true}; });
}

// ── MEAL HELPERS ──────────────────────────────────────────────────
function ensureMealSlot(day, meal) {
  if (!STATE.weekLog[day]) STATE.weekLog[day] = {};
  if (!STATE.weekLog[day][meal]) STATE.weekLog[day][meal] = {foods:[], skipped:false};
}
function getMealLog(day, meal) {
  return (STATE.weekLog[day] && STATE.weekLog[day][meal])
    ? STATE.weekLog[day][meal] : {foods:[], skipped:false};
}
function getPlanFoods(day, meal) {
  return (STATE.weekPlan[day] && STATE.weekPlan[day][meal])
    ? STATE.weekPlan[day][meal] : [];
}
// ── THERMAL DATA HELPERS ────────────────────────────────────────
function ensureThermalSlot(day, meal) {
  if (!STATE.thermalLog)          STATE.thermalLog = {};
  if (!STATE.thermalLog[day])     STATE.thermalLog[day] = {};
  if (!STATE.thermalLog[day][meal]) STATE.thermalLog[day][meal] = {
    t0: null, t1: null, t2: null,   // temperatures °C
    deltaT: null,                    // ΔT = T1 - T0
    responseScore: null,             // 0-100 adherence proxy
    notes: '', recordedAt: null
  };
}

function getThermalLog(day, meal) {
  return (STATE.thermalLog && STATE.thermalLog[day] && STATE.thermalLog[day][meal])
    ? STATE.thermalLog[day][meal]
    : { t0:null, t1:null, t2:null, deltaT:null, responseScore:null, notes:'', recordedAt:null };
}

function calcThermalScore(t0, t1, t2) {
  // Postprandial thermogenesis: typical rise 0.3-1.2°C after meal
  // Higher rise within expected range = better metabolic response = higher adherence score
  if (!t0 || !t1) return null;
  var delta1 = t1 - t0;
  var delta2 = t2 ? t2 - t0 : delta1;
  // Score 0-100: optimal response is +0.5 to +1.0°C
  var optimal = 0.75;
  var score = Math.max(0, Math.min(100, 100 - Math.abs(delta1 - optimal) * 60));
  return Math.round(score);
}

function userHasThermal() {
  return STATE.user && STATE.user.thermalDevice === true;
}

function getUserProfileLabel() {
  var u = STATE.user; if (!u) return '';
  var cond = u.diabetic ? 'Diabetic' : 'Non-Diabetic';
  var band = u.age <= 35
    ? 'Age ' + u.age + ' (Young Adult)'
    : 'Age ' + u.age + ' (Middle Adult)';
  var wt = u.weight ? ' · ' + u.weight + 'kg' : '';
  var bmiStr = u.bmi ? ' · BMI ' + u.bmi : '';
  return cond + ' · ' + band + wt + bmiStr;
}
