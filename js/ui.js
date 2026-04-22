/* ================================================================
   Smart Diet Planner — js/ui.js
   Tab navigation, toast, shared UI utilities, Main Menu renderer
   ================================================================ */

'use strict';

const ALL_TABS = ['menu', 'log', 'plan', 'summary', 'overview'];

// ── TAB NAVIGATION ───────────────────────────────────────────────
function switchTab(tabId) {
  ALL_TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tabId);
    document.getElementById(`tab-content-${t}`).style.display = t === tabId ? 'block' : 'none';
  });
  switch (tabId) {
    case 'log':      initLogDay();      break;
    case 'plan':     renderPlanTab();   break;
    case 'summary':  renderSummary();   break;
    case 'overview': renderOverview();  break;
    case 'menu':     renderMainMenu();  break;
  }
}

// ── TOAST ────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'green', duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ── MAIN MENU RENDERER ────────────────────────────────────────────
/**
 * Dynamically render the Ideal Nutrient Intake table
 * using the current user's profile-specific targets.
 * Called on login and every time the Menu tab is opened.
 */
function renderMainMenu() {
  const userIdeal      = getUserIdeal();
  const userDailyIdeal = getUserDailyIdeal();
  const u              = STATE.user;
  if (!u) return;

  const isDiabetic = u.diabetic;
  const profileKey = resolveProfileKey(u.age, isDiabetic);

  // Render daily dashboard at top of menu
  renderDailyDashboard();

  const profileLabels = {
    'non-diabetic-young':  'Non-Diabetic · Young Adult (18–35)',
    'non-diabetic-middle': 'Non-Diabetic · Middle Adult (36–59)',
    'diabetic-young':      'Diabetic · Young Adult (18–35)',
    'diabetic-middle':     'Diabetic · Middle Adult (36–59)'
  };

  const profileNotes = {
    'non-diabetic-young':  'Standard WHO/FAO targets for active young adults.',
    'non-diabetic-middle': 'WHO/FAO targets for adults with slightly lower metabolic rate.',
    'diabetic-young':      'ADA 2024 guidelines: reduced carbs & sugar, high fiber for blood glucose control.',
    'diabetic-middle':     'ADA 2024 guidelines: further reduced calories & carbs for middle-age diabetic management.'
  };

  // ── Profile banner ──
  const bannerEl = document.getElementById('menu-profile-banner');
  if (bannerEl) {
    bannerEl.innerHTML = `
      <div class="profile-banner ${isDiabetic ? 'diabetic' : 'healthy'}">
        <div class="pb-left">
          <span class="pb-icon">${isDiabetic ? '🩺' : '✅'}</span>
          <div>
            <div class="pb-title">${profileLabels[profileKey]}</div>
            <div class="pb-note">${profileNotes[profileKey]}</div>
          </div>
        </div>
        <div class="pb-targets">
          <span class="pb-stat"><b>${userDailyIdeal.calories}</b> kcal/day</span>
          <span class="pb-stat"><b>${userDailyIdeal.carbs}g</b> carbs</span>
          <span class="pb-stat"><b>${userDailyIdeal.sugar}g</b> sugar</span>
          <span class="pb-stat"><b>${userDailyIdeal.fiber}g</b> fiber</span>
          ${u.weight ? `<span class="pb-stat"><b>${u.weight}kg</b> weight</span>` : ''}
          ${u.bmi    ? `<span class="pb-stat"><b>${u.bmi}</b> BMI</span>` : ''}
        </div>
      </div>`;
  }

  // ── Ideal cards ──
  const meals = [
    { key: 'break-fast', icon: '🌅', label: 'Break-fast' },
    { key: 'lunch',      icon: '☀️', label: 'Lunch'      },
    { key: 'snacks',     icon: '🍎', label: 'Snacks'     },
    { key: 'dinner',     icon: '🌙', label: 'Dinner'     }
  ];

  const gridEl = document.getElementById('menu-ideal-grid');
  if (gridEl) {
    gridEl.innerHTML = meals.map(m => {
      const t = userIdeal[m.key];
      return `<div class="ideal-card">
        <div class="ic-icon">${m.icon}</div>
        <div class="ic-name">${m.label}</div>
        <div class="ic-row"><span class="ic-lbl">Calories</span><span class="ic-val">${t.calories} kcal</span></div>
        <div class="ic-row"><span class="ic-lbl">Protein</span> <span class="ic-val">${t.protein} g</span></div>
        <div class="ic-row"><span class="ic-lbl">Fat</span>     <span class="ic-val">${t.fat} g</span></div>
        <div class="ic-row"><span class="ic-lbl">Carbs</span>   <span class="ic-val">${t.carbs} g</span></div>
        <div class="ic-row"><span class="ic-lbl">Fiber</span>   <span class="ic-val">${t.fiber} g</span></div>
        <div class="ic-row ${isDiabetic ? 'ic-row-warn' : ''}">
          <span class="ic-lbl">Sugar ${isDiabetic ? '⚠' : ''}</span>
          <span class="ic-val ${isDiabetic ? 'warn-val' : ''}">${t.sugar} g</span>
        </div>
      </div>`;
    }).join('');
  }

  // ── Daily totals table ──
  const tableEl = document.getElementById('menu-totals-table');
  if (tableEl) {
    const bf = userIdeal['break-fast'];
    const lu = userIdeal['lunch'];
    const sn = userIdeal['snacks'];
    const di = userIdeal['dinner'];

    const rows = [
      ['Calories (kcal)', bf.calories, lu.calories, sn.calories, di.calories, userDailyIdeal.calories, true],
      ['Protein (g)',     bf.protein,  lu.protein,  sn.protein,  di.protein,  userDailyIdeal.protein,  false],
      ['Fat (g)',         bf.fat,      lu.fat,      sn.fat,      di.fat,      userDailyIdeal.fat,      false],
      ['Carbs (g)',       bf.carbs,    lu.carbs,    sn.carbs,    di.carbs,    userDailyIdeal.carbs,    false],
      ['Fiber (g)',       bf.fiber,    lu.fiber,    sn.fiber,    di.fiber,    userDailyIdeal.fiber,    false],
      [`Sugar (g)${isDiabetic ? ' ⚠' : ''}`,
                         bf.sugar,    lu.sugar,    sn.sugar,    di.sugar,    userDailyIdeal.sugar,    false]
    ];

    tableEl.innerHTML = rows.map(([label, a, b, c, d, total, highlight]) => `
      <tr>
        <td>${label}</td>
        <td>${a}</td><td>${b}</td><td>${c}</td><td>${d}</td>
        <td style="${highlight ? 'color:var(--green);font-weight:700' : ''}">${typeof total === 'number' ? total.toLocaleString() : total}</td>
      </tr>`).join('');
  }
}

