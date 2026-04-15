/* ================================================================
   Smart Diet Planner — js/planTab.js
   Weekly Plan Tab — renders the AI-generated diet plan
   Uses getUserIdeal() for profile-specific target bars
   ================================================================ */

'use strict';

function renderPlanTab() {
  renderPlanDayTabs();
  renderPlanStats();
  renderPlanGrid();
}

function renderPlanDayTabs() {
  const row = document.getElementById('plan-day-tabs');
  row.innerHTML = DAYS.map(d => {
    const hasPlan = !!(STATE.weekPlan[d] && Object.keys(STATE.weekPlan[d]).length);
    const active  = d === STATE.currentPlanDay ? ' active' : '';
    const dot     = hasPlan ? ' has-data' : '';
    return `<div class="day-chip${active}${dot}" onclick="selectPlanDay('${d}')">${d}</div>`;
  }).join('');
}

function selectPlanDay(day) {
  STATE.currentPlanDay = day;
  renderPlanDayTabs();
  renderPlanGrid();
}

function renderPlanStats() {
  const stats  = computePlanStats();
  const strip  = document.getElementById('plan-stats');
  const colour = stats.onTargetPct >= 70 ? 'var(--green)' : 'var(--amber)';
  const daily  = getUserDailyIdeal();

  strip.innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${stats.totalDays}</div>
      <div class="stat-lbl">Days Logged</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${stats.avgCalPerDay}</div>
      <div class="stat-lbl">Avg kcal / day
        <span style="font-size:.65rem;color:var(--muted);display:block">target ${daily.calories}</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${stats.skippedMeals}</div>
      <div class="stat-lbl">Skipped Meals</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:${colour}">${stats.onTargetPct}%</div>
      <div class="stat-lbl">On-Target Meals</div>
    </div>`;
}

function renderPlanGrid() {
  const grid      = document.getElementById('plan-grid');
  const day       = STATE.currentPlanDay;
  const userIdeal = getUserIdeal();
  const isDiab    = STATE.user?.diabetic;

  if (!STATE.weekPlan[day] || !Object.keys(STATE.weekPlan[day]).length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">
        <div style="font-size:2rem;margin-bottom:12px">🗓</div>
        No plan generated for <b>${day}</b> yet.<br/>
        Go to <b>Log Meals</b>, log your food, then click
        <b>"Save Day &amp; Generate Plan"</b>.
      </div>`;
    return;
  }

  grid.innerHTML = '';

  MEALS.forEach(meal => {
    const foods   = getPlanFoods(day, meal);
    const logData = getMealLog(day, meal);
    const skipped = logData.skipped;
    const carry   = STATE.carryover[day]?.[meal];
    const total   = sumNutrients(foods);
    const mKey    = meal.toLowerCase();
    const ideal   = userIdeal[mKey] || IDEAL[mKey] || IDEAL['dinner'];

    // ── Status badge ──
    let statusHtml;
    if      (skipped) statusHtml = `<span class="plan-meal-status status-skipped">Skipped</span>`;
    else if (carry)   statusHtml = `<span class="plan-meal-status status-adjusted">⚡ Adjusted</span>`;
    else              statusHtml = `<span class="plan-meal-status status-ok">Generated</span>`;

    // ── Sugar alert for diabetics ──
    const sugarAlert = isDiab && total.sugar > ideal.sugar
      ? `<div style="background:var(--red-dim);border:1px solid var(--red);
                     padding:6px 14px;font-size:.75rem;color:var(--red)">
           🩺 Sugar ${total.sugar.toFixed(1)}g exceeds diabetic limit of ${ideal.sugar}g
         </div>`
      : '';

    const compBanner = carry ? `
      <div style="background:#1c1a0a;border-bottom:1px solid var(--amber);
                  padding:8px 14px;font-size:.76rem;color:var(--amber)">
        ⚡ Targets boosted by <b>${Math.round(carry.calories)} kcal</b>
        to compensate for skipped previous meal
      </div>` : '';

    const rows = foods.map(foodTableRow).join('') ||
      `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:16px">—</td></tr>`;

    const card = document.createElement('div');
    card.className = 'plan-meal-card fade-in';
    card.innerHTML = `
      <div class="plan-meal-header">
        <span class="plan-meal-title">${MEAL_ICONS[meal]} ${meal}</span>
        ${statusHtml}
      </div>
      ${compBanner}${sugarAlert}
      <div class="table-wrap" style="border:none;border-radius:0;margin:0">
        <table class="data-table">
          <thead>
            <tr><th>Food</th><th>Cal</th><th>Pro</th><th>Fat</th><th>Carbs</th><th>Fib</th><th>Sug</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>${totalFooterRow(total, 'Total')}</tr></tfoot>
        </table>
      </div>
      <div class="bar-section">${nutrientBars(total, ideal)}</div>`;

    grid.appendChild(card);
  });
}
