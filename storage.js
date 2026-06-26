/* ============================================================
   PANTRY-TO-OVEN — STORAGE UTILITY
   All localStorage read/write helpers
   ============================================================ */

const KEYS = {
  USERS:     'pto_users',
  RECIPES:   'pto_recipes',
  SESSION:   'pto_session',
  SAVED:     (u) => `pto_saved_${u}`,
  VIEWED:    (u) => `pto_viewed_${u}`,
  COMPLETED: (u) => `pto_completed_${u}`,
};

/* ── GENERIC HELPERS ─────────────────────────────────────── */
function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/* ── SESSION ─────────────────────────────────────────────── */
function getSession()           { return storageGet(KEYS.SESSION); }
function setSession(userData)   { storageSet(KEYS.SESSION, userData); }
function clearSession()         { localStorage.removeItem(KEYS.SESSION); }
function isLoggedIn()           { return !!getSession(); }
function isAdmin()              { const s = getSession(); return s && s.role === 'admin'; }
function getCurrentUser()       { return getSession(); }

/* Guard: redirect to login if not authenticated */
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = 'login.html'; }
}

/* Guard: redirect to login if not admin */
function requireAdmin() {
  if (!isAdmin()) { window.location.href = 'login.html'; }
}

/* Guard: redirect to home if already logged in */
function requireGuest() {
  if (isLoggedIn()) {
    window.location.href = isAdmin() ? 'admin.html' : 'home.html';
  }
}

/* ── USERS ───────────────────────────────────────────────── */
function getUsers()             { return storageGet(KEYS.USERS, []); }
function saveUsers(users)       { storageSet(KEYS.USERS, users); }