// ── SHARED RENDER HELPERS ─────────────────────────────────────────

function foodTableRow(food) {
  return `<tr>
    <td title="${esc(food.food_name)}">${esc(food.food_name)}</td>
    <td>${food.calories}</td><td>${food.protein}</td><td>${food.fat}</td>
    <td>${food.carbs}</td><td>${food.fiber}</td>
    <td${food.sugar > DIABETIC_SUGAR_LIMIT && STATE.user?.diabetic
         ? ' style="color:var(--amber);font-weight:600"' : ''}>${food.sugar}</td>
  </tr>`;
}

function totalFooterRow(total, label = 'Total Nutrients') {
  return `<td>${label}</td>
    <td>${total.calories.toFixed(1)}</td><td>${total.protein.toFixed(1)}</td>
    <td>${total.fat.toFixed(1)}</td><td>${total.carbs.toFixed(1)}</td>
    <td>${total.fiber.toFixed(1)}</td><td>${total.sugar.toFixed(1)}</td>`;
}

function nutrientBars(total, ideal) {
  return ['calories', 'protein', 'carbs'].map(n => {
    const p   = clamp(pct(total[n], ideal[n]), 0, 150);
    const cls = nutrientClass(p);
    return `<div class="bar-row">
      <span class="bar-lbl">${n}</span>
      <div class="bar-track">
        <div class="bar-fill ${cls}" style="width:${clamp(p, 0, 100)}%"></div>
      </div>
      <span class="bar-pct">${p}%</span>
    </div>`;
  }).join('');
}

