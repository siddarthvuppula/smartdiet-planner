/* Smart Diet Planner -- js/auth.js  (Production)
   Auth flow: validate locally → call Render API → store token
   Phone format: countryCode + 10-digit mobile  e.g. +919876543210 */
'use strict';

var _authMode = 'login';

function setMode(mode) {
  _authMode = mode;
  document.getElementById('btn-login').classList.toggle('active', mode==='login');
  document.getElementById('btn-signup').classList.toggle('active', mode==='signup');
  document.getElementById('signup-fields').style.display = mode==='signup' ? 'block' : 'none';
}

function handleAuth() {
  var mobile = document.getElementById('in-mobile').value.trim();
  var code   = (document.getElementById('in-country') || {value:'+91'}).value;
  var phone  = code + mobile;
  var pass   = document.getElementById('in-pass').value.trim();

  document.getElementById('login-err').style.display = 'none';
  if (!mobile || !pass) { _showAuthError('Please fill all required fields.'); return; }
  if (!/^\d{10}$/.test(mobile)) { _showAuthError('Please enter a valid 10-digit mobile number.'); return; }
  if (pass.length < 6)  { _showAuthError('Password must be at least 6 characters.'); return; }

  _setLoading(true);

  if (_authMode === 'signup') _handleSignup(phone, mobile, code, pass);
  else _handleLogin(phone, mobile, code, pass);
}

// ── SIGN UP ───────────────────────────────────────────────────────
function _handleSignup(phone, mobile, code, pass) {
  var fname    = document.getElementById('in-fname').value.trim();
  var lname    = document.getElementById('in-lname').value.trim();
  var diet     = document.getElementById('in-diet').value;
  var ageRaw   = document.getElementById('in-age').value.trim();
  var diabetic = document.getElementById('in-diabetic').value === 'yes';

  if (!fname || !lname || !ageRaw) {
    _setLoading(false);
    _showAuthError('Please fill all required fields.'); return;
  }

  var age = parseInt(ageRaw, 10);
  if (isNaN(age) || age < AGE_MIN || age > AGE_MAX) {
    _setLoading(false);
    _showAuthError('Age must be between ' + AGE_MIN + ' and ' + AGE_MAX + ' years.'); return;
  }

  var weightRaw = document.getElementById('in-weight') ? document.getElementById('in-weight').value.trim() : '';
  var weight    = parseFloat(weightRaw) || 0;
  var heightCm  = (typeof getHeightCm  === 'function') ? getHeightCm()      : 0;
  var heightStr = (typeof getHeightDisplay === 'function') ? getHeightDisplay() : '';
  var bmi       = (weight > 0 && heightCm > 0)
                  ? parseFloat((weight / ((heightCm/100)*(heightCm/100))).toFixed(1)) : 0;

  var userObj = {
    phone: phone, mobile: mobile, countryCode: code,
    fname: fname, lname: lname, pass: pass,
    diet: diet, age: age, diabetic: diabetic,
    weight: weight,
    height: heightCm,       // stored in cm for calculations
    heightDisplay: heightStr, // stored as "5 ft 7 in" for display
    bmi: bmi,
    signupDate: new Date().toISOString()
  };

  // Try server first, then fall back to localStorage-only
  apiSignup(userObj).then(function(res) {
    _setLoading(false);
    if (res.error === 'User already exists') {
      _showAuthError('This mobile number is already registered. Please log in.'); return;
    }
    if (res.error) {
      _showAuthError('Signup failed: ' + res.error); return;
    }
    // Store token from server
    if (res.token) STATE.token = res.token;

    // Also save in localStorage for offline support
    registerUser(userObj);
    STATE.user = userObj;
    resetWeekData();
    saveState();
    enterApp();
  }).catch(function() {
    _setLoading(false);
    // Offline / server down — still work via localStorage
    if (findUser(phone)) {
      _showAuthError('This mobile number is already registered. Please log in.'); return;
    }
    registerUser(userObj);
    STATE.user = userObj;
    resetWeekData();
    saveState();
    enterApp();
  });
}

// ── LOGIN ─────────────────────────────────────────────────────────
function _handleLogin(phone, mobile, code, pass) {
  // Try server first for token-based auth
  apiLogin(phone, pass).then(function(res) {
    _setLoading(false);
    if (res.error) {
      // Fallback: try localStorage
      var stored = findUser(phone);
      if (!stored || stored.pass !== pass) {
        _showAuthError('Invalid mobile number or password.'); return;
      }
      STATE.user = stored;
      _completeLogin(phone);
      return;
    }
    // Server login OK — update user data from server response
    if (res.user) {
      var serverUser = res.user;
      serverUser.pass = pass;  // keep pass locally for offline login
      registerUser(serverUser);
      STATE.user = serverUser;
    } else {
      var stored = findUser(phone);
      if (!stored) { _showAuthError('User not found. Please sign up first.'); return; }
      STATE.user = stored;
    }
    if (res.token) STATE.token = res.token;
    _completeLogin(phone);
  }).catch(function() {
    _setLoading(false);
    // Completely offline — use localStorage
    var stored = findUser(phone);
    if (!stored || stored.pass !== pass) {
      _showAuthError('Invalid mobile number or password.'); return;
    }
    STATE.user = stored;
    _completeLogin(phone);
  });
}

function _completeLogin(phone) {
  resetWeekData();
  loadStateForUser(phone);
  saveState();
  enterApp();
}

// ── ENTER APP ─────────────────────────────────────────────────────
function enterApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  var u = STATE.user;
  document.getElementById('user-chip').textContent = u.fname + ' ' + u.lname;

  var pill = document.getElementById('profile-pill');
  if (pill) {
    pill.textContent = u.diabetic ? '🩺 Diabetic' : '✅ Non-Diabetic';
    pill.className   = 'profile-pill ' + (u.diabetic ? 'diabetic' : 'healthy');
    pill.title       = getUserProfileLabel();
  }

  document.getElementById('sum-day').innerHTML =
    DAYS.map(function(d){ return '<option>' + d + '</option>'; }).join('');

  renderMainMenu();
  switchTab('menu');
}

// ── SIGN OUT ──────────────────────────────────────────────────────
function signOut() {
  localStorage.removeItem(LS_SESSION_KEY);
  STATE = { user:null, token:null, currentLogDay:'Monday', currentPlanDay:'Monday',
            weekLog:{}, weekPlan:{}, carryover:{} };

  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');

  ['in-pass','in-fname','in-lname','in-age','in-mobile','in-weight','in-height'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var d = document.getElementById('in-diabetic'); if (d) d.value = 'no';
  selectDiabetic('no');
  var passEl = document.getElementById('in-pass');
  if (passEl) passEl.type = 'password';
  var toggle = document.querySelector('.pass-toggle');
  if (toggle) toggle.textContent = '👁';
  var sw = document.getElementById('pass-strength-wrap');
  if (sw) sw.style.display = 'none';
  setMode('login');
}

// ── HELPERS ───────────────────────────────────────────────────────
function _showAuthError(msg) {
  var el = document.getElementById('login-err');
  el.textContent = msg; el.style.display = 'block';
}

function _setLoading(on) {
  var btn = document.querySelector('.btn-primary');
  if (!btn) return;
  btn.disabled    = on;
  btn.textContent = on ? 'Please wait...' : 'Continue →';
}