function getUserByUsername(username) {
  return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

function createUser(username, email, password) {
  const users = getUsers();
  if (getUserByUsername(username)) return { ok: false, error: 'Username already taken.' };
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return { ok: false, error: 'Email already registered.' };

  const user = {
    id:        'u_' + Date.now(),
    username,
    email,
    password,          /* plain-text intentional for localStorage-only demo */
    joinDate:  new Date().toISOString(),
    role:      'user',
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function updateUser(username, updates) {
  const users = getUsers();
  const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  /* refresh session if this is the current user */
  const session = getSession();
  if (session && session.username.toLowerCase() === username.toLowerCase()) {
    setSession({ ...session, ...updates });
  }
  return true;
}

function deleteUser(username) {
  const users = getUsers().filter(u => u.username.toLowerCase() !== username.toLowerCase());
  saveUsers(users);
  /* clean up user data */
  localStorage.removeItem(KEYS.SAVED(username));
  localStorage.removeItem(KEYS.VIEWED(username));
  localStorage.removeItem(KEYS.COMPLETED(username));
}

/* ── RECIPES ─────────────────────────────────────────────── */
function getRecipes()           { return storageGet(KEYS.RECIPES, []); }
function saveRecipes(recipes)   { storageSet(KEYS.RECIPES, recipes); }

function getRecipeById(id) {
  return getRecipes().find(r => String(r.id) === String(id)) || null;
}

function createRecipe(data) {
  const recipes = getRecipes();
  const recipe = {
    ...data,
    id:        'r_' + Date.now(),
    createdAt: new Date().toISOString(),
    views:     0,
    saves:     0,
  };
  recipes.push(recipe);
  saveRecipes(recipes);
  return recipe;
}

function updateRecipe(id, data) {
  const recipes = getRecipes();
  const idx = recipes.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return false;
  recipes[idx] = { ...recipes[idx], ...data, id: recipes[idx].id };
  saveRecipes(recipes);
  return true;
}

function deleteRecipe(id) {
  saveRecipes(getRecipes().filter(r => String(r.id) !== String(id)));
}

function incrementRecipeViews(id) {
  const recipes = getRecipes();
  const idx = recipes.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) { recipes[idx].views = (recipes[idx].views || 0) + 1; saveRecipes(recipes); }
}

function incrementRecipeSaves(id, delta = 1) {
  const recipes = getRecipes();
  const idx = recipes.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) { recipes[idx].saves = Math.max(0, (recipes[idx].saves || 0) + delta); saveRecipes(recipes); }
}

/* ── SAVED (FAVOURITES) ──────────────────────────────────── */
function getSaved(username)     { return storageGet(KEYS.SAVED(username), []); }

function isSaved(username, recipeId) {
  return getSaved(username).includes(String(recipeId));
}

function toggleSave(username, recipeId) {
  const saved = getSaved(username);
  const id    = String(recipeId);
  if (saved.includes(id)) {
    storageSet(KEYS.SAVED(username), saved.filter(x => x !== id));
    incrementRecipeSaves(id, -1);
    return false; /* now unsaved */
  } else {
    saved.push(id);
    storageSet(KEYS.SAVED(username), saved);
    incrementRecipeSaves(id, 1);
    return true; /* now saved */
  }
}

function getSavedRecipes(username) {
  const ids = getSaved(username);
  return getRecipes().filter(r => ids.includes(String(r.id)));
}

/* ── RECENTLY VIEWED ─────────────────────────────────────── */
function getViewed(username)    { return storageGet(KEYS.VIEWED(username), []); }

function addViewed(username, recipeId) {
  let viewed = getViewed(username);
  const id   = String(recipeId);
  viewed     = viewed.filter(v => v.id !== id);          /* remove if already present */
  viewed.unshift({ id, viewedAt: new Date().toISOString() });
  if (viewed.length > 20) viewed = viewed.slice(0, 20);  /* cap at 20 */
  storageSet(KEYS.VIEWED(username), viewed);
  incrementRecipeViews(id);
}

function getRecentlyViewedRecipes(username) {
  return getViewed(username)
    .map(v => ({ ...getRecipeById(v.id), viewedAt: v.viewedAt }))
    .filter(r => r && r.id);
}

/* ── COMPLETIONS ─────────────────────────────────────────── */
function getCompleted(username) { return storageGet(KEYS.COMPLETED(username), []); }

function markCompleted(username, recipeId) {
  const completed = getCompleted(username);
  const id = String(recipeId);
  if (!completed.find(c => c.id === id)) {
    completed.push({ id, completedAt: new Date().toISOString() });
    storageSet(KEYS.COMPLETED(username), completed);
  }
}

function isCompleted(username, recipeId) {
  return getCompleted(username).some(c => c.id === String(recipeId));
}

/* ── INGREDIENT MATCHING ALGORITHM ──────────────────────── */
function matchRecipes(userIngredients) {
  if (!userIngredients || userIngredients.length === 0) return [];

  const normalise = (s) => s.toLowerCase().trim();
  const userNorm  = userIngredients.map(normalise);

  return getRecipes()
    .map(recipe => {
      const recipeIngNames = (recipe.ingredients || []).map(i => normalise(i.name));
      const matched  = userNorm.filter(ui =>
        recipeIngNames.some(ri => ri.includes(ui) || ui.includes(ri))
      );
      const missing  = recipeIngNames.filter(ri =>
        !userNorm.some(ui => ri.includes(ui) || ui.includes(ri))
      );
      const percent  = recipeIngNames.length > 0
        ? Math.round((matched.length / recipeIngNames.length) * 100)
        : 0;

      return { ...recipe, matchPercent: percent, missingIngredients: missing, matchedCount: matched.length };
    })
    .filter(r => r.matchPercent > 0)
    .sort((a, b) => b.matchPercent - a.matchPercent);
}

/* Get all unique ingredient names from all recipes (for autocomplete) */
function getAllIngredientNames() {
  const names = new Set();
  getRecipes().forEach(r => (r.ingredients || []).forEach(i => names.add(i.name)));
  return [...names].sort();
}

/* ── ADMIN REPORT DATA ───────────────────────────────────── */
function getReportData() {
  const recipes = getRecipes();
  const users   = getUsers();

  const topViewed = [...recipes].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const topSaved  = [...recipes].sort((a, b) => (b.saves || 0) - (a.saves || 0)).slice(0, 5);
  const totalSaves = recipes.reduce((sum, r) => sum + (r.saves || 0), 0);

  return { totalRecipes: recipes.length, totalUsers: users.length, totalSaves, topViewed, topSaved };
}

/* ── TOAST HELPER ────────────────────────────────────────── */
function showToast(message, duration = 2800) {
  let toast = document.getElementById('pto-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pto-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ── FORMAT HELPERS ──────────────────────────────────────── */
function formatTime(mins) {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function getDifficultyClass(difficulty) {
  const map = { Beginner: 'beginner', Intermediate: 'intermediate', Advanced: 'advanced' };
  return map[difficulty] || 'beginner';
}

function getMatchClass(percent) {
  if (percent >= 75) return 'high';
  if (percent >= 40) return 'medium';
  return 'low';
}
