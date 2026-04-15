/* ================================================================
   Smart Diet Planner — js/constants.js
   All application-wide constants: days, meals, icons, ideal targets
   Sources:
     - WHO/FAO Nutrient Reference Values (2004, updated 2019)
     - American Diabetes Association (ADA) Standards of Care 2024
     - ICMR-NIN Recommended Dietary Allowances for Indians 2020
   ================================================================ */

'use strict';

// ── Week days ────────────────────────────────────────────────────
const DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday'
];

// ── Meal slots ───────────────────────────────────────────────────
const MEALS = ['Break-fast', 'Lunch', 'Snacks', 'Dinner'];

// ── Meal display icons ───────────────────────────────────────────
const MEAL_ICONS = {
  'Break-fast': '🌅',
  'Lunch':      '☀️',
  'Snacks':     '🍎',
  'Dinner':     '🌙'
};

// ── Nutrient keys ────────────────────────────────────────────────
const NUTRIENTS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sugar'];

// ── Age restrictions ─────────────────────────────────────────────
const AGE_MIN = 18;
const AGE_MAX = 59;

// ── Profile-specific IDEAL nutrient targets (per meal) ───────────
// Four profiles:
//   non-diabetic-young  (18–35)  — WHO/FAO standard adult
//   non-diabetic-middle (36–59)  — slightly reduced metabolism
//   diabetic-young      (18–35)  — ADA 2024: low sugar, high fiber
//   diabetic-middle     (36–59)  — ADA 2024: further calorie reduction
const IDEAL_PROFILES = {

  /* NON-DIABETIC · Young Adult 18–35 ─────────────────────────────
     Higher energy needs, standard macro distribution.
     Daily: 2,030 kcal | 86g pro | 67g fat | 230g carbs | 26g fiber | 36g sugar */
  'non-diabetic-young': {
    'break-fast': { calories: 520, protein: 22, fat: 16, carbs: 65, fiber: 6,  sugar: 10 },
    'lunch':      { calories: 680, protein: 28, fat: 22, carbs: 75, fiber: 8,  sugar: 10 },
    'snacks':     { calories: 210, protein: 9,  fat: 8,  carbs: 27, fiber: 4,  sugar: 7  },
    'dinner':     { calories: 620, protein: 27, fat: 21, carbs: 63, fiber: 8,  sugar: 9  }
  },

  /* NON-DIABETIC · Middle Adult 36–59 ─────────────────────────────
     WHO/FAO baseline; slightly lower calorie requirement.
     Daily: 1,950 kcal | 78g pro | 62g fat | 215g carbs | 22g fiber | 30g sugar */
  'non-diabetic-middle': {
    'break-fast': { calories: 500, protein: 20, fat: 15, carbs: 60, fiber: 5, sugar: 8 },
    'lunch':      { calories: 650, protein: 25, fat: 20, carbs: 70, fiber: 7, sugar: 8 },
    'snacks':     { calories: 200, protein: 8,  fat: 7,  carbs: 25, fiber: 3, sugar: 6 },
    'dinner':     { calories: 600, protein: 25, fat: 20, carbs: 60, fiber: 7, sugar: 8 }
  },

  /* DIABETIC · Young Adult 18–35 ─────────────────────────────────
     ADA 2024: carbs 40–50% total energy, sugar <5% energy,
     high fiber (≥25g/day), moderate protein. Foods scored with
     extra penalty for sugar > DIABETIC_SUGAR_LIMIT.
     Daily: 1,500 kcal | 84g pro | 54g fat | 168g carbs | 32g fiber | 11g sugar */
  'diabetic-young': {
    'break-fast': { calories: 400, protein: 22, fat: 14, carbs: 45, fiber: 8,  sugar: 3 },
    'lunch':      { calories: 500, protein: 28, fat: 18, carbs: 55, fiber: 10, sugar: 3 },
    'snacks':     { calories: 150, protein: 8,  fat: 6,  carbs: 18, fiber: 5,  sugar: 2 },
    'dinner':     { calories: 450, protein: 26, fat: 16, carbs: 50, fiber: 9,  sugar: 3 }
  },

  /* DIABETIC · Middle Adult 36–59 ─────────────────────────────────
     ADA 2024 + lower metabolic rate in middle age.
     Daily: 1,350 kcal | 75g pro | 47g fat | 150g carbs | 32g fiber | 8g sugar */
  'diabetic-middle': {
    'break-fast': { calories: 360, protein: 20, fat: 12, carbs: 40, fiber: 8,  sugar: 2 },
    'lunch':      { calories: 450, protein: 25, fat: 16, carbs: 50, fiber: 10, sugar: 2 },
    'snacks':     { calories: 130, protein: 7,  fat: 5,  carbs: 15, fiber: 5,  sugar: 2 },
    'dinner':     { calories: 410, protein: 23, fat: 14, carbs: 45, fiber: 9,  sugar: 2 }
  }
};