function vsIdealCards(total, ideal) {
  return NUTRIENTS.map(n => {
    const act  = total[n];
    const idl  = ideal[n];
    const p    = pct(act, idl);
    const { label, cls } = idealBadge(p);
    // Highlight sugar for diabetics
    const isDiabSugar = n === 'sugar' && STATE.user?.diabetic;
    return `<div class="vs-card${isDiabSugar ? ' vs-card-warn' : ''}">
      <div class="vs-lbl">${n.toUpperCase()}${isDiabSugar ? ' ⚠' : ''}</div>
      <div class="vs-nums">
        <span class="vs-actual${isDiabSugar && act > idl ? ' warn-val' : ''}">${act.toFixed(1)}</span>
        <span class="vs-sep">/</span>
        <span class="vs-ideal">${idl}</span>
      </div>
      <span class="vs-badge ${cls}">${label} (${p}%)</span>
    </div>`;
  }).join('');
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ================================================================
//  DAILY DASHBOARD
// ================================================================

/**
 * Render the full Daily Dashboard on the Main Menu tab.
 * Called by renderMainMenu() every time the menu tab is opened.
 */
function renderDailyDashboard() {
  const u         = STATE.user;
  const today     = _getTodayName();
  const now       = new Date();
  const userIdeal = getUserIdeal();
  const daily     = getUserDailyIdeal();

  // ── Date & greeting ──────────────────────────────────────────
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
  const hour = now.getHours();
  const greeting = hour < 12 ? `Good morning, ${u.fname}! ☀️`
                 : hour < 17 ? `Good afternoon, ${u.fname}! 🌤`
                 : `Good evening, ${u.fname}! 🌙`;

  _set('dash-date',    dateStr);
  _set('dash-greeting', greeting);
  _set('dash-day-badge', today + ' — Day ' + (DAYS.indexOf(today) + 1) + ' of 7');

  // ── Today's food data ─────────────────────────────────────────
  const todayLog   = STATE.weekLog[today] || {};
  const todayPlan  = STATE.weekPlan[today] || {};
  const carryover  = STATE.carryover[today] || {};

  // Compute today's totals across all meals
  let totalCal = 0, totalPro = 0, totalCarbs = 0,
      totalFat = 0, totalFiber = 0, totalSugar = 0;
  let mealsLogged = 0, mealsSkipped = 0;

  MEALS.forEach(meal => {
    const md = todayLog[meal] || {};
    if (md.skipped) { mealsSkipped++; return; }
    const foods = md.foods || [];
    if (foods.length > 0) mealsLogged++;
    foods.forEach(f => {
      totalCal   += (f.calories || 0);
      totalPro   += (f.protein  || 0);
      totalCarbs += (f.carbs    || 0);
      totalFat   += (f.fat      || 0);
      totalFiber += (f.fiber    || 0);
      totalSugar += (f.sugar    || 0);
    });
  });

  // ── 4 stat cards ─────────────────────────────────────────────
  const calPct = daily.calories ? Math.round(totalCal / daily.calories * 100) : 0;
  const calEl  = document.getElementById('dsc-cal-val');
  if (calEl) {
    calEl.textContent = Math.round(totalCal);
    calEl.className   = 'dsc-val' + (calPct > 115 ? ' red' : calPct > 85 ? '' : ' amber');
  }
  _set('dsc-cal-sub', `target: ${daily.calories} kcal (${calPct}%)`);

  _set('dsc-meals-val', `${mealsLogged}/4`);
  _set('dsc-meals-sub', mealsSkipped > 0
    ? `${mealsSkipped} skipped today`
    : mealsLogged === 4 ? 'All meals done ✓'
    : mealsLogged === 0 ? 'Start logging today!'
    : `${4 - mealsLogged} meals remaining`);

  // NAR for today
  let narSum = 0, narCount = 0;
  MEALS.forEach(meal => {
    const ideal = userIdeal[meal.toLowerCase()] || userIdeal['dinner'];
    const foods = (todayLog[meal] || {}).foods || [];
    const tot   = sumNutrients(foods);
    NUTRIENTS.forEach(n => {
      if (ideal[n]) { narSum += Math.min(tot[n] / ideal[n], 1); narCount++; }
    });
  });
  const nar    = narCount ? (narSum / narCount).toFixed(2) : '—';
  const narEl  = document.getElementById('dsc-nar-val');
  if (narEl) {
    narEl.textContent = nar;
    narEl.className   = 'dsc-val' + (nar >= 0.85 ? '' : nar >= 0.6 ? ' amber' : ' red');
  }
  _set('dsc-nar-sub', nar === '—' ? 'log meals to see' : nar >= 0.85 ? 'excellent!' : nar >= 0.6 ? 'keep going!' : 'needs improvement');

  // Streak: count consecutive days with any logged meals
  let streak = 0;
  for (let i = DAYS.indexOf(today); i >= 0; i--) {
    const d = DAYS[i];
    const hasLog = STATE.weekLog[d] && MEALS.some(m =>
      (STATE.weekLog[d][m] || {}).foods?.length > 0
    );
    if (hasLog) streak++; else break;
  }
  _set('dsc-streak-val', streak);
  _set('dsc-streak-sub', streak === 0 ? 'start today!'
    : streak === 1 ? '1 day — keep going!'
    : `${streak} days — great work!`);

  // ── Meal status cards ─────────────────────────────────────────
  const mealsRow = document.getElementById('dash-meals-row');
  if (mealsRow) {
    mealsRow.innerHTML = MEALS.map(meal => {
      const md     = todayLog[meal] || {};
      const foods  = md.foods || [];
      const skip   = md.skipped;
      const cal    = Math.round(sumNutrients(foods).calories);
      const status = skip ? 'skipped' : foods.length > 0 ? 'done' : 'pending';
      const icon   = MEAL_ICONS[meal];
      const badge  = skip ? '✕' : foods.length > 0 ? '✓' : '';
      const badgeCls = skip ? 'skipped' : foods.length > 0 ? 'done' : '';
      const statusTxt = skip ? 'Skipped'
        : foods.length > 0 ? `${foods.length} food${foods.length>1?'s':''}`
        : 'Not logged yet';
      const calTxt = cal > 0 ? `${cal} kcal` : '';
      return `<div class="dash-meal-card ${status}" onclick="switchTab('log')">
        ${badge ? `<div class="dmc-badge ${badgeCls}">${badge}</div>` : ''}
        <div class="dmc-icon">${icon}</div>
        <div class="dmc-name">${meal}</div>
        <div class="dmc-status">${statusTxt}</div>
        ${calTxt ? `<div class="dmc-cal">${calTxt}</div>` : ''}
      </div>`;
    }).join('');
  }

  // ── Today's plan ──────────────────────────────────────────────
  const planRow   = document.getElementById('dash-plan-row');
  const planTitle = document.getElementById('dash-plan-title');
  const hasPlan   = Object.keys(todayPlan).length > 0;
  if (planTitle) planTitle.style.display = hasPlan ? 'block' : 'none';
  if (planRow && hasPlan) {
    planRow.innerHTML = MEALS.map(meal => {
      const foods = todayPlan[meal] || [];
      if (!foods.length) return '';
      const cal   = Math.round(sumNutrients(foods).calories);
      const names = foods.map(f => f.food_name).join(', ');
      return `<div class="dash-plan-meal">
        <div class="dpm-header">
          <span class="dpm-icon">${MEAL_ICONS[meal]}</span>
          <span class="dpm-name">${meal}</span>
        </div>
        <div class="dpm-foods">${esc(names)}</div>
        <div class="dpm-cal">${cal} kcal</div>
      </div>`;
    }).filter(Boolean).join('');
  }

  // ── Nutrient progress bars ────────────────────────────────────
  const nutEl = document.getElementById('dash-nutrients');
  if (nutEl) {
    const rows = [
      { key:'calories', label:'Calories', actual:totalCal,  ideal:daily.calories, unit:'kcal' },
      { key:'protein',  label:'Protein',  actual:totalPro,  ideal:daily.protein,  unit:'g'    },
      { key:'carbs',    label:'Carbs',    actual:totalCarbs,ideal:daily.carbs,    unit:'g'    },
      { key:'fat',      label:'Fat',      actual:totalFat,  ideal:daily.fat,      unit:'g'    },
      { key:'fiber',    label:'Fiber',    actual:totalFiber,ideal:daily.fiber,    unit:'g'    },
      { key:'sugar',    label:'Sugar',    actual:totalSugar,ideal:daily.sugar,    unit:'g'    },
    ];
    nutEl.innerHTML = rows.map(r => {
      const p   = r.ideal ? Math.round(r.actual / r.ideal * 100) : 0;
      const w   = Math.min(p, 100);
      const cls = p >= 85 && p <= 115 ? 'ok' : p > 115 ? 'over' : 'low';
      const col = cls === 'ok' ? '#15803d' : cls === 'over' ? '#dc2626' : '#d97706';
      return `<div class="dash-nut-row">
        <span class="dn-label">${r.label}</span>
        <div class="dn-track">
          <div class="dn-fill ${cls}" style="width:${w}%"></div>
        </div>
        <span class="dn-nums">${Math.round(r.actual)}/${r.ideal}${r.unit}</span>
        <span class="dn-pct" style="color:${col}">${p}%</span>
      </div>`;
    }).join('');
  }

  // ── Weekly mini heatmap ───────────────────────────────────────
  const weekRow = document.getElementById('dash-week-row');
  if (weekRow) {
    const todayIdx = DAYS.indexOf(today);
    weekRow.innerHTML = DAYS.map((day, i) => {
      const log    = STATE.weekLog[day] || {};
      const hasLog = MEALS.some(m => (log[m] || {}).foods?.length > 0);
      const skip   = MEALS.some(m => (log[m] || {}).skipped);
      const isTod  = i === todayIdx;
      const isFut  = i > todayIdx;
      const dayCal = Math.round(MEALS.reduce((s,m) =>
        s + sumNutrients((log[m] || {}).foods || []).calories, 0));
      let cls  = isFut ? 'future' : hasLog ? 'logged' : skip ? 'missed' : '';
      if (isTod) cls += ' today';
      const icon = isFut ? '○' : hasLog ? '✓' : skip ? '✕' : '—';
      return `<div class="dash-day-pill ${cls}" onclick="selectLogDay('${day}');switchTab('log')">
        <div class="ddp-name">${day.substring(0,3)}</div>
        <div class="ddp-icon">${icon}</div>
        <div class="ddp-cal">${dayCal > 0 ? dayCal+'cal' : ''}</div>
      </div>`;
    }).join('');
  }

  // ── Personalised tip ──────────────────────────────────────────
  _set('dash-tip-text', _getDailyTip(u, totalCal, daily.calories, mealsLogged, streak));
}

/** Return today's day name (Monday–Sunday) */
function _getTodayName() {
  const jsDay = new Date().getDay(); // 0=Sun,1=Mon...6=Sat
  const map   = [6,0,1,2,3,4,5];   // map JS day → DAYS index
  return DAYS[map[jsDay]];
}

/** Generate a personalised contextual tip */
function _getDailyTip(u, todayCal, targetCal, mealsLogged, streak) {
  const hour   = new Date().getHours();
  const isDiab = u && u.diabetic;
  const bmi    = u && u.bmi;

  // Context-aware tips
  if (mealsLogged === 0 && hour >= 7 && hour < 10)
    return "Don't skip breakfast! It kickstarts your metabolism and helps you stay on target for the day.";
  if (mealsLogged === 0 && hour >= 12 && hour < 14)
    return "You haven't logged any meals yet today. Head to Log Meals and record what you've eaten so far.";
  if (isDiab && todayCal > 0)
    return "As a diabetic user, focus on low-GI foods — oats, lentils, vegetables. Keep sugar under your daily limit.";
  if (streak >= 5)
    return `Amazing! You're on a ${streak}-day logging streak. Consistency is the key to healthy nutrition.`;
  if (streak === 0)
    return "Start logging your meals today to build your streak and get personalised diet plans!";
  if (todayCal > targetCal * 1.2)
    return "You've exceeded today's calorie target. Consider a lighter dinner and a walk after meals.";
  if (todayCal < targetCal * 0.5 && mealsLogged >= 2)
    return "Your calorie intake is low today. Make sure you're eating enough to meet your energy needs.";
  if (bmi && bmi > 25)
    return "For your BMI profile, focus on high-fibre, low-calorie-density foods like vegetables, legumes, and whole grains.";
  if (bmi && bmi < 18.5)
    return "Your BMI suggests you may benefit from increasing calorie-dense nutritious foods like nuts, avocados, and whole grains.";
  if (hour >= 20)
    return "Late-night eating? Try to keep dinner light. Heavy meals close to bedtime can affect sleep quality.";

  // Day-specific tips
  const dayTips = {
    'Monday':    "New week, fresh start! Plan your meals in advance to stay consistent all week.",
    'Tuesday':   "Stay hydrated — drink at least 8 glasses of water today alongside your meals.",
    'Wednesday': "Mid-week check-in: are you hitting your nutrient targets? Check the Weekly Overview tab.",
    'Thursday':  "Include a protein-rich snack today — Greek yogurt, boiled eggs, or a handful of nuts.",
    'Friday':    "End the week strong! Avoid skipping meals even on busy Fridays.",
    'Saturday':  "Weekend meals tend to be heavier. Balance them with light options at other meal times.",
    'Sunday':    "Plan your meals for the week ahead. Use the Weekly Plan tab to see your recommendations.",
  };
  return dayTips[_getTodayName()] || "Log your meals daily for the most accurate nutrition recommendations.";
}

/** Helper: safely set element textContent */
function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
