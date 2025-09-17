// Keys
const LS_ACTIVITIES = 'dc_activities_v1';
const LS_CHECKED = 'dc_checked_v1';
const LS_CHECK_DATE = 'dc_check_date_v1';

// Elements
const elSetup = document.getElementById('setup');
const elSetupForm = document.getElementById('setupForm');
const elSetupInput = document.getElementById('setupInput');
const elSetupList = document.getElementById('setupList');
const elSetupClear = document.getElementById('setupClear');
const elSetupDone = document.getElementById('setupDone');

const elMain = document.getElementById('mainUI');
const elTaskList = document.getElementById('taskList');
const elAddForm = document.getElementById('addForm');
const elAddInput = document.getElementById('addInput');
const elEmptyHint = document.getElementById('emptyHint');

const elTodayLabel = document.getElementById('todayLabel');
const elProgressText = document.getElementById('progressText');
const elProgressBar = document.getElementById('progressBar');

const btnEdit = document.getElementById('btnEdit');
const btnReset = document.getElementById('btnReset');

let editing = false;

// Utilities
const todayKey = () => {
  // Use local device date (mobile); store YYYY-MM-DD
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

const fmtTodayNice = () => {
  const d = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
};

const loadJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};

const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// Data
let activities = loadJSON(LS_ACTIVITIES, []); // [{id, label}]
let checked = loadJSON(LS_CHECKED, {});       // {id: true}
let checkDate = localStorage.getItem(LS_CHECK_DATE) || '';

function ensureDailyReset(){
  const tk = todayKey();
  if (checkDate !== tk){
    checked = {}; // new day => all unchecked
    saveJSON(LS_CHECKED, checked);
    localStorage.setItem(LS_CHECK_DATE, tk);
    checkDate = tk;
  }
}

function renderToday(){
  elTodayLabel.textContent = fmtTodayNice();
}

function renderList(){
  elTaskList.innerHTML = '';
  if (!activities.length){
    elEmptyHint.classList.remove('hidden');
  } else {
    elEmptyHint.classList.add('hidden');
  }

  activities.forEach(item => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.dataset.id = item.id;
  // allow native dragging on list items
  li.setAttribute('draggable', 'true');

    // checkbox cell
    const boxWrap = document.createElement('div');
    boxWrap.className = 'checkbox-wrapper-30 task-check';
    boxWrap.innerHTML = `
      <span class="checkbox">
        <input type="checkbox" ${checked[item.id] ? 'checked' : ''} aria-label="${item.label}">
        <svg><use xlink:href="#checkbox-30" class="checkbox"></use></svg>
      </span>
    `;

    // label
    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = item.label;

    // actions
    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const del = document.createElement('button');
    del.className = 'icon-btn danger remove';
    del.title = 'Delete';
    del.innerHTML = '🗑️';
    del.addEventListener('click', () => removeActivity(item.id));

    actions.appendChild(del);

    li.appendChild(boxWrap);
    li.appendChild(label);
    li.appendChild(actions);

    // checkbox behavior
    const input = boxWrap.querySelector('input[type="checkbox"]');
    // reflect initial checked state visually
    li.classList.toggle('completed', !!checked[item.id]);

    input.addEventListener('change', (e) => {
      if (e.target.checked) {
        checked[item.id] = true;
        li.classList.add('completed');
      } else {
        delete checked[item.id];
        li.classList.remove('completed');
      }
      saveJSON(LS_CHECKED, checked);
      updateProgress();
    });

    elTaskList.appendChild(li);
  });

  document.body.classList.toggle('editing', editing);

  // Attach drag-and-drop handlers after list is rendered
  if (typeof enableDragAndDrop === 'function') enableDragAndDrop();
}

function updateProgress(){
  const total = activities.length || 1;
  const done = Object.keys(checked).length;
  const pct = Math.round((done/total)*100);
  elProgressText.textContent = `${done}/${total} done`;
  elProgressBar.value = pct;
}

// Activity ops
function addActivity(label){
  const trimmed = (label || '').trim();
  if (!trimmed) return;
  const exists = activities.some(a => a.label.toLowerCase() === trimmed.toLowerCase());
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  activities.push({ id, label: trimmed });
  saveJSON(LS_ACTIVITIES, activities);
  renderList();
  updateProgress();
}

function removeActivity(id){
  activities = activities.filter(a => a.id !== id);
  delete checked[id];
  saveJSON(LS_ACTIVITIES, activities);
  saveJSON(LS_CHECKED, checked);
  renderList();
  updateProgress();
}

