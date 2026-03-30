/* ═══════════════════════════════════════════════════
   HEALTH CONNECT — APP.JS
   Frontend application logic
═══════════════════════════════════════════════════ */

const API = window.location.origin + '/api';
let authToken = localStorage.getItem('hc_token') || null;
let demoInterval = null;
let mainChartInstance = null;
let scoreChartInstance = null;
let heroChartInstance = null;

// ─── Utility ─────────────────────────────────────
function showModal(id) {
  const modal = new bootstrap.Modal(document.getElementById(id));
  modal.show();
}
function hideModal(id) {
  const instance = bootstrap.Modal.getInstance(document.getElementById(id));
  if (instance) instance.hide();
}
function switchModal(from, to) {
  hideModal(from);
  setTimeout(() => showModal(to), 400);
}
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
function showToast(title, body, type = 'info') {
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastBody').textContent = body;
  const toast = new bootstrap.Toast(document.getElementById('hcToast'));
  toast.show();
}
function setLoading(btnId, textId, spinnerId, loading) {
  document.getElementById(btnId).disabled = loading;
  document.getElementById(textId).textContent = loading ? 'Please wait...' : document.getElementById(textId).dataset.original || document.getElementById(textId).textContent;
  document.getElementById(spinnerId).classList.toggle('d-none', !loading);
}
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('d-none');
}
function hideError(id) {
  document.getElementById(id).classList.add('d-none');
}

// ─── Navbar scroll effect ─────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  nav?.classList.toggle('scrolled', window.scrollY > 50);
});

// ─── API Calls ────────────────────────────────────
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
    return { success: false, message: 'Network error. Is the server running?' };
  }
}

