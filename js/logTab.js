/* ================================================================
   Smart Diet Planner — js/logTab.js
   Log Meals Tab — food search, add/remove, skip, save
   Uses getUserIdeal() so badges reflect the user's health profile
   ================================================================ */

'use strict';

const _acTimers = {};

function initLogDay() {
  renderDayTabs();
  renderMealsInput();
  renderAdjustBox();
}

// ── DAY TABS ──────────────────────────────────────────────────────
function renderDayTabs() {
  const row = document.getElementById('day-tabs-row');
  row.innerHTML = DAYS.map(d => {
    const hasData = !!(STATE.weekLog[d] && Object.keys(STATE.weekLog[d]).length);
    return `<div class="day-chip${d === STATE.currentLogDay ? ' active' : ''}${hasData ? ' has-data' : ''}"
      onclick="selectLogDay('${d}')">${d}</div>`;
  }).join('');
}

function selectLogDay(day) {
  STATE.currentLogDay = day;
  renderDayTabs();
  renderMealsInput();
  renderAdjustBox();
}

// ── ADJUST BOX ────────────────────────────────────────────────────
function renderAdjustBox() {
  const box  = document.getElementById('adjust-box');
  const txt  = document.getElementById('adjust-box-text');
  const msgs = getCompensationMessages(STATE.currentLogDay);
  if (msgs.length) { box.classList.add('show'); txt.innerHTML = msgs.join('<br/>'); }
  else               box.classList.remove('show');
}