// Setup (onboarding) list helpers
function renderSetupList(){
  elSetupList.innerHTML = '';
  const temp = loadJSON('__setup_temp__', []);
  temp.forEach((label, idx) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    const text = document.createElement('div');
    text.className = 'item-label';
    text.textContent = label;

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const del = document.createElement('button');
    del.className = 'icon-btn danger';
    del.textContent = '🗑️';
    del.addEventListener('click', () => {
      temp.splice(idx,1);
      saveJSON('__setup_temp__', temp);
      renderSetupList();
    });

    actions.appendChild(del);
    li.appendChild(document.createElement('div')); // spacer for checkbox slot
    li.appendChild(text);
    li.appendChild(actions);
    elSetupList.appendChild(li);
  });

  elSetupDone.disabled = temp.length === 0;
}

function startSetup(){
  elSetup.classList.remove('hidden');
  elMain.classList.add('hidden');
  if (!localStorage.getItem('__setup_temp__')){
    saveJSON('__setup_temp__', []);
  }
  renderSetupList();
}

function finishSetup(){
  const temp = loadJSON('__setup_temp__', []);
  activities = temp.map(label => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`, label }));
  saveJSON(LS_ACTIVITIES, activities);
  localStorage.removeItem('__setup_temp__');
  // Initialize day
  localStorage.setItem(LS_CHECK_DATE, todayKey());
  checked = {};
  saveJSON(LS_CHECKED, checked);
  // Show main
  elSetup.classList.add('hidden');
  elMain.classList.remove('hidden');
  renderToday();
  renderList();
  updateProgress();
}

// Events
elAddForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addActivity(elAddInput.value);
  elAddInput.value = '';
  elAddInput.focus();
});

btnEdit.addEventListener('click', () => {
  editing = !editing;
  btnEdit.setAttribute('aria-pressed', String(editing));
  btnEdit.textContent = editing ? 'Done' : 'Edit';
  renderList();
});

btnReset.addEventListener('click', () => {
  if (!activities.length) return;
  if (confirm('Reset today? This will uncheck all items.')){
    checked = {};
    saveJSON(LS_CHECKED, checked);
    localStorage.setItem(LS_CHECK_DATE, todayKey());
    updateProgress();
    renderList();
  }
});

// Setup handlers
elSetupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = elSetupInput.value.trim();
  if (!val) return;
  const temp = loadJSON('__setup_temp__', []);
  temp.push(val);
  saveJSON('__setup_temp__', temp);
  elSetupInput.value = '';
  elSetupInput.focus();
  renderSetupList();
});
elSetupClear.addEventListener('click', () => {
  saveJSON('__setup_temp__', []);
  renderSetupList();
});
elSetupDone.addEventListener('click', finishSetup);

function enableDragAndDrop() {
  // Guard: attach listeners only once
  if (elTaskList.__dndAttached) return;
  elTaskList.__dndAttached = true;

  let draggingItem = null;

  elTaskList.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.list-item');
    if (!li) return;
    draggingItem = li;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // store id for fallback
    try { e.dataTransfer.setData('text/plain', li.dataset.id); } catch (err) { /* some browsers restrict */ }
  });

  elTaskList.addEventListener('dragend', (e) => {
    if (!draggingItem) return;
    draggingItem.classList.remove('dragging');
    elTaskList.querySelectorAll('.list-item').forEach(item => item.classList.remove('over'));
    draggingItem = null;
    // persist order after a small delay in case renderList uses it
    saveJSON(LS_ACTIVITIES, activities);
  });

    elTaskList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(elTaskList, e.clientY);
    elTaskList.querySelectorAll('.list-item').forEach(item => item.classList.remove('drag-over'));
    if (afterEl == null) {
      elTaskList.appendChild(draggingItem);
    } else {
      afterEl.classList.add('drag-over');
      elTaskList.insertBefore(draggingItem, afterEl);
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.list-item:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const child of draggableElements) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    }
    return closest.element;
  }

  // Update underlying activities order when user drops (on pointerup)
  // Use pointerup to compute new order from DOM
  elTaskList.addEventListener('pointerup', () => {
    const ids = [...elTaskList.querySelectorAll('.list-item')].map(li => li.dataset.id);
    // reorder activities array to match ids
    activities = ids.map(id => activities.find(a => a.id === id)).filter(Boolean);
    saveJSON(LS_ACTIVITIES, activities);
    updateProgress();
  });
}


// Init
(function init(){
  // Daily reset check
  ensureDailyReset();

  renderToday();

  if (!activities.length){
    startSetup();
    return;
  }

  // Show main UI
  elMain.classList.remove('hidden');
  elSetup.classList.add('hidden');
  renderList();
  updateProgress();
})();