// ─── Auth ─────────────────────────────────────────
async function handleLogin() {
  hideError('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showError('loginError', 'Please fill in all fields.');

  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginSpinner').classList.remove('d-none');

  const res = await apiCall('/auth/login', 'POST', { email, password });

  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginSpinner').classList.add('d-none');

  if (res.success) {
    authToken = res.token;
    localStorage.setItem('hc_token', res.token);
    hideModal('loginModal');
    showToast('Welcome back!', `Hello ${res.user.fullName} 👋`, 'success');
    updateNavForLoggedIn(res.user);
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
    dateOfBirth: document.getElementById('regDob').value,
    bloodGroup: document.getElementById('regBlood').value,
    emergencyContact: {
      name: document.getElementById('regEmergName').value.trim(),
      phone: document.getElementById('regEmergPhone').value.trim(),
      relation: document.getElementById('regEmergRelation').value
    }
  };

  if (!data.fullName || !data.email || !data.phone || !data.password) {
    return showError('registerError', 'Please fill in all required fields.');
  }
  if (data.password.length < 6) {
    return showError('registerError', 'Password must be at least 6 characters.');
  }

  document.getElementById('registerBtn').disabled = true;
  document.getElementById('registerSpinner').classList.remove('d-none');

  const res = await apiCall('/auth/register', 'POST', data);

  document.getElementById('registerBtn').disabled = false;
  document.getElementById('registerSpinner').classList.add('d-none');

  if (res.success) {
    authToken = res.token;
    localStorage.setItem('hc_token', res.token);
    document.getElementById('registerSuccess').textContent = `Account created successfully! Welcome, ${res.user.fullName}!`;
    document.getElementById('registerSuccess').classList.remove('d-none');
    setTimeout(() => {
      hideModal('registerModal');
      updateNavForLoggedIn(res.user);
      showToast('Account Created!', 'Your health profile is ready 🎉');
    }, 1500);
  } else {
    showError('registerError', res.message || 'Registration failed.');
  }
}

function updateNavForLoggedIn(user) {
  // Replace sign-in/register buttons with profile
  const navRight = document.querySelector('.navbar-nav.ms-auto');
  if (!navRight) return;
  const last2 = navRight.querySelectorAll('li:last-child, li:nth-last-child(2)');
  last2.forEach(el => el.remove());
  const profileLi = document.createElement('li');
  profileLi.className = 'nav-item ms-2';
  profileLi.innerHTML = `
    <div class="dropdown">
      <button class="btn btn-outline-accent btn-sm dropdown-toggle" data-bs-toggle="dropdown">
        <i class="bi bi-person-circle me-1"></i>${user.fullName.split(' ')[0]}
      </button>
      <ul class="dropdown-menu dropdown-menu-end" style="background:var(--bg-card);border:1px solid var(--border)">
        <li><a class="dropdown-item text-light" href="#monitoring"><i class="bi bi-heart-pulse me-2 text-accent"></i>My Dashboard</a></li>
        <li><a class="dropdown-item text-light" href="#" onclick="showModal('bookingModal')"><i class="bi bi-calendar me-2 text-accent"></i>Book Appointment</a></li>
        <li><hr class="dropdown-divider border-secondary"></li>
        <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</a></li>
      </ul>
    </div>`;
  navRight.appendChild(profileLi);
}

function logout() {
  authToken = null;
  localStorage.removeItem('hc_token');
  location.reload();
}

// ─── Doctors Grid ─────────────────────────────────
const DOCTORS = [
  { name: 'Dr. Priya Sharma', specialty: 'General Medicine', rating: 4.9, available: true, emoji: '👩‍⚕️', exp: '12 yrs' },
  { name: 'Dr. Arjun Mehta', specialty: 'Cardiology', rating: 4.8, available: true, emoji: '👨‍⚕️', exp: '15 yrs' },
  { name: 'Dr. Sunita Rao', specialty: 'Neurology', rating: 4.7, available: true, emoji: '👩‍⚕️', exp: '10 yrs' },
  { name: 'Dr. Vikram Patel', specialty: 'Orthopedics', rating: 4.9, available: false, emoji: '👨‍⚕️', exp: '18 yrs' },
  { name: 'Dr. Meera Nair', specialty: 'Pediatrics', rating: 4.8, available: true, emoji: '👩‍⚕️', exp: '8 yrs' },
  { name: 'Dr. Rajesh Kumar', specialty: 'Dermatology', rating: 4.6, available: true, emoji: '👨‍⚕️', exp: '11 yrs' },
];

function renderDoctors() {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;
  grid.innerHTML = DOCTORS.map(doc => `
    <div class="col-md-6 col-lg-4">
      <div class="doctor-card h-100">
        <div class="doc-avatar">${doc.emoji}</div>
        <div class="doc-name">${doc.name}</div>
        <div class="doc-spec">${doc.specialty}</div>
        <div class="doc-rating mb-2">
          ${'★'.repeat(Math.floor(doc.rating))}${'☆'.repeat(5-Math.floor(doc.rating))}
          <span class="text-muted ms-1">${doc.rating}</span>
        </div>
        <div class="text-muted small mb-3"><i class="bi bi-briefcase me-1"></i>${doc.exp} experience</div>
        <div class="${doc.available ? 'doc-status-available' : 'doc-status-busy'} mb-3">
          <i class="bi bi-circle-fill me-1" style="font-size:0.5rem"></i>
          ${doc.available ? 'Available Now' : 'Currently Busy'}
        </div>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-accent btn-sm" onclick="${doc.available ? "showModal('bookingModal')" : "showToast('Doctor Busy','This doctor is currently unavailable. Please try another.')"}">
            <i class="bi bi-${doc.available ? 'video' : 'clock'} me-1"></i>
            ${doc.available ? 'Consult Now' : 'Schedule Later'}
          </button>
          <button class="btn btn-glass btn-sm" onclick="showToast('Profile', 'Full profile coming soon!')">
            <i class="bi bi-person-badge"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Booking ──────────────────────────────────────
async function handleBooking() {
  const data = {
    specialty: document.getElementById('bookSpecialty').value,
    type: document.getElementById('bookType').value,
    scheduledAt: document.getElementById('bookDateTime').value,
    doctorName: document.getElementById('bookDoctor').value,
    symptoms: document.getElementById('bookSymptoms').value,
  };

  if (!data.scheduledAt) return showToast('Error', 'Please select a date and time.');

  if (!authToken) {
    hideModal('bookingModal');
    setTimeout(() => showModal('loginModal'), 400);
    showToast('Sign In Required', 'Please sign in to book appointments.');
    return;
  }

  const res = await apiCall('/appointments', 'POST', data);
  if (res.success) {
    document.getElementById('bookingSuccess').textContent = '✅ Appointment booked! You will receive a confirmation shortly.';
    document.getElementById('bookingSuccess').classList.remove('d-none');
    showToast('Appointment Booked!', `Your ${data.specialty} consultation is confirmed.`);
    setTimeout(() => hideModal('bookingModal'), 2500);
  } else {
    showToast('Booking Failed', res.message || 'Please try again.');
  }
}

// ─── Charts ───────────────────────────────────────
const chartDefaults = {
  type: 'line',
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 10 } } }
    },
    elements: { point: { radius: 3 }, line: { tension: 0.4 } }
  }
};

function generateWeekData(base, variance) {
  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => ({
    label: d,
    value: Math.round(base + (Math.random() - 0.5) * variance * 2)
  }));
}

const chartData = {
  heart: generateWeekData(72, 8),
  spo2: generateWeekData(98, 2),
  glucose: generateWeekData(95, 15)
};

function initMainChart(type = 'heart') {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;

  if (mainChartInstance) mainChartInstance.destroy();

  const colors = { heart: '#ff4757', spo2: '#1e90ff', glucose: '#a855f7' };
  const d = chartData[type];

  mainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.map(x => x.label),
      datasets: [{
        data: d.map(x => x.value),
        borderColor: colors[type],
        backgroundColor: colors[type] + '15',
        fill: true,
        borderWidth: 2.5,
        pointBackgroundColor: colors[type],
      }]
    },
    options: chartDefaults.options
  });
}

function switchChart(type) {
  document.querySelectorAll('.btn-group .btn-outline-secondary').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
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
  const data = Array.from({length: 20}, () => Math.round(68 + Math.random() * 12));
  heroChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: '#ff4757',
        backgroundColor: 'rgba(255,71,87,0.1)',
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

// ─── Live Vitals Demo ─────────────────────────────
const vitalRanges = {
  heart: { base: 72, variance: 8, min: 40, max: 140, id: 'v-heart', sid: 'vs-heart', card: 'vc-heart' },
  spo2: { base: 98, variance: 2, min: 90, max: 100, id: 'v-spo2', sid: 'vs-spo2', card: 'vc-spo2' },
  temp: { base: 36.6, variance: 0.4, min: 35, max: 40, id: 'v-temp', sid: 'vs-temp', card: 'vc-temp', decimal: 1 },
  glucose: { base: 95, variance: 10, min: 50, max: 400, id: 'v-glucose', sid: 'vs-glucose', card: 'vc-glucose' },
  resp: { base: 16, variance: 3, min: 8, max: 30, id: 'v-resp', sid: 'vs-resp', card: 'vc-resp' },
};

function getVitalStatus(key, value) {
  const normal = { heart: [60,100], spo2: [95,100], temp: [36,37.5], glucose: [70,140], resp: [12,20] };
  const warning = { heart: [40,140], spo2: [90,100], temp: [35,40], glucose: [50,400], resp: [8,30] };
  const [nLow, nHigh] = normal[key];
  const [wLow, wHigh] = warning[key];
  if (value >= nLow && value <= nHigh) return 'normal';
  if (value >= wLow && value <= wHigh) return 'warning';
  return 'critical';
}

function updateVitals() {
  Object.entries(vitalRanges).forEach(([key, v]) => {
    const val = +(v.base + (Math.random() - 0.5) * v.variance * 2).toFixed(v.decimal || 0);
    const status = getVitalStatus(key, val);
    const el = document.getElementById(v.id);
    const sel = document.getElementById(v.sid);
    const card = document.getElementById(v.card);
    if (el) el.textContent = val;
    if (sel) {
      sel.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      sel.className = `vc-status ${status}`;
    }
    if (card) {
      card.className = `vital-card ${status !== 'normal' ? status : ''}`;
    }
    if (status === 'critical') {
      showToast('⚠️ Critical Alert', `${key.charAt(0).toUpperCase()+key.slice(1)} reading is critical: ${val}`, 'danger');
    }
  });

  // Update BP separately
  const bpSys = Math.round(120 + (Math.random()-0.5)*20);
  const bpDia = Math.round(80 + (Math.random()-0.5)*10);
  const bpEl = document.getElementById('v-bp');
  if (bpEl) bpEl.textContent = `${bpSys}/${bpDia}`;
}

function startDemo() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
    showToast('Monitoring Paused', 'Live monitoring has been paused.');
    return;
  }
  updateVitals();
  demoInterval = setInterval(updateVitals, 2500);
  showToast('Live Monitoring Active', 'Real-time vitals are now updating every 2.5 seconds.');
}

// ─── Emergency ────────────────────────────────────
let sosHold = null;

function triggerSOS() {
  const btn = document.getElementById('sosBtn');
  btn.classList.add('activated');
  showToast('Hold to Activate', 'Hold the SOS button for 3 seconds to send emergency alert.');

  sosHold = setTimeout(() => {
    btn.classList.remove('activated');
    triggerEmergency();
  }, 3000);
}

document.addEventListener('mouseup', () => { if (sosHold) { clearTimeout(sosHold); document.getElementById('sosBtn')?.classList.remove('activated'); } });
document.addEventListener('touchend', () => { if (sosHold) { clearTimeout(sosHold); document.getElementById('sosBtn')?.classList.remove('activated'); } });

function triggerEmergency() {
  showModal('emergencyModal');
  // Simulate notifications
  setTimeout(() => {
    const el = document.getElementById('es-ambulance');
    if (el) { el.innerHTML = '<i class="bi bi-check-circle text-success"></i> Ambulance Dispatch: <strong class="text-success">Notified ✓</strong>'; el.classList.add('done'); }
  }, 1500);
  setTimeout(() => {
    const el = document.getElementById('es-contact');
    if (el) { el.innerHTML = '<i class="bi bi-check-circle text-success"></i> Emergency Contact: <strong class="text-success">SMS Sent ✓</strong>'; el.classList.add('done'); }
  }, 2500);
  setTimeout(() => {
    const el = document.getElementById('es-doctor');
    if (el) { el.innerHTML = '<i class="bi bi-check-circle text-success"></i> On-Call Doctor: <strong class="text-success">Connected ✓</strong>'; el.classList.add('done'); }
  }, 3500);

  // Backend call
  if (authToken) {
    navigator.geolocation?.getCurrentPosition(pos => {
      apiCall('/emergency/alert', 'POST', {
        type: 'manual',
        severity: 'critical',
        triggeredBy: 'manual',
        location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
      });
    }, () => {
      apiCall('/emergency/alert', 'POST', { type: 'manual', severity: 'critical', triggeredBy: 'manual' });
    });
  }
}

function triggerEmergencyTest() {
  triggerEmergency();
}

// ─── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDoctors();
  initMainChart('heart');
  initScoreChart();
  initHeroChart();

  // Pre-fill booking datetime to now + 1hr
  const dtInput = document.getElementById('bookDateTime');
  if (dtInput) {
    const now = new Date(Date.now() + 3600000);
    dtInput.value = now.toISOString().slice(0,16);
  }

  // Check if already logged in
  if (authToken) {
    apiCall('/auth/me').then(res => {
      if (res.success) updateNavForLoggedIn(res.user);
      else { authToken = null; localStorage.removeItem('hc_token'); }
    });
  }

  // Socket.IO connection
  try {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => console.log('🔌 Real-time connected'));
    socket.on('alert:critical', data => {
      showToast('🚨 Critical Alert', `Critical reading detected for user`, 'danger');
    });
    socket.on('emergency:alert', data => {
      console.log('Emergency alert received', data);
    });
  } catch(e) { console.log('Socket.IO unavailable in demo mode'); }

  // Animate vital cards on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.style.opacity = '1'; });
  }, { threshold: 0.1 });
  document.querySelectorAll('.vital-card, .feature-card, .step-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
  setTimeout(() => {
    document.querySelectorAll('.vital-card, .feature-card, .step-card').forEach(el => {
      el.style.opacity = '1';
    });
  }, 500);
});
