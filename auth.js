/* ============================================================
   PANTRY-TO-OVEN — AUTH LOGIC
   Handles login, register, logout, session guards
   Admin credentials: admin / admin123 (hardcoded, never in storage)
   ============================================================ */

const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };

/* ── LOGIN ───────────────────────────────────────────────── */
function handleLogin(e) {
  e.preventDefault();
  clearFormErrors();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  let valid = true;

  if (!username) { showFieldError('username-error', 'Please enter your username.'); valid = false; }
  if (!password) { showFieldError('password-error', 'Please enter your password.'); valid = false; }
  if (!valid) return;

  /* Check admin first */
  if (
    username.toLowerCase() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    setSession({ username: 'admin', role: 'admin', email: 'admin@pantrytooven.com' });
    window.location.href = 'admin.html';
    return;
  }

  /* Check registered users */
  const user = getUserByUsername(username);
  if (!user || user.password !== password) {
    showFieldError('password-error', 'Incorrect username or password.');
    shakeForm();
    return;
  }

  setSession({ ...user, role: 'user' });
  window.location.href = 'home.html';
}

/* ── REGISTER ────────────────────────────────────────────── */
function handleRegister(e) {
  e.preventDefault();
  clearFormErrors();

  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  let valid = true;

  if (!username || username.length < 3) {
    showFieldError('reg-username-error', 'Username must be at least 3 characters.'); valid = false;
  }
  if (username.toLowerCase() === 'admin') {
    showFieldError('reg-username-error', 'That username is reserved.'); valid = false;
  }
  if (!email || !email.includes('@')) {
    showFieldError('reg-email-error', 'Please enter a valid email address.'); valid = false;
  }
  if (!password || password.length < 6) {
    showFieldError('reg-password-error', 'Password must be at least 6 characters.'); valid = false;
  }
  if (password !== confirm) {
    showFieldError('reg-confirm-error', 'Passwords do not match.'); valid = false;
  }
  if (!valid) return;

  const result = createUser(username, email, password);
  if (!result.ok) {
    showFieldError('reg-username-error', result.error);
    shakeForm();
    return;
  }

  /* Auto-login after registration */
  setSession({ ...result.user, role: 'user' });
  showToast('Account created! Welcome to Pantry-to-Oven 🎉');
  setTimeout(() => { window.location.href = 'home.html'; }, 900);
}

/* ── LOGOUT ──────────────────────────────────────────────── */
function handleLogout() {
  clearSession();
  window.location.href = 'login.html';
}

/* ── UI HELPERS ──────────────────────────────────────────── */
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

function shakeForm() {
  const card = document.querySelector('.auth-card');
  if (!card) return;
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'shake 0.4s ease';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
}

/* ── NAVBAR USER DISPLAY ─────────────────────────────────── */
function initNavbar() {
  const user = getCurrentUser();
  if (!user) return;

  const avatarEl = document.getElementById('nav-avatar');
  const nameEl   = document.getElementById('nav-username');

  if (avatarEl) avatarEl.textContent = getInitials(user.username);
  if (nameEl)   nameEl.textContent   = user.username;

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  /* Mobile hamburger */
  const toggle = document.getElementById('navbar-toggle');
  const nav    = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  /* Close mobile nav on link click */
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => nav && nav.classList.remove('open'));
  });

  /* Highlight active nav link */
  const page = window.location.pathname.split('/').pop() || 'home.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === page || (page === '' && href === 'home.html')) {
      link.classList.add('active');
    }
  });
}
