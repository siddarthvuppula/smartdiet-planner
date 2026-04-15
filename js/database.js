/* ================================================================
   Smart Diet Planner — js/database.js
   Food database helpers: filtering, search, nutrient calculations
   Diabetic users: high-sugar foods penalised in plan generation
   ================================================================ */

'use strict';

// ── FOOD FILTERING ───────────────────────────────────────────────

/**
 * Get all foods appropriate for a specific meal slot,
 * filtered by diet preference. Used by PLAN GENERATOR.
 * @param {string} mealKey
 * @returns {Object[]}
 */
function getFilteredFoods(mealKey) {
  const diet = STATE.user.diet;
  const mk   = mealKey.toLowerCase();

  return FOOD_DB.filter(f => {
    const catOk  = diet === 'vegan' ? f.cat === 'vegan' : true;
    const mt     = (f.meal_type || 'common').toLowerCase();
    const mealOk = mt === 'common' || mt === mk || mt.includes(mk) || mk.includes(mt);
    return catOk && mealOk;
  });
}

/**
 * Search across ALL foods by name substring (diet-filtered).
 * Used by AUTOCOMPLETE in the Log Meals tab.
 * @param {string} query
 * @returns {Object[]} max 15 results
 */
function searchAllFoods(query) {
  const diet = STATE.user.diet;
  const q    = query.toLowerCase();

  return FOOD_DB
    .filter(f => {
      const catOk = diet === 'vegan' ? f.cat === 'vegan' : true;
      return catOk && f.food_name.toLowerCase().includes(q);
    })
    .sort((a, b) => a.food_name.length - b.food_name.length)
    .slice(0, 15);
}

/**
 * Find a single food by exact name.
 * @param {string} name
 * @returns {Object|null}
 */
function findFood(name) {
  return FOOD_DB.find(f => f.food_name === name) || null;
}

// ── DIABETIC FOOD SCORING ────────────────────────────────────────

/**
 * Score a food item for plan generation.
 * For diabetic users, applies an extra penalty to high-sugar foods
 * to steer recommendations away from sugary items.
 *
 * @param {Object}   food         - food DB entry
 * @param {Object}   perItemTarget - per-item nutrient targets
 * @param {string[]} scoreNutrients - nutrients to score
 * @returns {number} MAE score (lower = better fit)
 */
function scoreFoodForPlan(food, perItemTarget, scoreNutrients) {
  // Base MAE score
  let score = scoreNutrients.reduce(
    (s, n) => s + Math.abs((food[n] || 0) - (perItemTarget[n] || 0)),
    0
  );

  // Diabetic sugar penalty
  if (STATE.user && STATE.user.diabetic) {
    if ((food.sugar || 0) > DIABETIC_SUGAR_LIMIT) {
      score += DIABETIC_SUGAR_PENALTY;
    }
  }

  return score;
}

// ── NUTRIENT MATH ────────────────────────────────────────────────

function sumNutrients(foods) {
  const t = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 };
  (foods || []).forEach(f => NUTRIENTS.forEach(n => { t[n] += (f[n] || 0); }));
  return t;
}

function pct(value, ideal) {
  return ideal ? Math.round((value / ideal) * 100) : 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function nutrientClass(p) {
  if (p >= THRESHOLDS.ON_TARGET_LOW && p <= THRESHOLDS.ON_TARGET_HIGH) return 'ok';
  return p < THRESHOLDS.ON_TARGET_LOW ? 'low' : 'over';
}

function idealBadge(p) {
  if (p >= THRESHOLDS.ON_TARGET_LOW && p <= THRESHOLDS.ON_TARGET_HIGH)
    return { label: '✓ On Target', cls: 'ok' };
  if (p < 75)                          return { label: '↓ Low',   cls: 'low'  };
  if (p > THRESHOLDS.HARD_LIMIT)       return { label: '↑ Over',  cls: 'over' };
  return                                      { label: '≈ Near',  cls: 'near' };
}

function computeNAR(foods, ideal) {
  const total = sumNutrients(foods);
  let sum = 0, count = 0;
  NUTRIENTS.forEach(n => {
    if (ideal[n]) { sum += Math.min(total[n] / ideal[n], 1); count++; }
  });
  return count ? sum / count : 0;
}

// ── DEBUG ────────────────────────────────────────────────────────
function logDBStats() {
  const total  = FOOD_DB.length;
  const vegan  = FOOD_DB.filter(f => f.cat === 'vegan').length;
  const nonveg = FOOD_DB.filter(f => f.cat === 'non-veg').length;
  const byMeal = {};
  FOOD_DB.forEach(f => { byMeal[f.meal_type] = (byMeal[f.meal_type] || 0) + 1; });
  console.log(`[SmartDiet DB] Total: ${total} | Vegan: ${vegan} | Non-veg: ${nonveg}`);
  console.log('[SmartDiet DB] By meal type:', byMeal);
}
