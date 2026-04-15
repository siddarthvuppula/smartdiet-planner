/* ================================================================
   Smart Diet Planner — js/summaryTab.js
   Nutrient Summary Tab — uses getUserIdeal() for profile targets
   ================================================================ */

'use strict';

function renderSummary() {
  const day    = document.getElementById('sum-day').value;
  const meal   = document.getElementById('sum-meal').value;
  const source = document.getElementById('sum-source').value;

  let foods = [];
  if (source === 'log')  foods = getMealLog(day, meal).foods;
  else                   foods = getPlanFoods(day, meal);

  const total     = sumNutrients(foods);
  const userIdeal = getUserIdeal();
  const mKey      = meal.toLowerCase();
  const ideal     = userIdeal[mKey] || IDEAL[mKey] || IDEAL['dinner'];

  // ── Food table ──
  const tbody = document.getElementById('sum-tbody');
  tbody.innerHTML = foods.length
    ? foods.map(foodTableRow).join('')
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">
         No data for <b>${day} — ${meal}</b> (${source === 'plan' ? 'generate plan first' : 'log food first'})
       </td></tr>`;

  document.getElementById('sum-tfoot').innerHTML = totalFooterRow(total);

  // ── vs-ideal cards (profile-specific ideal) ──
  document.getElementById('vs-grid').innerHTML = vsIdealCards(total, ideal);
}
