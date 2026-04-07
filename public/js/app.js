const API = 'https://healthconnect-dbe4.onrender.com/api';
let authToken = localStorage.getItem('hc_token') || null;
let demoInterval = null;
let mainChartInstance = null;
let scoreChartInstance = null;
let heroChartInstance = null;
function showModal(id) {
  new bootstrap.Modal(document.getElementById(id)).show();
}
function hideModal(id) {
  const inst = bootstrap.Modal.getInstance(document.getElementById(id));
  if (inst) inst.hide();
}
function switchModal(from, to) {
  hideModal(from);
  setTimeout(() => showModal(to), 350);
}
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
function showToast(title, body) {
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastBody').textContent = body;
  new bootstrap.Toast(document.getElementById('hcToast'), { delay: 4000 }).show();
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('d-none');
}
function hideError(id) {
  document.getElementById(id)?.classList.add('d-none');
}
window.addEventListener('scroll', () => {
  document.getElementById('mainNav')?.classList.toggle('scrolled', window.scrollY > 50);
});
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + endpoint, opts);
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Cannot reach server. Make sure the backend is running on port 3000.' };
  }
}
let currentLoginRole = 'patient';

async function handleLogin() {
  hideError('loginError');
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showError('loginError', 'Please fill in all fields.');

  const body = { email, password, role: currentLoginRole };
  if (currentLoginRole === 'doctor') {
    const lic = document.getElementById('loginLicence')?.value.trim();
    if (!lic) return showError('loginError', 'Medical licence number is required for doctor login.');
    body.licenceNumber = lic;
  }
  if (currentLoginRole === 'admin') {
    const code = document.getElementById('loginAdminCode')?.value.trim();
    if (!code) return showError('loginError', 'Admin access code is required.');
    body.adminCode = code;
  }

  const btn = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');
  btn.disabled = true;
  spinner.classList.remove('d-none');
  const res = await apiCall('/auth/login', 'POST', body);
  btn.disabled = false;
  spinner.classList.add('d-none');

  if (res.success) {
    authToken = res.token;
    localStorage.setItem('hc_token', res.token);
    localStorage.setItem('hc_user', JSON.stringify(res.user));
    hideModal('loginModal');
    showToast('Welcome back!', `Hello, ${res.user.fullName} 👋`);
    updateNavForLoggedIn(res.user);
    const dest = res.user.role === 'doctor' ? 'dashboard-doctor.html'
               : res.user.role === 'admin'  ? 'dashboard-admin.html'
               : 'dashboard.html';
    setTimeout(() => { window.location.href = dest; }, 800);
  } else {
    showError('loginError', res.message || 'Login failed.');
  }
}
async function handleRegister() {
  hideError('registerError');
  document.getElementById('registerSuccess').classList.add('d-none');
  const data = {
    fullName: document.getElementById('regName').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    password: document.getElementById('regPassword').value,
    dateOfBirth: document.getElementById('regDob').value || undefined,
    bloodGroup: document.getElementById('regBlood').value,
    emergencyContact: {
      name: document.getElementById('regEmergName').value.trim(),
      phone: document.getElementById('regEmergPhone').value.trim(),
      relation: document.getElementById('regEmergRelation').value
    }
  };
  if (!data.fullName || !data.email || !data.phone || !data.password) {
    return showError('registerError', 'Full name, email, phone and password are required.');
  }
  if (data.password.length < 6) {
    return showError('registerError', 'Password must be at least 6 characters.');
  }
  const btn = document.getElementById('registerBtn');
  const spinner = document.getElementById('registerSpinner');
  btn.disabled = true;
  spinner.classList.remove('d-none');
  const res = await apiCall('/auth/register', 'POST', data);
  btn.disabled = false;
  spinner.classList.add('d-none');
  if (res.success) {
    authToken = res.token;
    localStorage.setItem('hc_token', res.token);
    localStorage.setItem('hc_user', JSON.stringify(res.user));
    const successEl = document.getElementById('registerSuccess');
    successEl.textContent = `Account created! Welcome, ${res.user.fullName}!`;
    successEl.classList.remove('d-none');
    setTimeout(() => {
      hideModal('registerModal');
      updateNavForLoggedIn(res.user);
      showToast('Account Created!', 'Your health profile is ready.');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    }, 1200);
  } else {
    showError('registerError', res.message || 'Registration failed.');
  }
}
function updateNavForLoggedIn(user) {
  const nav = document.querySelector('.navbar-nav.ms-auto');
  if (!nav) return;
  const items = nav.querySelectorAll('li');
  if (items.length >= 2) {
    items[items.length - 1].remove();
    items[items.length - 2].remove();
  }
  const li = document.createElement('li');
  li.className = 'nav-item ms-2';
  li.innerHTML = `
    <div class="dropdown">
      <button class="btn btn-outline-accent btn-sm dropdown-toggle" data-bs-toggle="dropdown">
        <i class="bi bi-person-circle me-1"></i>${user.fullName.split(' ')[0]}
      </button>
      <ul class="dropdown-menu dropdown-menu-end" style="background:var(--bg-card);border:1px solid var(--border)">
        <li><a class="dropdown-item text-light" href="dashboard.html"><i class="bi bi-grid me-2 text-accent"></i>Dashboard</a></li>
        <li><a class="dropdown-item text-light" href="#" onclick="showModal('bookingModal')"><i class="bi bi-calendar me-2 text-accent"></i>Book Appointment</a></li>
        <li><hr class="dropdown-divider border-secondary"></li>
        <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</a></li>
      </ul>
    </div>`;
  nav.appendChild(li);
}
function logout() {
  authToken = null;
  localStorage.removeItem('hc_token');
  localStorage.removeItem('hc_user');
  location.reload();
}