// ── MEAL INPUT CARDS ──────────────────────────────────────────────
function renderMealsInput() {
  const grid      = document.getElementById('meals-input-grid');
  const day       = STATE.currentLogDay;
  const userIdeal = getUserIdeal();   // profile-specific targets
  grid.innerHTML  = '';

  MEALS.forEach(meal => {
    const mealData = getMealLog(day, meal);
    const skipped  = mealData.skipped;
    const foods    = mealData.foods || [];
    const { ideal } = getAdjustedIdeal(day, meal);  // may be carryover-boosted
    const total    = sumNutrients(foods);
    const mKey     = meal.replace(/[^a-z]/gi, '_');
    const isDiab   = STATE.user?.diabetic;

    // ── Nutrient badges ──
    const badges = ['calories', 'protein', 'carbs', 'fiber'].map(n => {
      const p = pct(total[n], ideal[n]);
      let cls = '', label = n;
      if (total.calories > 0) {
        if      (p >= 85 && p <= 115) { cls = 'ok';   label = `${n} ✓`;      }
        else if (p < 85)              { cls = 'low';  label = `${n} ↓${p}%`; }
        else                          { cls = 'over'; label = `${n} ↑${p}%`; }
      }
      return `<span class="mini-badge ${cls}">${label}</span>`;
    }).join('');

    // ── Sugar badge for diabetics ──
    const sugarBadge = isDiab ? (() => {
      const s   = total.sugar;
      const lim = ideal.sugar;
      const p   = pct(s, lim);
      const cls = s > lim * 1.15 ? 'over' : s > lim ? 'low' : 'ok';
      return `<span class="mini-badge ${cls}">sugar ${s.toFixed(1)}g/${lim}g</span>`;
    })() : '';

    // ── Warning ──
    let warnHtml = '';
    if (!skipped && total.calories > 0) {
      const exceeded = NUTRIENTS.filter(n => pct(total[n], ideal[n]) > THRESHOLDS.HARD_LIMIT);
      if (exceeded.length) {
        warnHtml = `<div class="nutrient-warn show">⚠ Exceeds ideal for: <b>${exceeded.join(', ')}</b>.</div>`;
      }
      // Extra sugar warning for diabetics
      if (isDiab && total.sugar > ideal.sugar) {
        warnHtml += `<div class="nutrient-warn show" style="margin-top:4px">
          🩺 Diabetic alert: sugar intake ${total.sugar.toFixed(1)}g exceeds ${ideal.sugar}g limit.
        </div>`;
      }
    }

    // ── Food tags ──
    const foodTags = foods.map(f => {
      const highSugar = isDiab && (f.sugar || 0) > DIABETIC_SUGAR_LIMIT;
      return `<div class="food-tag${highSugar ? ' food-tag-warn' : ''}">
        <span class="food-tag-name" title="${esc(f.food_name)}">${esc(f.food_name)}</span>
        ${highSugar ? '<span class="tag-sugar-warn" title="High sugar — avoid for diabetics">⚠ sugar</span>' : ''}
        <span class="food-tag-cal">${f.calories} kcal</span>
        <button class="food-tag-rm"
          onclick="removeFood('${meal}','${f.food_name.replace(/'/g,"\\'")}')">×</button>
      </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'meal-input-card';
    card.id = `meal-card-${mKey}`;
    card.innerHTML = `
      <div class="meal-input-header">
        <span class="meal-input-title">${MEAL_ICONS[meal]} ${meal}</span>
        <button class="meal-skipped-btn${skipped ? ' skipped' : ''}"
          onclick="toggleSkip('${meal}')">${skipped ? '✗ Skipped' : 'Mark Skipped'}</button>
      </div>
      <div class="meal-input-body">
        ${skipped
          ? `<div style="color:var(--red);font-size:.8rem;padding:8px 0">
               Meal skipped — nutrients will be compensated in the next meal
             </div>`
          : `<div class="autocomplete-wrap">
               <input class="autocomplete-input"
                 placeholder="Search food to add..."
                 id="ac-input-${mKey}"
                 oninput="acInput(event,'${meal}')"
                 onblur="acBlur('${meal}')"/>
               <div class="autocomplete-list" id="ac-list-${mKey}"></div>
             </div>
             <div class="selected-foods-list">${foodTags}</div>
             <div class="meal-nutrient-mini">${badges}${sugarBadge}</div>
             ${warnHtml}`
        }
      </div>`;
    grid.appendChild(card);
  });
}

// ── AUTOCOMPLETE ──────────────────────────────────────────────────
function acInput(e, meal) {
  const mKey = meal.replace(/[^a-z]/gi, '_');
  const val  = e.target.value.toLowerCase().trim();
  const list = document.getElementById(`ac-list-${mKey}`);
  if (!val || val.length < 2) { list.classList.remove('open'); return; }

  clearTimeout(_acTimers[meal]);
  _acTimers[meal] = setTimeout(() => {
    const matches = searchAllFoods(val);
    if (!matches.length) { list.classList.remove('open'); return; }

    const isDiab = STATE.user?.diabetic;
    list.innerHTML = matches.map(f => {
      const highSugar = isDiab && (f.sugar || 0) > DIABETIC_SUGAR_LIMIT;
      return `<div class="autocomplete-item${highSugar ? ' ac-item-warn' : ''}"
        onmousedown="addFood('${meal}','${f.food_name.replace(/'/g,"\\'")}')">
        ${esc(f.food_name)}
        ${highSugar ? '<span style="color:var(--amber);font-size:.68rem;margin-left:4px">⚠ high sugar</span>' : ''}
        <span style="color:var(--muted);font-size:.72rem;margin-left:4px">${f.calories} kcal</span>
      </div>`;
    }).join('');
    list.classList.add('open');
  }, 120);
}

function acBlur(meal) {
  setTimeout(() => {
    document.getElementById(`ac-list-${meal.replace(/[^a-z]/gi, '_')}`)
      ?.classList.remove('open');
  }, 200);
}

// ── ADD / REMOVE ──────────────────────────────────────────────────
function addFood(meal, name) {
  const day = STATE.currentLogDay;
  ensureMealSlot(day, meal);

  const existing = STATE.weekLog[day][meal].foods;
  if (existing.find(f => f.food_name === name)) {
    showToast('Already added to this meal', 'amber'); return;
  }

  const food = findFood(name);
  if (!food) return;

  const { ideal } = getAdjustedIdeal(day, meal);
  const exceeded  = checkNutrientLimit(existing, food, ideal);
  if (exceeded.length) {
    showToast(`⚠ Adding this exceeds ${exceeded.join(', ')} by >20% of target`, 'amber');
  }

  // Diabetic sugar warning
  if (STATE.user?.diabetic && (food.sugar || 0) > DIABETIC_SUGAR_LIMIT) {
    showToast(`🩺 High sugar food (${food.sugar}g) — not recommended for diabetics`, 'amber');
  }

  existing.push({
    food_name: food.food_name, calories: food.calories, protein: food.protein,
    fat: food.fat, carbs: food.carbs, fiber: food.fiber, sugar: food.sugar
  });

  saveState();
  renderMealsInput();

  const inp = document.getElementById(`ac-input-${meal.replace(/[^a-z]/gi, '_')}`);
  if (inp) inp.value = '';
}

function removeFood(meal, name) {
  const day      = STATE.currentLogDay;
  const mealData = STATE.weekLog[day]?.[meal];
  if (!mealData) return;
  mealData.foods = mealData.foods.filter(f => f.food_name !== name);
  saveState();
  renderMealsInput();
}

// ── SKIP ─────────────────────────────────────────────────────────
function toggleSkip(meal) {
  const day = STATE.currentLogDay;
  ensureMealSlot(day, meal);
  const mealData    = STATE.weekLog[day][meal];
  mealData.skipped  = !mealData.skipped;
  if (mealData.skipped) mealData.foods = [];
  saveState();
  renderMealsInput();
  renderAdjustBox();
  if (mealData.skipped)
    showToast(`${meal} marked as skipped — next meal targets boosted ⚡`, 'amber');
}

// ── DAY ACTIONS ───────────────────────────────────────────────────
function clearDay() {
  STATE.weekLog[STATE.currentLogDay] = {};
  saveState();
  renderDayTabs();
  renderMealsInput();
  renderAdjustBox();
  showToast('Day cleared', 'green');
}

function saveDay() {
  const day = STATE.currentLogDay;
  if (!STATE.weekLog[day] || !Object.keys(STATE.weekLog[day]).length) {
    showToast('Nothing logged yet — add some foods first', 'amber'); return;
  }
  generatePlanForDay(day);
  saveState();
  renderDayTabs();
  showToast(`${day} saved — plan generated ✓`, 'green');
  setTimeout(() => switchTab('plan'), 800);
}
