/* ================================================================
   Smart Diet Planner — js/overviewTab.js
   Weekly Overview Tab — heatmap grids using getUserDailyIdeal()
   ================================================================ */

'use strict';

function renderOverview() {
  const wrap  = document.getElementById('weekly-heatmap-wrap');
  const daily = getUserDailyIdeal();  // profile-specific daily totals

  wrap.innerHTML = [
    _mkGrid(`Daily Calories (kcal) — Target: ${daily.calories.toLocaleString()}`,
            (d, s) => _dayNutrientTotal(d, 'calories', s), daily.calories, ''),
    _mkGrid(`Daily Protein (g) — Target: ${daily.protein}g`,
            (d, s) => _dayNutrientTotal(d, 'protein', s), daily.protein, 'g'),
    _mkGrid(`Daily Carbohydrates (g) — Target: ${daily.carbs}g`,
            (d, s) => _dayNutrientTotal(d, 'carbs', s), daily.carbs, 'g'),
    _mkGrid(`Daily Sugar (g) — Target: ${daily.sugar}g${STATE.user?.diabetic ? ' ⚠ Diabetic Limit' : ''}`,
            (d, s) => _dayNutrientTotal(d, 'sugar', s), daily.sugar, 'g'),
    _mkGrid('Nutrient Adequacy Ratio (NAR) — Target: 1.00',
            (d, s) => _dayNAR(d, s), 1, '')
  ].join('');
}

// ── PRIVATE ───────────────────────────────────────────────────────

function _dayNutrientTotal(day, nutrient, source) {
  let total = 0;
  MEALS.forEach(m => {
    const foods = source === 'log' ? getMealLog(day, m).foods : getPlanFoods(day, m);
    foods.forEach(f => { total += (f[nutrient] || 0); });
  });
  return Math.round(total);
}

function _dayNAR(day, source) {
  let sum = 0, count = 0;
  const userIdeal = getUserIdeal();
  MEALS.forEach(m => {
    const ideal = userIdeal[m.toLowerCase()] || IDEAL['dinner'];
    const foods = source === 'log' ? getMealLog(day, m).foods : getPlanFoods(day, m);
    const total = sumNutrients(foods);
    NUTRIENTS.forEach(n => {
      if (ideal[n]) { sum += Math.min(total[n] / ideal[n], 1); count++; }
    });
  });
  return count ? (sum / count).toFixed(2) : '0.00';
}

function _mkGrid(title, valueFn, idealVal, unit) {
  const isDiabSugar = title.includes('Sugar') && STATE.user?.diabetic;
  const headerCells = DAYS.map(d =>
    `<div class="wh-header">${d.substring(0, 3)}</div>`).join('');

  const rows = ['log', 'plan'].map(src => {
    const cells = DAYS.map(d => {
      const v     = valueFn(d, src);
      const p     = idealVal ? Math.round(Number(v) / idealVal * 100) : 0;
      const empty = Number(v) === 0;

      // For sugar in diabetics: over target is bad, so invert colouring
      let cls;
      if (empty) { cls = 'empty'; }
      else if (isDiabSugar) {
        cls = p <= 100 ? 'good' : p <= 115 ? 'low' : 'over';
      } else {
        cls = (p >= THRESHOLDS.ON_TARGET_LOW && p <= THRESHOLDS.ON_TARGET_HIGH) ? 'good'
            : p > THRESHOLDS.ON_TARGET_HIGH ? 'over' : 'low';
      }

      return `<div class="wh-cell ${cls}">
        ${empty ? '—' : `${v}${unit}`}
        <br/><span style="font-size:.62rem;opacity:.8">${empty ? '' : `${p}%`}</span>
      </div>`;
    }).join('');

    return `<div class="wh-row">
      <div class="wh-label">${src === 'log' ? 'My Log' : 'Plan'}</div>${cells}
    </div>`;
  }).join('');

  return `
    <div style="margin-bottom:24px">
      <div style="font-size:.82rem;font-weight:700;color:${isDiabSugar ? 'var(--amber)' : 'var(--light)'};margin-bottom:8px">
        ${title}
      </div>
      <div class="wh-row"><div></div>${headerCells}</div>
      ${rows}
    </div>`;
}