// ─── Role tab switcher (login modal) ─────────────
function switchRoleTab(role) {
  currentLoginRole = role;          // keep login handler in sync
  window._loginRole = role;         // legacy alias
  ['patient','doctor','admin'].forEach(r => {
    document.getElementById(`tab-${r}`)?.classList.toggle('active', r === role);
    document.getElementById(`badge-${r}`)?.classList.toggle('d-none', r !== role);
  });
  document.getElementById('field-licence')?.classList.toggle('d-none', role !== 'doctor');
  document.getElementById('field-admincode')?.classList.toggle('d-none', role !== 'admin');
  document.getElementById('loginError')?.classList.add('d-none');
}
function goToDashboard() {
  if (authToken) {
    window.location.href = 'dashboard.html';
  } else {
    showModal('loginModal');
    showError('loginError', 'Please sign in to access your dashboard.');
  }
}
async function renderDoctors() {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;
  const res = await apiCall('/appointments/doctors');
  const doctors = res.success ? res.doctors : [];
  if (!doctors.length) {
    grid.innerHTML = '<div class="col-12 text-center text-muted py-4">Unable to load doctors. Please ensure the server is running.</div>';
    return;
  }
  grid.innerHTML = doctors.map(doc => `
    <div class="col-md-6 col-lg-4">
      <div class="doctor-card h-100">
        <div class="doc-avatar">${doc.emoji || '👨‍⚕️'}</div>
        <div class="doc-name">${doc.name}</div>
        <div class="doc-spec">${doc.specialty}</div>
        <div class="doc-rating mb-2">
          ${'★'.repeat(Math.floor(doc.rating))}${'☆'.repeat(5 - Math.floor(doc.rating))}
          <span class="text-muted ms-1">${doc.rating}</span>
        </div>
        <div class="text-muted small mb-3"><i class="bi bi-briefcase me-1"></i>${doc.exp} experience</div>
        <div class="${doc.available ? 'doc-status-available' : 'doc-status-busy'} mb-3">
          <i class="bi bi-circle-fill me-1" style="font-size:0.5rem"></i>
          ${doc.available ? 'Available Now' : 'Currently Busy'}
        </div>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-accent btn-sm" onclick="${doc.available ? "showModal('bookingModal')" : "showToast('Doctor Busy','This doctor is currently unavailable.')"}">
            <i class="bi bi-${doc.available ? 'video' : 'clock'} me-1"></i>
            ${doc.available ? 'Consult Now' : 'Schedule Later'}
          </button>
        </div>
      </div>
    </div>`).join('');
}
async function handleBooking() {
  const data = {
    specialty: document.getElementById('bookSpecialty').value,
    type: document.getElementById('bookType').value,
    scheduledAt: document.getElementById('bookDateTime').value,
    doctorName: document.getElementById('bookDoctor').value || 'Next available doctor',
    symptoms: document.getElementById('bookSymptoms').value
  };
  if (!data.scheduledAt) return showToast('Missing Info', 'Please select a date and time.');
  if (!authToken) {
    hideModal('bookingModal');
    setTimeout(() => showModal('loginModal'), 350);
    showToast('Sign In Required', 'Please sign in to book appointments.');
    return;
  }
  const res = await apiCall('/appointments', 'POST', data);
  if (res.success) {
    const el = document.getElementById('bookingSuccess');
    el.textContent = '✅ Appointment booked! You will receive a confirmation shortly.';
    el.classList.remove('d-none');
    showToast('Appointment Booked!', `Your ${data.specialty} consultation is confirmed.`);
    setTimeout(() => hideModal('bookingModal'), 2500);
  } else {
    showToast('Booking Failed', res.message || 'Please try again.');
  }
}
function buildWeekLabels() {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}
function randArr(base, variance, len) {
  return Array.from({ length: len }, () => +(base + (Math.random() - 0.5) * variance * 2).toFixed(1));
}
const chartColors = { heart: '#ff4757', spo2: '#1e90ff', glucose: '#a855f7' };
const chartDatasets = {
  heart: randArr(72, 8, 7),
  spo2: randArr(97, 2, 7),
  glucose: randArr(95, 15, 7)
};
function initMainChart(type = 'heart') {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;
  if (mainChartInstance) mainChartInstance.destroy();
  mainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: buildWeekLabels(),
      datasets: [{
        data: chartDatasets[type],
        borderColor: chartColors[type],
        backgroundColor: chartColors[type] + '18',
        fill: true,
        borderWidth: 2.5,
        pointBackgroundColor: chartColors[type],
        pointRadius: 4,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 10 } } }
      }
    }
  });
}
function switchChart(type, btn) {
  document.querySelectorAll('.btn-group .btn-outline-secondary').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  initMainChart(type);
}
function initScoreChart() {
  const ctx = document.getElementById('scoreChart');
  if (!ctx) return;
  if (scoreChartInstance) scoreChartInstance.destroy();
  scoreChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [87, 13],
        backgroundColor: ['#00d4aa', 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        cutout: '78%'
      }]
    },
    options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 1500 } }
  });
}
function initHeroChart() {
  const ctx = document.getElementById('heroChart');
  if (!ctx) return;
  if (heroChartInstance) heroChartInstance.destroy();
  const data = randArr(72, 10, 20);
  heroChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: '#ff4757',
        backgroundColor: 'rgba(255,71,87,0.1)',
        fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}
