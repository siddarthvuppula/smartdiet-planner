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
