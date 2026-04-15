/* Smart Diet Planner -- js/app.js -- Boot */
'use strict';
(function boot() {
  loadState();
  logDBStats();
  if (STATE.user) { enterApp(); return; }
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('screen-app').classList.remove('active');
})();