const vitalCfg = {
  heart:   { base: 72,   variance: 8,   decimal: 0, id: 'v-heart',   sid: 'vs-heart',   card: 'vc-heart'   },
  spo2:    { base: 98,   variance: 2,   decimal: 0, id: 'v-spo2',    sid: 'vs-spo2',    card: 'vc-spo2'    },
  temp:    { base: 36.6, variance: 0.4, decimal: 1, id: 'v-temp',    sid: 'vs-temp',    card: 'vc-temp'    },
  glucose: { base: 95,   variance: 10,  decimal: 0, id: 'v-glucose', sid: 'vs-glucose', card: 'vc-glucose' },
  resp:    { base: 16,   variance: 3,   decimal: 0, id: 'v-resp',    sid: 'vs-resp',    card: 'vc-resp'    }
};
function vitalStatus(key, val) {
  const normal  = { heart:[60,100], spo2:[95,100], temp:[36,37.5], glucose:[70,140], resp:[12,20] };
  const warning = { heart:[40,140], spo2:[90,100], temp:[35,40],   glucose:[50,400], resp:[8,30]  };
  const [nL, nH] = normal[key];
  const [wL, wH] = warning[key];
  if (val >= nL && val <= nH) return 'normal';
  if (val >= wL && val <= wH) return 'warning';
  return 'critical';
}
function updateVitals() {
  Object.entries(vitalCfg).forEach(([key, cfg]) => {
    const val = +(cfg.base + (Math.random() - 0.5) * cfg.variance * 2).toFixed(cfg.decimal);
    const status = vitalStatus(key, val);
    const el   = document.getElementById(cfg.id);
    const sel  = document.getElementById(cfg.sid);
    const card = document.getElementById(cfg.card);
    if (el)   el.textContent = val;
    if (sel)  { sel.textContent = status.charAt(0).toUpperCase() + status.slice(1); sel.className = `vc-status ${status}`; }
    if (card) card.className = `vital-card${status !== 'normal' ? ' ' + status : ''}`;
  });
  const bpSys = Math.round(120 + (Math.random() - 0.5) * 20);
  const bpDia = Math.round(80  + (Math.random() - 0.5) * 10);
  const bpEl  = document.getElementById('v-bp');
  if (bpEl) bpEl.textContent = `${bpSys}/${bpDia}`;
}
function startDemo() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
    showToast('Monitoring Paused', 'Live demo has been stopped.');
    return;
  }
  updateVitals();
  demoInterval = setInterval(updateVitals, 2500);
  showToast('Live Demo Active', 'Vitals updating every 2.5 seconds.');
}
let sosTimer = null;
function triggerSOS() {
  const btn = document.getElementById('sosBtn');
  if (!btn) return;
  btn.classList.add('activated');
  sosTimer = setTimeout(() => {
    btn.classList.remove('activated');
    triggerEmergency();
  }, 3000);
}
document.addEventListener('mouseup',  cancelSOS);
document.addEventListener('touchend', cancelSOS);
function cancelSOS() {
  if (sosTimer) { clearTimeout(sosTimer); sosTimer = null; }
  document.getElementById('sosBtn')?.classList.remove('activated');
}
function triggerEmergency() {
  showModal('emergencyModal');
  const steps = [
    { id: 'es-ambulance', html: '<i class="bi bi-check-circle text-success me-1"></i>Ambulance Dispatch: <strong class="text-success">Notified ✓</strong>' },
    { id: 'es-contact',   html: '<i class="bi bi-check-circle text-success me-1"></i>Emergency Contact: <strong class="text-success">SMS Sent ✓</strong>' },
    { id: 'es-doctor',    html: '<i class="bi bi-check-circle text-success me-1"></i>On-Call Doctor: <strong class="text-success">Connected ✓</strong>' }
  ];
  steps.forEach((s, i) => {
    setTimeout(() => { const el = document.getElementById(s.id); if (el) el.innerHTML = s.html; }, (i + 1) * 1500);
  });
  if (authToken) {
    const send = (loc) => apiCall('/emergency/alert', 'POST', { type: 'manual', severity: 'critical', triggeredBy: 'manual', location: loc || {} });
    navigator.geolocation?.getCurrentPosition(
      pos => send({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => send()
    );
  }
}
function triggerEmergencyTest() { triggerEmergency(); }
document.addEventListener('DOMContentLoaded', () => {
  renderDoctors();
  initMainChart('heart');
  initScoreChart();
  initHeroChart();
  const dtInput = document.getElementById('bookDateTime');
  if (dtInput) dtInput.value = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  if (authToken) {
    apiCall('/auth/me').then(res => {
      if (res.success) {
        localStorage.setItem('hc_user', JSON.stringify(res.user));
        updateNavForLoggedIn(res.user);
      } else {
        authToken = null;
        localStorage.removeItem('hc_token');
        localStorage.removeItem('hc_user');
      }
    });
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get('require_login') || params.get('session_expired')) {
    const msg = params.get('session_expired') ? 'Your session has expired. Please sign in again.' : 'Please sign in to access the dashboard.';
    setTimeout(() => {
      showModal('loginModal');
      showError('loginError', msg);
    }, 400);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  try {
    const socket = io('https://healthconnect-dbe4.onrender.com', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => console.log('🔌 Socket connected to backend'));
    socket.on('alert:critical', () => showToast('🚨 Critical Alert', 'A critical vital reading was detected.'));
    socket.on('connect_error', (e) => console.warn('Socket connection error:', e.message));
  } catch (e) {
    console.warn('Socket.IO unavailable:', e.message);
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.style.opacity = '1'; });
  }, { threshold: 0.1 });
  document.querySelectorAll('.vital-card, .feature-card, .step-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s ease';
    observer.observe(el);
  });
});
