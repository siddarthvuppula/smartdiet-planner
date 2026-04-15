/* ================================================================
   Smart Diet Planner — js/compensation.js
   Missed Meal Compensation Engine
   
   Algorithm:
   When a meal is marked as skipped, the FULL ideal nutrient quota
   for that meal is added as a "carryover deficit" to the very next
   meal slot (which may be the first meal of the next day).
   The plan generator then uses the adjusted (boosted) ideal targets
   when selecting foods for the compensating meal.
   ================================================================ */

'use strict';

// ── CARRYOVER DETECTION ──────────────────────────────────────────

/**
 * Check whether a specific meal on a day was skipped.
 * If skipped, return its full ideal nutrient quota as the deficit.
 *
 * @param {string} day   - e.g. 'Monday'
 * @param {string} meal  - e.g. 'Lunch'
 * @returns {Object|null} - nutrient deficit dict or null if not skipped
 */
function computeCarryover(day, meal) {
  const mealData = STATE.weekLog[day]?.[meal];
  if (!mealData || !mealData.skipped) return null;

  const ideal = IDEAL[meal.toLowerCase()] || IDEAL['dinner'];
  const deficit = {};
  NUTRIENTS.forEach(n => { deficit[n] = ideal[n] || 0; });
  return deficit;
}

/**
 * Get the carryover deficit that should be added to a given meal slot.
 * Looks at the immediately preceding meal slot (cross-day aware).
 *
 * Precedence:
 *   - Snacks → check if Lunch was skipped (same day)
 *   - Dinner → check if Snacks was skipped (same day)
 *   - Lunch  → check if Break-fast was skipped (same day)
 *   - Break-fast → check if previous day's Dinner was skipped
 *
 * @param {string} day
 * @param {string} meal
 * @returns {Object|null} carryover nutrient dict or null
 */
function getCarryoverForMeal(day, meal) {
  const mealIdx = MEALS.indexOf(meal);

  if (mealIdx <= 0) {
    // This is Break-fast — check previous day's Dinner
    const dayIdx = DAYS.indexOf(day);
    if (dayIdx <= 0) return null;                      // Monday, no previous day
    const prevDay = DAYS[dayIdx - 1];
    return computeCarryover(prevDay, 'Dinner');
  }

  // Check the immediately preceding meal in the same day
  const prevMeal = MEALS[mealIdx - 1];
  return computeCarryover(day, prevMeal);
}

/**
 * Return adjusted ideal targets for a meal slot,
 * incorporating any carryover from a skipped previous meal.
 *
 * @param {string} day
 * @param {string} meal
 * @returns {{ ideal: Object, carry: Object|null }}
 */
function getAdjustedIdeal(day, meal) {
  const base  = { ...IDEAL[meal.toLowerCase()] || IDEAL['dinner'] };
  const carry = getCarryoverForMeal(day, meal);

  if (!carry) return { ideal: base, carry: null };

  // Boost each nutrient by the carried deficit (floor at 0)
  const adjusted = {};
  NUTRIENTS.forEach(n => {
    adjusted[n] = Math.max(0, (base[n] || 0) + (carry[n] || 0));
  });

  return { ideal: adjusted, carry };
}

// ── COMPENSATION DISPLAY HELPER ───────────────────────────────────

/**
 * Build the human-readable compensation messages for the Adjust Box.
 * Called when rendering the Log Meals tab for a given day.
 *
 * @param {string} day
 * @returns {string[]} array of HTML message strings
 */
function getCompensationMessages(day) {
  const messages = [];

  MEALS.forEach((meal, i) => {
    const carry = getCarryoverForMeal(day, meal);
    if (!carry) return;

    const prevMealLabel = i === 0
      ? `${DAYS[DAYS.indexOf(day) - 1] || ''} Dinner`
      : MEALS[i - 1];

    messages.push(
      `<b>${meal}</b> target increased by ` +
      `<b>${Math.round(carry.calories)} kcal</b> ` +
      `to compensate for skipped <b>${prevMealLabel}</b>`
    );
  });

  return messages;
}

// ── VALIDATION ────────────────────────────────────────────────────

/**
 * Check whether adding a food to the current meal would push
 * any key nutrient over the hard limit threshold (THRESHOLDS.HARD_LIMIT).
 *
 * @param {Object[]} existingFoods  - foods already in the meal
 * @param {Object}   newFood        - food being added
 * @param {Object}   idealTargets   - ideal nutrient targets for the meal
 * @returns {string[]} names of nutrients that would be exceeded
 */
function checkNutrientLimit(existingFoods, newFood, idealTargets) {
  const projected = sumNutrients([...existingFoods, newFood]);
  return ['calories', 'protein', 'carbs'].filter(n =>
    pct(projected[n], idealTargets[n]) > THRESHOLDS.HARD_LIMIT
  );
}