// ── Fallback IDEAL (non-diabetic middle adult) ───────────────────
const IDEAL = IDEAL_PROFILES['non-diabetic-middle'];

// ── Daily totals per profile ─────────────────────────────────────
const DAILY_IDEAL_BY_PROFILE = {
  'non-diabetic-young':  { calories: 2030, protein: 86, fat: 67, carbs: 230, fiber: 26, sugar: 36 },
  'non-diabetic-middle': { calories: 1950, protein: 78, fat: 62, carbs: 215, fiber: 22, sugar: 30 },
  'diabetic-young':      { calories: 1500, protein: 84, fat: 54, carbs: 168, fiber: 32, sugar: 11 },
  'diabetic-middle':     { calories: 1350, protein: 75, fat: 47, carbs: 150, fiber: 32, sugar: 8  }
};

// ── Fallback DAILY_IDEAL ─────────────────────────────────────────
const DAILY_IDEAL = DAILY_IDEAL_BY_PROFILE['non-diabetic-middle'];

// ── Profile key resolver ─────────────────────────────────────────
/**
 * Build profile key from user age + diabetic status.
 * @param {number}  age
 * @param {boolean} diabetic
 * @returns {string}
 */
function resolveProfileKey(age, diabetic) {
  const band = (age <= 35) ? 'young' : 'middle';
  const cond = diabetic    ? 'diabetic' : 'non-diabetic';
  return `${cond}-${band}`;
}

/**
 * Return the IDEAL meal targets for the currently logged-in user.
 * @returns {Object}
 */
function getUserIdeal() {
  const u = STATE && STATE.user;
  if (!u) return IDEAL;
  return IDEAL_PROFILES[resolveProfileKey(u.age || 30, !!u.diabetic)] || IDEAL;
}

/**
 * Return the DAILY_IDEAL totals for the currently logged-in user.
 * @returns {Object}
 */
function getUserDailyIdeal() {
  const u = STATE && STATE.user;
  if (!u) return DAILY_IDEAL;
  return DAILY_IDEAL_BY_PROFILE[resolveProfileKey(u.age || 30, !!u.diabetic)] || DAILY_IDEAL;
}

// ── Diabetic food scoring ────────────────────────────────────────
const DIABETIC_SUGAR_LIMIT   = 5;    // g per food item — above this gets penalised
const DIABETIC_SUGAR_PENALTY = 200;  // score penalty added for high-sugar foods

// ── Nutrient tolerance thresholds (%) ───────────────────────────
const THRESHOLDS = {
  ON_TARGET_LOW:  85,
  ON_TARGET_HIGH: 115,
  HARD_LIMIT:     120
};

// ── Plan generator settings ──────────────────────────────────────
const PLAN_CONFIG = {
  ITEMS_PER_MEAL:  3,
  ITEMS_PER_SNACK: 2,
  TOP_CANDIDATES:  30,
  RANDOM_WINDOW:   8
};

// ── FDC category → meal type ─────────────────────────────────────
const FDC_CATEGORY_TO_MEAL = {
  'baked foods':       'break-fast', 'breakfast cereals': 'break-fast',
  'beverages':         'break-fast', 'dairy and egg':     'break-fast',
  'meats':             'dinner',     'fish':              'lunch',
  'poultry':           'lunch',      'prepared meals':    'dinner',
  'fast foods':        'lunch',      'baby foods':        'snacks',
  'soups':             'lunch',      'sweets':            'snacks',
  'fruits':            'snacks',     'beans and lentils': 'lunch',
  'snacks':            'snacks',     'grains and pasta':  'lunch',
  'nuts and seeds':    'snacks',     'vegetables':        'lunch',
  'restaurant':        'dinner'
};

const NONVEG_FDC_CATEGORIES = ['meats', 'fish', 'poultry'];
