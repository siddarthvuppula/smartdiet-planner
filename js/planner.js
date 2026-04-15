/* ================================================================
   Smart Diet Planner — js/planner.js
   AI-style Diet Plan Generator Engine

   Profile-aware: reads getUserIdeal() which returns different
   calorie/macro targets for:
     • non-diabetic young (18–35)
     • non-diabetic middle (36–59)
     • diabetic young (18–35)      ← lower calories, sugar, high fiber
     • diabetic middle (36–59)     ← further reduced calories/carbs
   
   For diabetic users, scoreFoodForPlan() adds a DIABETIC_SUGAR_PENALTY
   to any food with sugar > DIABETIC_SUGAR_LIMIT, steering the
   generator away from sugary foods.
   ================================================================ */

'use strict';

// ── SINGLE MEAL PLAN GENERATOR ───────────────────────────────────

/**
 * Generate an optimal food combination for one meal slot.
 * Uses the user's profile-specific ideal targets and diabetic scoring.
 *
 * @param {string} day
 * @param {string} meal
 * @param {Object} targetNutrients - ideal (possibly carryover-adjusted) targets
 * @returns {Object[]}
 */
function generateMealPlan(day, meal, targetNutrients) {
  const mKey        = meal.toLowerCase();
  const pool        = getFilteredFoods(mKey);
  const isSnack     = mKey === 'snacks';
  const targetCount = isSnack ? PLAN_CONFIG.ITEMS_PER_SNACK : PLAN_CONFIG.ITEMS_PER_MEAL;

  const SCORE_NUTRIENTS = ['calories', 'protein', 'fat', 'carbs'];

  // Per-item target
  const perItem = {};
  SCORE_NUTRIENTS.forEach(n => { perItem[n] = (targetNutrients[n] || 0) / targetCount; });

  // Score foods — diabetic users get sugar penalty via scoreFoodForPlan()
  const scored = pool.map(f => ({
    ...f,
    _score: scoreFoodForPlan(f, perItem, SCORE_NUTRIENTS)
  }));

  scored.sort((a, b) => a._score - b._score);

  const topCandidates = scored.slice(0, PLAN_CONFIG.TOP_CANDIDATES);
  const selected      = [];
  const usedNames     = new Set();

  for (let i = 0; i < targetCount && topCandidates.length > 0; i++) {
    const available = topCandidates.filter(f => !usedNames.has(f.food_name));
    if (!available.length) break;

    const pickFrom = available.slice(0, PLAN_CONFIG.RANDOM_WINDOW);
    const pick     = pickFrom[Math.floor(Math.random() * pickFrom.length)];

    selected.push({
      food_name: pick.food_name,
      calories:  pick.calories,
      protein:   pick.protein,
      fat:       pick.fat,
      carbs:     pick.carbs,
      fiber:     pick.fiber,
      sugar:     pick.sugar
    });
    usedNames.add(pick.food_name);
  }

  return selected;
}

// ── FULL DAY PLAN GENERATOR ──────────────────────────────────────

/**
 * Generate a plan for all 4 meals of a day using the user's profile targets.
 * @param {string} day
 */
function generatePlanForDay(day) {
  if (!STATE.weekPlan[day])  STATE.weekPlan[day]  = {};
  if (!STATE.carryover[day]) STATE.carryover[day] = {};

  MEALS.forEach(meal => {
    const { ideal, carry } = getAdjustedIdeal(day, meal);
    STATE.weekPlan[day][meal]  = generateMealPlan(day, meal, ideal);
    STATE.carryover[day][meal] = carry;
  });
}

// ── WEEKLY PLAN STATISTICS ────────────────────────────────────────

/**
 * Aggregate plan statistics for the stats strip on Plan tab.
 */
function computePlanStats() {
  let totalDays = 0, totalCal = 0, skippedMeals = 0, onTarget = 0, totalMeals = 0;
  const userIdeal = getUserIdeal();

  DAYS.forEach(d => {
    if (!STATE.weekPlan[d] || !Object.keys(STATE.weekPlan[d]).length) return;
    totalDays++;

    MEALS.forEach(m => {
      const foods = STATE.weekPlan[d][m] || [];
      const total = sumNutrients(foods);
      totalCal  += total.calories;
      totalMeals++;

      const mKey = m.toLowerCase();
      const mIdeal = userIdeal[mKey] || IDEAL[mKey] || IDEAL['dinner'];
      const p = pct(total.calories, mIdeal.calories);
      if (p >= 80 && p <= 120) onTarget++;

      if (STATE.weekLog[d]?.[m]?.skipped) skippedMeals++;
    });
  });

  return {
    totalDays,
    avgCalPerDay: totalDays ? Math.round(totalCal / totalDays) : 0,
    skippedMeals,
    onTargetPct:  totalMeals ? Math.round((onTarget / totalMeals) * 100) : 0
  };
}
