/* ═══════════════════════════════════════════════════
   HEALTH CONNECT — DASHBOARD.JS
   Backend: http://localhost:3000
   Frontend: http://localhost:5500
═══════════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';
let authToken = localStorage.getItem('hc_token') || null;
let liveInterval = null;
let hrChart = null, dashScore = null, reportChartInst = null, liveHrC = null, liveSpo2C = null;
let currentUser = null;

// ─── Utilities ───────────────────────────────────
function showToast(title, body) {
  document.getElementById('dashToastTitle').textContent = title;
  document.getElementById('dashToastBody').textContent = body;
  new bootstrap.Toast(document.getElementById('dashToast'), { delay: 4000 }).show();
}
function showBookingModal() {
  const dtInput = document.getElementById('db-datetime');
  if (dtInput) dtInput.value = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  new bootstrap.Modal(document.getElementById('dashBookingModal')).show();
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

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
    const r = await fetch(API + endpoint, opts);
    return await r.json();
  } catch {
    return { success: false, message: 'Cannot reach server on port 3000.' };
  }
}

// ─── Date/Time ───────────────────────────────────
function updateDateTime() {
  const now  = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name  = currentUser?.fullName?.split(' ')[0] || localStorage.getItem('hc_name') || 'there';
  const greetEl = document.getElementById('greetingText');
  if (greetEl) greetEl.innerHTML = `${greet}, <span id="userName">${name}</span> 👋`;
  const dtEl = document.getElementById('currentDateTime');
  if (dtEl) dtEl.textContent =
    now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Auth guard ──────────────────────────────────
async function loadCurrentUser() {
  if (!authToken) {
    showToast('Not Signed In', 'Sign in at the home page for full access.');
    return;
  }
  const res = await apiCall('/auth/me');
  if (res.success) {
    currentUser = res.user;
    localStorage.setItem('hc_name', res.user.fullName.split(' ')[0]);
    updateDateTime();
    populateProfile(res.user);
  } else {
    authToken = null;
    localStorage.removeItem('hc_token');
    showToast('Session Expired', 'Please sign in again.');
  }
}

// ─── Page Navigation ─────────────────────────────
const PAGES = ['overview', 'vitals', 'appointments', 'reports', 'medications', 'doctors', 'chat', 'profile', 'settings'];

function loadPage(page) {
  PAGES.forEach(p => document.getElementById(`page-${p}`)?.classList.add('d-none'));
  document.getElementById(`page-${page}`)?.classList.remove('d-none');

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.sidebar-link[onclick*="${page}"]`)?.classList.add('active');

  if (page === 'vitals')        initVitalsPage();
  if (page === 'reports')       initReportsPage();
  if (page === 'medications')   renderMedications();
  if (page === 'chat')          initChat();
  if (page === 'doctors')       renderDashDoctors();
  if (page === 'appointments')  loadAppointmentsPage();
  if (page === 'overview')      loadOverviewAppointments();

  document.getElementById('sidebar').classList.remove('open');
}

// ─── Charts ──────────────────────────────────────
function randArr(base, variance, len) {
  return Array.from({ length: len }, () => Math.round(base + (Math.random() - 0.5) * variance * 2));
}

function initHRChart() {
  const ctx = document.getElementById('hrChart');
  if (!ctx || hrChart) return;
  const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  hrChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: randArr(72, 8, 24),
        borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.08)',
        fill: true, borderWidth: 2, pointRadius: 2, tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.45)', maxTicksLimit: 8, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.45)', font: { size: 10 } }, min: 50, max: 120 }
      }
    }
  });
}

function initDashScore() {
  const ctx = document.getElementById('dashScoreChart');
  if (!ctx || dashScore) return;
  dashScore = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [87, 13], backgroundColor: ['#00d4aa', 'rgba(255,255,255,0.05)'], borderWidth: 0, cutout: '78%' }] },
    options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 1200 } }
  });
}

function setChartRange(range, btn) {
  document.querySelectorAll('.btn-xs.btn-ghost').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!hrChart) return;
  const pts = range === '1d' ? 24 : range === '7d' ? 7 : 30;
  const labels = range === '1d'
    ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
    : range === '7d'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
  hrChart.data.labels = labels;
  hrChart.data.datasets[0].data = randArr(72, 10, pts);
  hrChart.update();
}

// ─── Vitals Page ─────────────────────────────────
function initVitalsPage() {
  const ctx1 = document.getElementById('liveHrChart');
  const ctx2 = document.getElementById('liveSpo2Chart');
  if (ctx1 && !liveHrC) {
    liveHrC = new Chart(ctx1, {
      type: 'line',
      data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ data: randArr(72, 8, 24), borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.06)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } }, min: 50, max: 120 } } }
    });
  }
  if (ctx2 && !liveSpo2C) {
    liveSpo2C = new Chart(ctx2, {
      type: 'line',
      data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ data: randArr(97, 2, 24), borderColor: '#1e90ff', backgroundColor: 'rgba(30,144,255,0.06)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } }, min: 88, max: 100 } } }
    });
  }
}

function startLiveMonitoring() {
  const btn = document.getElementById('liveBtn');
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
    btn.innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Live';
    btn.classList.replace('btn-danger', 'btn-accent');
    showToast('Monitoring Paused', 'Live monitoring stopped.');
    return;
  }
  btn.innerHTML = '<i class="bi bi-stop-fill me-1"></i>Stop Live';
  btn.classList.replace('btn-accent', 'btn-danger');
  showToast('Live Monitoring', 'Real-time vitals now active.');

  liveInterval = setInterval(() => {
    const v = {
      heart:   Math.round(65 + Math.random() * 20),
      spo2:    Math.round(95 + Math.random() * 5),
      temp:    (36 + Math.random() * 1.5).toFixed(1),
      glucose: Math.round(80 + Math.random() * 35),
      resp:    Math.round(13 + Math.random() * 7)
    };
    const bps = Math.round(110 + Math.random() * 25);
    const bpd = Math.round(70  + Math.random() * 20);

    // Update vitals page cards
    ['heart','spo2','temp','glucose','resp'].forEach(k => {
      const el = document.getElementById(`lv-${k}`); if (el) el.textContent = v[k];
    });
    const bpEl = document.getElementById('lv-bp'); if (bpEl) bpEl.textContent = `${bps}/${bpd}`;

    // Update overview widgets
    const swH = document.getElementById('sw-heart'); if (swH) swH.textContent = v.heart;
    const swS = document.getElementById('sw-spo2'); if (swS) swS.innerHTML = `${v.spo2}<span class="sw-unit-inline">%</span>`;
    const swT = document.getElementById('sw-temp'); if (swT) swT.innerHTML = `${v.temp}<span class="sw-unit-inline">°C</span>`;
    const swB = document.getElementById('sw-bp'); if (swB) swB.textContent = `${bps}/${bpd}`;

    // Push to live HR chart
    if (liveHrC) {
      liveHrC.data.datasets[0].data.push(v.heart);
      liveHrC.data.datasets[0].data.shift();
      liveHrC.update('none');
    }

    addVitalsLogEntry(v.heart, v.spo2);

    // Save to backend if logged in
    if (authToken) {
      apiCall('/health/vitals', 'POST', {
        vitals: {
          heartRate: v.heart, oxygenSaturation: v.spo2,
          temperature: parseFloat(v.temp), bloodGlucose: v.glucose,
          respiratoryRate: v.resp, bloodPressureSystolic: bps, bloodPressureDiastolic: bpd
        }
      });
    }

    // Show banner for elevated readings
    if (v.heart > 100 || v.spo2 < 96) {
      const banner = document.getElementById('alertBanner');
      const bannerText = document.getElementById('alertBannerText');
      if (banner && bannerText) {
        bannerText.textContent = v.heart > 100
          ? `Warning: Elevated heart rate (${v.heart} bpm). Consider resting.`
          : `Warning: Low SpO₂ (${v.spo2}%). Consider breathing exercises.`;
        banner.classList.remove('d-none');
      }
    }
  }, 2500);
}

function logVitalsManual() {
  const el = document.getElementById('manualEntry');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function submitManualVitals() {
  if (!authToken) { showToast('Sign In Required', 'Please sign in to save vitals.'); return; }
  const vitals = {
    heartRate:              +document.getElementById('m-heart').value   || undefined,
    oxygenSaturation:       +document.getElementById('m-spo2').value    || undefined,
    temperature:            +document.getElementById('m-temp').value    || undefined,
    bloodPressureSystolic:  +document.getElementById('m-bps').value     || undefined,
    bloodPressureDiastolic: +document.getElementById('m-bpd').value     || undefined,
    bloodGlucose:           +document.getElementById('m-glucose').value || undefined,
    weight:                 +document.getElementById('m-weight').value  || undefined
  };
  // Remove undefined keys
  Object.keys(vitals).forEach(k => vitals[k] === undefined && delete vitals[k]);
  if (!Object.keys(vitals).length) { showToast('No Data', 'Please enter at least one vital reading.'); return; }

  const res = await apiCall('/health/vitals', 'POST', { vitals });
  showToast(res.success ? '✅ Vitals Saved' : '❌ Error', res.success ? 'Reading logged to your health record.' : res.message);
  if (res.success) {
    // Clear the form
    ['m-heart','m-spo2','m-temp','m-bps','m-bpd','m-glucose','m-weight'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('manualEntry').style.display = 'none';
  }
}

// ─── Vitals Log ──────────────────────────────────
const logEntries = [];
function addVitalsLogEntry(hr, spo2) {
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  logEntries.unshift({ time: now, hr, spo2, status: hr > 100 ? 'warning' : 'normal' });
  if (logEntries.length > 12) logEntries.pop();
  renderVitalsLog();
}
function renderVitalsLog() {
  const el = document.getElementById('vitalsLog');
  if (!el) return;
  if (!logEntries.length) {
    el.innerHTML = '<div class="text-center text-muted small py-3">No readings yet. Start live monitoring to see entries here.</div>';
    return;
  }
  el.innerHTML = logEntries.map(e => `
    <div class="vl-item">
      <span class="vl-time">${e.time}</span>
      <span class="vl-icon"><i class="bi bi-heart-pulse text-danger"></i></span>
      <span class="vl-value">${e.hr} bpm · SpO₂ ${e.spo2}%</span>
      <span class="vl-status ${e.status}">${e.status === 'warning' ? 'Warning' : 'Normal'}</span>
    </div>`).join('');
}

// ─── Appointments ────────────────────────────────
async function loadOverviewAppointments() {
  const el = document.getElementById('apptList');
  if (!el) return;
  if (!authToken) {
    el.innerHTML = '<div class="text-center text-muted small py-3">Sign in to view appointments.</div>';
    return;
  }
  el.innerHTML = '<div class="text-center text-muted small py-3">Loading...</div>';
  const res = await apiCall('/appointments');
  if (!res.success) {
    el.innerHTML = '<div class="text-center text-muted small py-3">Could not load appointments.</div>';
    return;
  }
  const upcoming = res.appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed').slice(0, 4);
  if (!upcoming.length) {
    el.innerHTML = '<div class="text-center text-muted small py-3">No upcoming appointments. <button class="btn btn-xs btn-accent ms-2" onclick="showBookingModal()">Book one</button></div>';
    return;
  }
  const colorMap = { pending: 'warning', confirmed: 'success', ongoing: 'info' };
  el.innerHTML = upcoming.map(a => {
    const color = colorMap[a.status] || 'secondary';
    const date  = new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return `
    <div class="appt-item">
      <div class="appt-dot bg-${color}"></div>
      <div class="appt-info">
        <div class="appt-doc">${a.doctorName || 'Doctor TBD'}</div>
        <div class="appt-detail">${a.specialty} · ${a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
        <div class="appt-time"><i class="bi bi-clock me-1"></i>${date}</div>
      </div>
      <div class="appt-actions d-flex gap-2">
        ${a.type === 'video' ? '<button class="btn btn-xs btn-accent"><i class="bi bi-camera-video"></i></button>' : ''}
        <button class="btn btn-xs btn-ghost text-danger" onclick="cancelAppointment('${a._id}', this)" title="Cancel"><i class="bi bi-x"></i></button>
      </div>
    </div>`;
  }).join('');

  // Update badge
  const badge = document.getElementById('apptBadge');
  if (badge) badge.textContent = upcoming.length;
}

async function loadAppointmentsPage() {
  const el = document.getElementById('fullApptList');
  if (!el) return;
  if (!authToken) {
    el.innerHTML = '<div class="text-center text-muted py-4">Please sign in to view appointments.</div>';
    return;
  }
  el.innerHTML = '<div class="text-center text-muted py-4">Loading...</div>';
  const res = await apiCall('/appointments');
  if (!res.success) {
    el.innerHTML = `<div class="text-center text-danger py-4">${res.message}</div>`;
    return;
  }
  if (!res.appointments.length) {
    el.innerHTML = '<div class="text-center text-muted py-4">No appointments yet. <button class="btn btn-sm btn-accent ms-2" onclick="showBookingModal()">Book your first</button></div>';
    return;
  }
  const colorMap = { pending: 'warning', confirmed: 'success', ongoing: 'info', completed: 'secondary', cancelled: 'danger' };
  el.innerHTML = res.appointments.map(a => {
    const color = colorMap[a.status] || 'secondary';
    const date  = new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return `
    <div class="appt-item" id="appt-${a._id}">
      <div class="appt-dot bg-${color}"></div>
      <div class="appt-info">
        <div class="appt-doc">${a.doctorName || 'Doctor TBD'}</div>
        <div class="appt-detail">${a.specialty} · ${a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
        <div class="appt-time"><i class="bi bi-clock me-1"></i>${date}</div>
      </div>
      <div class="appt-actions d-flex gap-2 align-items-center flex-wrap">
        ${a.type === 'video' && a.status !== 'cancelled' ? '<button class="btn btn-xs btn-accent"><i class="bi bi-camera-video"></i></button>' : ''}
        <span class="badge" style="background:rgba(255,255,255,0.08);color:var(--text-muted);font-size:0.72rem;padding:5px 10px">${a.status}</span>
        ${a.status !== 'cancelled' && a.status !== 'completed'
          ? `<button class="btn btn-xs btn-ghost text-danger" onclick="cancelAppointment('${a._id}', this)"><i class="bi bi-x-circle me-1"></i>Cancel</button>`
          : ''}
      </div>
    </div>`;
  }).join('');
}

async function cancelAppointment(id, btn) {
  if (!confirm('Cancel this appointment?')) return;
  btn.disabled = true;
  const res = await apiCall(`/appointments/${id}/cancel`, 'PUT');
  if (res.success) {
    showToast('Appointment Cancelled', 'The appointment has been cancelled.');
    // Reload whichever list is visible
    if (!document.getElementById('page-appointments').classList.contains('d-none')) loadAppointmentsPage();
    else loadOverviewAppointments();
  } else {
    showToast('Error', res.message || 'Could not cancel appointment.');
    btn.disabled = false;
  }
}

async function submitDashBooking() {
  if (!authToken) {
    bootstrap.Modal.getInstance(document.getElementById('dashBookingModal')).hide();
    showToast('Sign In Required', 'Please sign in to book an appointment.');
    return;
  }
  const data = {
    specialty:   document.getElementById('db-specialty').value,
    type:        document.getElementById('db-type').value,
    scheduledAt: document.getElementById('db-datetime').value,
    symptoms:    document.getElementById('db-symptoms').value
  };
  if (!data.scheduledAt) { showToast('Missing Date', 'Please select a date and time.'); return; }

  const res = await apiCall('/appointments', 'POST', data);
  if (res.success) {
    const el = document.getElementById('dashBookingSuccess');
    el.textContent = '✅ Appointment booked! You will receive a confirmation shortly.';
    el.classList.remove('d-none');
    showToast('Booked!', `Your ${data.specialty} appointment is confirmed.`);
    setTimeout(() => {
      bootstrap.Modal.getInstance(document.getElementById('dashBookingModal')).hide();
      el.classList.add('d-none');
      // Reload whichever list is visible
      if (!document.getElementById('page-appointments').classList.contains('d-none')) loadAppointmentsPage();
      else loadOverviewAppointments();
    }, 2000);
  } else {
    showToast('Booking Failed', res.message || 'Please try again.');
  }
}

// ─── Medications (user-editable, stored in localStorage) ─────
function getMeds() {
  try { return JSON.parse(localStorage.getItem('hc_meds') || '[]'); } catch { return []; }
}
function saveMeds(meds) { localStorage.setItem('hc_meds', JSON.stringify(meds)); }

function renderMedications() {
  const meds = getMeds();
  const list = document.getElementById('medsList');
  if (list) {
    if (!meds.length) {
      list.innerHTML = '<div class="text-center text-muted py-4">No medications added yet. Click <strong>+ Add Med</strong> to begin.</div>';
    } else {
      list.innerHTML = meds.map((m, i) => `
        <div class="med-item">
          <span class="med-icon">💊</span>
          <div class="flex-1">
            <div class="med-name">${m.name}</div>
            <div class="med-details">${m.purpose || ''} · ${m.schedule || ''}</div>
          </div>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn-xs ${m.taken ? 'btn-success' : 'btn-outline-secondary'}" onclick="toggleMed(${i}, this)">
              ${m.taken ? '✓ Taken' : 'Mark Taken'}
            </button>
            <button class="btn btn-xs btn-ghost text-danger" onclick="deleteMed(${i})"><i class="bi bi-trash"></i></button>
          </div>
        </div>`).join('');
    }
  }

  const sched = document.getElementById('medSchedule');
  if (sched) {
    if (!meds.length) {
      sched.innerHTML = '<div class="text-center text-muted small py-3">No medications to schedule.</div>';
    } else {
      sched.innerHTML = meds.map(m => `
        <div class="med-schedule-item ${m.taken ? 'taken' : 'pending'}">
          <span class="flex-1 small fw-600">${m.name}</span>
          <span class="small text-muted me-2">${m.schedule || ''}</span>
          ${m.taken ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-clock text-warning"></i>'}
        </div>`).join('');
    }
  }
}

function toggleMed(index, btn) {
  const meds = getMeds();
  meds[index].taken = !meds[index].taken;
  saveMeds(meds);
  renderMedications();
}
function deleteMed(index) {
  const meds = getMeds();
  meds.splice(index, 1);
  saveMeds(meds);
  renderMedications();
  showToast('Removed', 'Medication removed from your list.');
}

function addMedication() {
  const name     = prompt('Medication name (e.g. Metformin 500mg):');
  if (!name?.trim()) return;
  const purpose  = prompt('Purpose (e.g. Blood Sugar Control):') || '';
  const schedule = prompt('Schedule (e.g. Twice daily - morning, night):') || '';
  const meds = getMeds();
  meds.push({ name: name.trim(), purpose, schedule, taken: false });
  saveMeds(meds);
  renderMedications();
  showToast('Medication Added', `${name} has been added to your list.`);
}

// ─── Doctors ─────────────────────────────────────
async function renderDashDoctors(filterSpec) {
  const grid = document.getElementById('dashDoctorsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-12 text-center text-muted py-4">Loading doctors...</div>';

  const res = await apiCall('/appointments/doctors');
  if (!res.success) {
    grid.innerHTML = '<div class="col-12 text-center text-danger py-4">Could not load doctors. Is the server running?</div>';
    return;
  }

  const list = filterSpec ? res.doctors.filter(d => d.specialty === filterSpec) : res.doctors;
  if (!list.length) {
    grid.innerHTML = '<div class="col-12 text-center text-muted py-4">No doctors found for this specialty.</div>';
    return;
  }

  grid.innerHTML = list.map(d => `
    <div class="col-md-6 col-lg-4">
      <div class="doctor-card h-100">
        <div class="doc-avatar">${d.emoji || '👨‍⚕️'}</div>
        <div class="doc-name">${d.name}</div>
        <div class="doc-spec">${d.specialty}</div>
        <div class="doc-rating mb-2">${'★'.repeat(Math.floor(d.rating))}${'☆'.repeat(5 - Math.floor(d.rating))} ${d.rating}</div>
        <div class="text-muted small mb-3"><i class="bi bi-briefcase me-1"></i>${d.exp} experience</div>
        <div class="${d.available ? 'doc-status-available' : 'doc-status-busy'} mb-3">
          <i class="bi bi-circle-fill me-1" style="font-size:0.5rem"></i>${d.available ? 'Available Now' : 'Currently Busy'}
        </div>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-accent btn-sm" onclick="${d.available ? 'showBookingModal()' : "showToast('Busy','This doctor is currently unavailable.')"}">
            <i class="bi bi-${d.available ? 'camera-video' : 'clock'} me-1"></i>${d.available ? 'Consult' : 'Schedule Later'}
          </button>
          <button class="btn btn-glass btn-sm" onclick="loadPage('chat')"><i class="bi bi-chat-dots me-1"></i>Chat</button>
        </div>
      </div>
    </div>`).join('');
}

function filterDoctors(spec) { renderDashDoctors(spec || undefined); }

// ─── Chat ────────────────────────────────────────
const DOCTOR_CONTACTS = [
  { name: 'Dr. Priya Sharma',  emoji: '👩‍⚕️', last: 'How are you feeling?',    online: true  },
  { name: 'Dr. Arjun Mehta',   emoji: '👨‍⚕️', last: 'Your ECG looks fine.',     online: true  },
  { name: 'Dr. Meera Nair',    emoji: '👩‍⚕️', last: 'Appointment confirmed.',    online: false },
];

let activeChatDoctor = DOCTOR_CONTACTS[0];
const chatHistories = {};

function initChat() {
  const contacts = document.getElementById('chatContacts');
  if (contacts) {
    contacts.innerHTML = DOCTOR_CONTACTS.map((c, i) => `
      <div class="chat-contact ${i === 0 ? 'active' : ''}" onclick="selectContact(this, ${i})">
        <div class="cc-avatar">${c.emoji}</div>
        <div class="flex-1 min-w-0">
          <div class="cc-name">${c.name}</div>
          <div class="cc-last text-truncate">${c.last}</div>
        </div>
        <div class="cc-meta">
          <span class="cc-time">${c.online ? 'Online' : 'Offline'}</span>
        </div>
      </div>`).join('');
  }
  activeChatDoctor = DOCTOR_CONTACTS[0];
  renderChatMessages(0);
}

function selectContact(el, index) {
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeChatDoctor = DOCTOR_CONTACTS[index];
  const hdr = document.getElementById('chatHeader');
  if (hdr) {
    hdr.querySelector('.fw-600').textContent  = activeChatDoctor.name;
    hdr.querySelector('.small').textContent   = activeChatDoctor.online ? '● Online' : '○ Offline';
    hdr.querySelector('.small').className     = `small ${activeChatDoctor.online ? 'text-success' : 'text-muted'}`;
  }
  renderChatMessages(index);
}

function renderChatMessages(index) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const hist = chatHistories[index] || [];
  if (!hist.length) {
    el.innerHTML = `
      <div class="text-center text-muted py-5 small">
        <i class="bi bi-chat-dots fs-3 mb-2 d-block"></i>
        Start a conversation with ${DOCTOR_CONTACTS[index].name}
      </div>`;
    return;
  }
  el.innerHTML = hist.map(m => `
    <div class="msg ${m.from === 'user' ? 'sent' : 'received'}">
      ${m.from === 'doctor' ? `<div class="msg-avatar" style="font-size:1.8rem">${DOCTOR_CONTACTS[index]?.emoji || '👩‍⚕️'}</div>` : ''}
      <div>
        <div class="msg-bubble">${m.text}</div>
        <div class="msg-time">${m.time}</div>
      </div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const text  = input?.value.trim();
  if (!text) return;

  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const idx = DOCTOR_CONTACTS.indexOf(activeChatDoctor);
  if (!chatHistories[idx]) chatHistories[idx] = [];
  chatHistories[idx].push({ from: 'user', text, time: now });
  renderChatMessages(idx);
  input.value = '';

  // Auto-reply after 1.5s
  setTimeout(() => {
    const replies = [
      'Thank you for reaching out. I\'ll review your message shortly.',
      'I can see your recent vitals look good. Keep it up!',
      'Please book an appointment if you need a detailed consultation.',
      'Remember to stay hydrated and get enough rest.',
      'I\'ll get back to you with more information soon.'
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const replyTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    chatHistories[idx].push({ from: 'doctor', text: reply, time: replyTime });
    renderChatMessages(idx);
  }, 1500);
}

// ─── Reports ─────────────────────────────────────
async function initReportsPage() {
  const ctx = document.getElementById('reportChart');
  if (!ctx) return;
  if (reportChartInst) { reportChartInst.destroy(); reportChartInst = null; }

  // Try to load real data from API
  let heartData  = randArr(72, 12, 30);
  let spo2Data   = randArr(97, 2, 30);
  let glucoseData = randArr(95, 20, 30);

  if (authToken) {
    const res = await apiCall('/health/summary');
    if (res.success && res.data.length) {
      heartData   = res.data.map(d => d.vitals?.heartRate   || null).filter(Boolean);
      spo2Data    = res.data.map(d => d.vitals?.oxygenSaturation || null).filter(Boolean);
      glucoseData = res.data.map(d => d.vitals?.bloodGlucose     || null).filter(Boolean);
    }
  }

  const labels = Array.from({ length: Math.max(heartData.length, 7) }, (_, i) => `Day ${i + 1}`);
  reportChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Heart Rate (bpm)',  data: heartData,   borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.05)',  fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 },
        { label: 'SpO₂ (%)',          data: spo2Data,    borderColor: '#1e90ff', backgroundColor: 'rgba(30,144,255,0.05)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 },
        { label: 'Glucose (mg/dL)',   data: glucoseData, borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.05)',fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: 'rgba(240,244,255,0.6)', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', maxTicksLimit: 10, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } } }
      }
    }
  });
}

function openReport(type) {
  showToast('Report', `Opening ${type} report — PDF export coming soon.`);
}

// ─── Profile ─────────────────────────────────────
function populateProfile(user) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

  set('pf-name',    user.fullName);
  set('pf-email',   user.email);
  set('pf-phone',   user.phone);
  set('pf-weight',  user.weight);
  if (user.dateOfBirth) set('pf-dob', new Date(user.dateOfBirth).toISOString().split('T')[0]);
  if (user.bloodGroup) {
    const sel = document.getElementById('pf-blood');
    if (sel) sel.value = user.bloodGroup;
  }
  if (user.emergencyContact) {
    set('pf-ename',  user.emergencyContact.name);
    set('pf-ephone', user.emergencyContact.phone);
    const erel = document.getElementById('pf-erel');
    if (erel && user.emergencyContact.relation) erel.value = user.emergencyContact.relation;
  }

  setTxt('profileName',  user.fullName);
  setTxt('profileEmail', user.email);
  setTxt('profileBlood', user.bloodGroup !== 'Unknown' ? user.bloodGroup : '—');
  if (user.dateOfBirth) {
    const age = Math.floor((Date.now() - new Date(user.dateOfBirth)) / (365.25 * 86400000));
    setTxt('profileAge', isNaN(age) ? '—' : String(age));
  }
  const sinceEl = document.querySelector('#page-profile .fw-700:last-of-type');
  if (sinceEl && user.createdAt) sinceEl.textContent = new Date(user.createdAt).getFullYear();
}

async function saveProfile() {
  if (!authToken) { showToast('Sign In Required', 'Please sign in to update your profile.'); return; }
  const data = {
    fullName:   document.getElementById('pf-name')?.value.trim(),
    phone:      document.getElementById('pf-phone')?.value.trim(),
    dateOfBirth: document.getElementById('pf-dob')?.value || undefined,
    bloodGroup: document.getElementById('pf-blood')?.value,
    weight:     +document.getElementById('pf-weight')?.value || undefined,
    emergencyContact: {
      name:     document.getElementById('pf-ename')?.value.trim(),
      phone:    document.getElementById('pf-ephone')?.value.trim(),
      relation: document.getElementById('pf-erel')?.value
    }
  };
  if (!data.fullName) { showToast('Error', 'Full name is required.'); return; }
  const res = await apiCall('/auth/profile', 'PUT', data);
  if (res.success) {
    currentUser = res.user;
    populateProfile(res.user);
    localStorage.setItem('hc_name', res.user.fullName.split(' ')[0]);
    updateDateTime();
    showToast('Profile Saved ✅', 'Your health profile has been updated.');
  } else {
    showToast('Save Failed', res.message || 'Could not update profile.');
  }
}

// ─── Emergency ───────────────────────────────────
function triggerSOS() {
  const modal = new bootstrap.Modal(document.getElementById('dashEmergencyModal'));
  modal.show();

  const steps = [
    { id: 'des-1', html: '<i class="bi bi-check-circle text-success me-1"></i>Ambulance (108): <strong class="text-success">Notified ✓</strong>' },
    { id: 'des-2', html: '<i class="bi bi-check-circle text-success me-1"></i>Emergency Contact: <strong class="text-success">SMS Sent ✓</strong>' },
    { id: 'des-3', html: '<i class="bi bi-check-circle text-success me-1"></i>On-Call Doctor: <strong class="text-success">Connected ✓</strong>' }
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

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateDateTime();
  setInterval(updateDateTime, 60000);

  initHRChart();
  initDashScore();
  renderVitalsLog();

  await loadCurrentUser();
  await loadOverviewAppointments();

  // Socket.IO — connect to backend
  try {
    const socket = io('http://localhost:3000', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      console.log('🔌 Socket connected to backend');
      if (authToken && currentUser) socket.emit('user:join', currentUser._id);
    });
    socket.on('alert:critical', () => showToast('🚨 Critical Alert', 'A critical vital reading was detected.'));
    socket.on('connect_error', (e) => console.warn('Socket error:', e.message));
  } catch (e) {
    console.warn('Socket.IO error:', e.message);
  }
});
