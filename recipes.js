/* ============================================================
   PANTRY-TO-OVEN — RECIPES HELPER
   Shared recipe card rendering + filter/search logic
   Used by home.html, search.html, saved.html, recently-viewed.html
   ============================================================ */

/* ── RECIPE CARD RENDERER ────────────────────────────────── */
function renderRecipeCard(recipe, options = {}) {
  const {
    showMatch    = false,   /* show match % badge */
    currentUser  = null,
  } = options;

  const user    = currentUser || getCurrentUser();
  const saved   = user ? isSaved(user.username, recipe.id) : false;
  const totalTime = (recipe.prepTime || 0) + (recipe.bakeTime || 0);
  const diffClass = getDifficultyClass(recipe.difficulty);

  /* Match badge HTML */
  let matchHTML = '';
  if (showMatch && recipe.matchPercent !== undefined) {
    const mc = getMatchClass(recipe.matchPercent);
    matchHTML = `
      <div style="margin-bottom:var(--sp-2);">
        <span class="match-badge ${mc}">
          &#9679; ${recipe.matchPercent}% match
        </span>
      </div>`;

    if (recipe.missingIngredients && recipe.missingIngredients.length > 0) {
      const missing = recipe.missingIngredients.slice(0, 4).join(', ');
      const more    = recipe.missingIngredients.length > 4
        ? ` +${recipe.missingIngredients.length - 4} more` : '';
      matchHTML += `
        <p class="missing-ingredients">
          <span>Missing:</span> ${missing}${more}
        </p>`;
    } else {
      matchHTML += `<p class="missing-ingredients" style="color:var(--success);font-weight:600;">
        &#10003; You have all ingredients!
      </p>`;
    }
  }

  /* Image or placeholder */
  const imageHTML = recipe.image
    ? `<img class="card-image" src="${recipe.image}" alt="${recipe.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="card-image-placeholder" style="display:none;">🧁</div>`
    : `<div class="card-image-placeholder">🧁</div>`;

  return `
    <div class="card recipe-card fade-in-up" data-id="${recipe.id}" onclick="openRecipe('${recipe.id}')">
      <div style="position:relative;">
        ${imageHTML}
        <button
          class="recipe-card-save-btn ${saved ? 'saved' : ''}"
          data-id="${recipe.id}"
          onclick="event.stopPropagation(); toggleSaveCard(this, '${recipe.id}')"
          title="${saved ? 'Remove from saved' : 'Save recipe'}"
          aria-label="${saved ? 'Remove from saved' : 'Save recipe'}"
        >${saved ? '♥' : '♡'}</button>
        <div style="position:absolute;top:var(--sp-3);left:var(--sp-3);">
          <span class="badge badge-category">${recipe.category}</span>
        </div>
      </div>
      <div class="card-body">
        ${matchHTML}
        <h3 class="recipe-card-title">${recipe.title}</h3>
        <div class="recipe-card-meta">
          <span class="recipe-card-meta-item">
            <span class="badge badge-${diffClass}">${recipe.difficulty}</span>
          </span>
          <span class="recipe-card-meta-item">
            &#128336; ${formatTime(totalTime)}
          </span>
          <span class="recipe-card-meta-item">
            &#128101; ${recipe.servings} servings
          </span>
        </div>
      </div>
    </div>`;
}

/* ── GRID RENDERER ───────────────────────────────────────── */
function renderRecipeGrid(containerId, recipes, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!recipes || recipes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">&#127859;</div>
        <h3 class="empty-state-title">${options.emptyTitle || 'No recipes found'}</h3>
        <p class="empty-state-text">${options.emptyText || 'Try adjusting your filters or search terms.'}</p>
        ${options.emptyAction || ''}
      </div>`;
    return;
  }

  container.innerHTML = recipes.map(r => renderRecipeCard(r, options)).join('');
}

/* ── OPEN RECIPE (navigate to detail) ───────────────────── */
function openRecipe(id) {
  const user = getCurrentUser();
  if (user && user.role !== 'admin') {
    addViewed(user.username, id);
  }
  window.location.href = `recipe-detail.html?id=${id}`;
}

/* ── SAVE TOGGLE ON CARD ─────────────────────────────────── */
function toggleSaveCard(btn, recipeId) {
  const user = getCurrentUser();
  if (!user || user.role === 'admin') {
    showToast('Please log in to save recipes.');
    return;
  }
  const nowSaved = toggleSave(user.username, recipeId);
  btn.textContent = nowSaved ? '♥' : '♡';
  btn.classList.toggle('saved', nowSaved);
  btn.title       = nowSaved ? 'Remove from saved' : 'Save recipe';
  showToast(nowSaved ? '♥ Recipe saved!' : 'Recipe removed from saved.');
}

/* ── FILTER + SEARCH ENGINE ──────────────────────────────── */
function filterRecipes(recipes, { query = '', category = '', difficulty = '', maxTime = '' } = {}) {
  const q = query.toLowerCase().trim();

  return recipes.filter(r => {
    /* Keyword search — title, category, ingredients */
    if (q) {
      const inTitle = r.title.toLowerCase().includes(q);
      const inCat   = r.category.toLowerCase().includes(q);
      const inIngr  = (r.ingredients || []).some(i => i.name.toLowerCase().includes(q));
      if (!inTitle && !inCat && !inIngr) return false;
    }

    /* Category filter */
    if (category && r.category !== category) return false;

    /* Difficulty filter */
    if (difficulty && r.difficulty !== difficulty) return false;

    /* Time filter */
    if (maxTime) {
      const total = (r.prepTime || 0) + (r.bakeTime || 0);
      if (total > parseInt(maxTime)) return false;
    }

    return true;
  });
}

/* ── RESULT COUNT LABEL ──────────────────────────────────── */
function updateResultCount(containerId, count, label = 'recipe') {
  const el = document.getElementById(containerId);
  if (el) el.textContent = `${count} ${label}${count !== 1 ? 's' : ''}`;
}

/* ── BUILD CATEGORY OPTIONS ──────────────────────────────── */
const CATEGORIES  = ['Cakes', 'Cookies', 'Bread', 'Pastries', 'Muffins', 'Pies', 'Tarts'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const TIME_OPTIONS = [
  { label: 'Under 30 min', value: '30' },
  { label: 'Under 1 hour', value: '60' },
  { label: 'Under 2 hours', value: '120' },
];

function buildCategoryOptions(selectId, includeAll = true) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = (includeAll ? '<option value="">All Categories</option>' : '') +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
}

function buildDifficultyOptions(selectId, includeAll = true) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = (includeAll ? '<option value="">All Difficulties</option>' : '') +
    DIFFICULTIES.map(d => `<option value="${d}">${d}</option>`).join('');
}

function buildTimeOptions(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Any Time</option>' +
    TIME_OPTIONS.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
}
