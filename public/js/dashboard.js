/* ═══════════════════════════════════════════════
   HEALTH CONNECT — DASHBOARD.JS
═══════════════════════════════════════════════ */

const API = window.location.origin + '/api';
let authToken = localStorage.getItem('hc_token');
let liveInterval = null;
let hrChart, spo2Chart, dashScore, reportChartInst, liveHrC, liveSpo2C;

// ─── Utilities ────────────────────────────────
function showToast(title, body) {
  document.getElementById('dashToastTitle').textContent = title;
  document.getElementById('dashToastBody').textContent = body;
  new bootstrap.Toast(document.getElementById('dashToast')).show();
}
function showBookingModal() {
  const dtInput = document.getElementById('db-datetime');
  if (dtInput) dtInput.value = new Date(Date.now() + 3600000).toISOString().slice(0,16);
  new bootstrap.Modal(document.getElementById('dashBookingModal')).show();
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
  };
  if (body) opts.body = JSON.stringify(body);
  try { const r = await fetch(API + endpoint, opts); return await r.json(); }
  catch { return { success: false, message: 'Network error' }; }
}

// ─── Date/Time ────────────────────────────────
function updateDateTime() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = localStorage.getItem('hc_name') || 'User';
  document.getElementById('greetingText').innerHTML = `${greet}, <span id="userName">${name}</span> 👋`;
  document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) + ' · ' + now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

// ─── Page Navigation ──────────────────────────
const pages = ['overview', 'vitals', 'appointments', 'reports', 'medications', 'doctors', 'chat', 'profile', 'settings'];

function loadPage(page) {
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.add('d-none');
  });
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('d-none');

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.sidebar-link[onclick*="${page}"]`);
  if (active) active.classList.add('active');

  // Lazy init per page
  if (page === 'vitals') initVitalsPage();
  if (page === 'reports') initReportsPage();
  if (page === 'medications') renderMedications();
  if (page === 'chat') initChat();
  if (page === 'doctors') renderDashDoctors();

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}

// ─── Charts ───────────────────────────────────
function genHourlyData(base, variance, points = 24) {
  const now = new Date();
  return Array.from({length: points}, (_, i) => ({
    t: new Date(now - (points - i) * 3600000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    v: Math.round(base + (Math.random() - 0.5) * variance * 2)
  }));
}

function initHRChart() {
  const ctx = document.getElementById('hrChart');
  if (!ctx || hrChart) return;
  const data = genHourlyData(72, 8);
  hrChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.t),
      datasets: [{
        data: data.map(d => d.v),
        borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.08)',
        fill: true, borderWidth: 2, pointRadius: 2, tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
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
  const label = range === '1d' ? (_, i) => `${i}:00` : range === '7d' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][0] : (_, i) => `Day ${i+1}`;
  const data = genHourlyData(72, 10, pts);
  hrChart.data.labels = data.map((_, i) => range === '1d' ? `${i}:00` : range === '7d' ? ['M','T','W','T','F','S','S'][i] : `D${i+1}`);
  hrChart.data.datasets[0].data = data.map(d => d.v);
  hrChart.update();
}

// ─── Vitals Page ──────────────────────────────
function initVitalsPage() {
  const ctx1 = document.getElementById('liveHrChart');
  const ctx2 = document.getElementById('liveSpo2Chart');
  if (ctx1 && !liveHrC) {
    const d = genHourlyData(72, 8);
    liveHrC = new Chart(ctx1, {
      type: 'line',
      data: { labels: d.map((_,i)=>`${i}:00`), datasets: [{ data: d.map(d=>d.v), borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.06)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font:{size:10} } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font:{size:10} }, min:50, max:120 } } }
    });
  }
  if (ctx2 && !liveSpo2C) {
    const d = genHourlyData(98, 2);
    liveSpo2C = new Chart(ctx2, {
      type: 'line',
      data: { labels: d.map((_,i)=>`${i}:00`), datasets: [{ data: d.map(d=>d.v), borderColor: '#1e90ff', backgroundColor: 'rgba(30,144,255,0.06)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font:{size:10} } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font:{size:10} }, min:88, max:100 } } }
    });
  }
}

function startLiveMonitoring() {
  const btn = document.getElementById('liveBtn');
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
    btn.innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Live';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-accent');
    showToast('Monitoring Paused', 'Live monitoring stopped.');
    return;
  }
  btn.innerHTML = '<i class="bi bi-stop-fill me-1"></i>Stop Live';
  btn.classList.remove('btn-accent');
  btn.classList.add('btn-danger');
  showToast('Live Monitoring', 'Real-time vitals now active.');
  liveInterval = setInterval(() => {
    const vitals = {
      heart: Math.round(68 + Math.random()*20),
      spo2: Math.round(95 + Math.random()*5),
      temp: (36 + Math.random()*1.5).toFixed(1),
      glucose: Math.round(85 + Math.random()*30),
      resp: Math.round(13 + Math.random()*7)
    };
    Object.entries(vitals).forEach(([k,v]) => {
      const el = document.getElementById(`lv-${k}`);
      if (el) el.textContent = v;
    });
    const bps = Math.round(115 + Math.random()*20), bpd = Math.round(75 + Math.random()*15);
    const bpEl = document.getElementById('lv-bp');
    if (bpEl) bpEl.textContent = `${bps}/${bpd}`;

    // Update main stats too
    document.getElementById('sw-heart').textContent = vitals.heart;
    document.getElementById('sw-spo2').innerHTML = `${vitals.spo2}<span class="sw-unit-inline">%</span>`;
    document.getElementById('sw-temp').innerHTML = `${vitals.temp}<span class="sw-unit-inline">°C</span>`;
    document.getElementById('sw-bp').textContent = `${bps}/${bpd}`;

    // Push to live chart
    if (liveHrC) {
      liveHrC.data.datasets[0].data.push(vitals.heart);
      liveHrC.data.datasets[0].data.shift();
      liveHrC.update('none');
    }

    addVitalsLogEntry(vitals.heart, vitals.spo2);

    if (vitals.heart > 100 || vitals.spo2 < 96) {
      document.getElementById('alertBanner').classList.remove('d-none');
      document.getElementById('alertBannerText').textContent = vitals.heart > 100
        ? `Warning: Elevated heart rate (${vitals.heart} bpm). Consider resting.`
        : `Warning: Low SpO₂ (${vitals.spo2}%). Consider breathing exercises.`;
    }
  }, 2500);
}

function logVitalsManual() {
  const el = document.getElementById('manualEntry');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function submitManualVitals() {
  const data = {
    vitals: {
      heartRate: +document.getElementById('m-heart').value || null,
      oxygenSaturation: +document.getElementById('m-spo2').value || null,
      temperature: +document.getElementById('m-temp').value || null,
      bloodPressureSystolic: +document.getElementById('m-bps').value || null,
      bloodPressureDiastolic: +document.getElementById('m-bpd').value || null,
      bloodGlucose: +document.getElementById('m-glucose').value || null,
      weight: +document.getElementById('m-weight').value || null,
    }
  };
  const res = await apiCall('/health/vitals', 'POST', data);
  showToast(res.success ? '✅ Vitals Saved' : '❌ Error', res.success ? 'Reading logged successfully.' : res.message);
}

// ─── Vitals Log ───────────────────────────────
const logEntries = [];
function addVitalsLogEntry(hr, spo2) {
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  logEntries.unshift({ time: now, hr, spo2, status: hr > 100 ? 'warning' : 'normal' });
  if (logEntries.length > 10) logEntries.pop();
  renderVitalsLog();
}
function renderVitalsLog() {
  const el = document.getElementById('vitalsLog');
  if (!el) return;
  el.innerHTML = logEntries.map(e => `
    <div class="vl-item">
      <span class="vl-time">${e.time}</span>
      <span class="vl-icon"><i class="bi bi-heart-pulse text-danger"></i></span>
      <span class="vl-value">${e.hr} bpm · SpO₂ ${e.spo2}%</span>
      <span class="vl-status ${e.status}">${e.status.charAt(0).toUpperCase()+e.status.slice(1)}</span>
    </div>`).join('');
}

// Seed initial log entries
for (let i = 5; i >= 0; i--) {
  const ago = new Date(Date.now() - i * 1800000);
  logEntries.push({ time: ago.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }), hr: Math.round(68+Math.random()*12), spo2: Math.round(96+Math.random()*3), status: 'normal' });
}

// ─── Appointments ─────────────────────────────
const SAMPLE_APPTS = [
  { doc: 'Dr. Priya Sharma', spec: 'General Medicine', type: 'video', time: 'Today, 3:00 PM', status: 'confirmed', color: 'success' },
  { doc: 'Dr. Arjun Mehta', spec: 'Cardiology', type: 'video', time: 'Tomorrow, 10:30 AM', status: 'pending', color: 'warning' },
  { doc: 'Dr. Meera Nair', spec: 'Pediatrics', type: 'chat', time: 'Mar 18, 2:00 PM', status: 'confirmed', color: 'info' },
  { doc: 'Dr. Sunita Rao', spec: 'Neurology', type: 'in-person', time: 'Mar 22, 11:00 AM', status: 'pending', color: 'purple' },
];

function renderAppointmentsFull() {
  const el = document.getElementById('fullApptList');
  if (!el) return;
  el.innerHTML = SAMPLE_APPTS.map(a => `
    <div class="appt-item">
      <div class="appt-dot bg-${a.color}"></div>
      <div class="appt-info">
        <div class="appt-doc">${a.doc}</div>
        <div class="appt-detail">${a.spec} · ${a.type.charAt(0).toUpperCase()+a.type.slice(1)}</div>
        <div class="appt-time"><i class="bi bi-clock me-1"></i>${a.time}</div>
      </div>
      <div class="appt-actions d-flex gap-2">
        ${a.type === 'video' ? `<button class="btn btn-xs btn-accent"><i class="bi bi-camera-video"></i></button>` : ''}
        <span class="badge bg-${a.color === 'success' ? 'success' : a.color === 'warning' ? 'warning text-dark' : 'secondary'}-soft text-${a.color}" style="padding:5px 10px;font-size:0.72rem">${a.status}</span>
        <button class="btn btn-xs btn-ghost text-danger" title="Cancel"><i class="bi bi-x"></i></button>
      </div>
    </div>`).join('');
}

async function submitDashBooking() {
  const data = {
    specialty: document.getElementById('db-specialty').value,
    type: document.getElementById('db-type').value,
    scheduledAt: document.getElementById('db-datetime').value,
    symptoms: document.getElementById('db-symptoms').value,
  };
  const res = authToken ? await apiCall('/appointments', 'POST', data) : { success: true };
  if (res.success) {
    document.getElementById('dashBookingSuccess').textContent = '✅ Appointment booked! Confirmation sent.';
    document.getElementById('dashBookingSuccess').classList.remove('d-none');
    showToast('Appointment Booked!', `Your ${data.specialty} consultation is confirmed.`);
    setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('dashBookingModal')).hide(), 2000);
  }
}

// ─── Medications ──────────────────────────────
const MEDS = [
  { name: 'Metformin 500mg', purpose: 'Blood Sugar Control', schedule: 'Twice daily (morning, night)', icon: '💊', taken: true },
  { name: 'Amlodipine 5mg', purpose: 'Blood Pressure', schedule: 'Once daily (morning)', icon: '💊', taken: true },
  { name: 'Vitamin D3 1000IU', purpose: 'Supplement', schedule: 'Once daily (morning)', icon: '🟡', taken: false },
  { name: 'Omega-3 Fish Oil', purpose: 'Heart Health', schedule: 'Once daily (with food)', icon: '🔵', taken: false },
];
function renderMedications() {
  const list = document.getElementById('medsList');
  if (list) list.innerHTML = MEDS.map(m => `
    <div class="med-item">
      <span class="med-icon">${m.icon}</span>
      <div class="flex-1">
        <div class="med-name">${m.name}</div>
        <div class="med-details">${m.purpose} · ${m.schedule}</div>
      </div>
      <div class="ms-auto d-flex gap-2">
        <button class="btn btn-xs ${m.taken ? 'btn-success' : 'btn-outline-secondary'}" onclick="toggleMed(this)">
          ${m.taken ? '✓ Taken' : 'Mark Taken'}
        </button>
        <button class="btn btn-xs btn-ghost text-danger"><i class="bi bi-trash"></i></button>
      </div>
    </div>`).join('');

  const sched = document.getElementById('medSchedule');
  if (sched) sched.innerHTML = [
    { time: '8:00 AM', name: 'Metformin 500mg', taken: true },
    { time: '9:00 AM', name: 'Amlodipine 5mg', taken: true },
    { time: '9:00 AM', name: 'Vitamin D3', taken: false },
    { time: '1:00 PM', name: 'Omega-3', taken: false },
    { time: '9:00 PM', name: 'Metformin 500mg', taken: false },
  ].map(s => `
    <div class="med-schedule-item ${s.taken ? 'taken' : 'pending'}">
      <span class="small fw-600" style="min-width:60px">${s.time}</span>
      <span class="flex-1 small">${s.name}</span>
      ${s.taken ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-clock text-warning"></i>'}
    </div>`).join('');
}
function toggleMed(btn) {
  btn.classList.toggle('btn-success');
  btn.classList.toggle('btn-outline-secondary');
  btn.textContent = btn.classList.contains('btn-success') ? '✓ Taken' : 'Mark Taken';
}
function addMedication() { showToast('Coming Soon', 'Add medication feature coming soon!'); }

// ─── Doctors Page ─────────────────────────────
const DOCTORS = [
  { name: 'Dr. Priya Sharma', spec: 'General Medicine', rating: 4.9, available: true, emoji: '👩‍⚕️', exp: '12 yrs' },
  { name: 'Dr. Arjun Mehta', spec: 'Cardiology', rating: 4.8, available: true, emoji: '👨‍⚕️', exp: '15 yrs' },
  { name: 'Dr. Sunita Rao', spec: 'Neurology', rating: 4.7, available: true, emoji: '👩‍⚕️', exp: '10 yrs' },
  { name: 'Dr. Vikram Patel', spec: 'Orthopedics', rating: 4.9, available: false, emoji: '👨‍⚕️', exp: '18 yrs' },
  { name: 'Dr. Meera Nair', spec: 'Pediatrics', rating: 4.8, available: true, emoji: '👩‍⚕️', exp: '8 yrs' },
  { name: 'Dr. Rajesh Kumar', spec: 'Dermatology', rating: 4.6, available: true, emoji: '👨‍⚕️', exp: '11 yrs' },
];
let filteredDocs = [...DOCTORS];
function renderDashDoctors(list = DOCTORS) {
  const grid = document.getElementById('dashDoctorsGrid');
  if (!grid) return;
  grid.innerHTML = list.map(d => `
    <div class="col-md-6 col-lg-4">
      <div class="doctor-card h-100">
        <div class="doc-avatar">${d.emoji}</div>
        <div class="doc-name">${d.name}</div>
        <div class="doc-spec">${d.spec}</div>
        <div class="doc-rating mb-2">${'★'.repeat(Math.floor(d.rating))}${'☆'.repeat(5-Math.floor(d.rating))} ${d.rating}</div>
        <div class="text-muted small mb-3"><i class="bi bi-briefcase me-1"></i>${d.exp} experience</div>
        <div class="${d.available ? 'doc-status-available' : 'doc-status-busy'} mb-3">
          <i class="bi bi-circle-fill me-1" style="font-size:0.5rem"></i>${d.available ? 'Available Now' : 'Busy'}
        </div>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-accent btn-sm" onclick="showBookingModal()"><i class="bi bi-camera-video me-1"></i>Consult</button>
          <button class="btn btn-glass btn-sm" onclick="loadPage('chat')"><i class="bi bi-chat-dots me-1"></i>Chat</button>
        </div>
      </div>
    </div>`).join('');
}
function filterDoctors(spec) {
  renderDashDoctors(spec ? DOCTORS.filter(d => d.spec === spec) : DOCTORS);
}

// ─── Chat ─────────────────────────────────────
const CONTACTS = [
  { name: 'Dr. Priya Sharma', emoji: '👩‍⚕️', last: 'See you tomorrow!', time: '2m ago', unread: 2 },
  { name: 'Dr. Arjun Mehta', emoji: '👨‍⚕️', last: 'Your ECG looks fine.', time: '1h ago', unread: 1 },
  { name: 'Dr. Meera Nair', emoji: '👩‍⚕️', last: 'Appointment confirmed.', time: 'Yesterday', unread: 0 },
];
const CHAT_HISTORY = [
  { from: 'doctor', text: 'Good morning! How are you feeling today?', time: '9:00 AM' },
  { from: 'user', text: 'Hi Doctor, I have been having mild headaches since yesterday.', time: '9:02 AM' },
  { from: 'doctor', text: 'I see. Are you staying hydrated? Sometimes dehydration can cause that.', time: '9:03 AM' },
  { from: 'user', text: 'I\'ll drink more water. Should I be worried?', time: '9:05 AM' },
  { from: 'doctor', text: 'Based on your vitals which look normal, it should be fine. Rest well today. If the headache persists after 2 days, let me know.', time: '9:06 AM' },
];

function initChat() {
  const contacts = document.getElementById('chatContacts');
  if (contacts) contacts.innerHTML = CONTACTS.map((c, i) => `
    <div class="chat-contact ${i === 0 ? 'active' : ''}" onclick="selectContact(this, '${c.name}')">
      <div class="cc-avatar">${c.emoji}</div>
      <div class="flex-1 min-w-0">
        <div class="cc-name">${c.name}</div>
        <div class="cc-last text-truncate">${c.last}</div>
      </div>
      <div class="cc-meta">
        <span class="cc-time">${c.time}</span>
        ${c.unread ? `<span class="cc-badge">${c.unread}</span>` : ''}
      </div>
    </div>`).join('');
  renderChatMessages();
}

function selectContact(el, name) {
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const hdr = document.getElementById('chatHeader');
  if (hdr) hdr.querySelector('.fw-600').textContent = name;
}

function renderChatMessages() {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  el.innerHTML = CHAT_HISTORY.map(m => `
    <div class="msg ${m.from === 'user' ? 'sent' : 'received'}">
      ${m.from === 'doctor' ? '<div class="msg-avatar" style="font-size:1.8rem">👩‍⚕️</div>' : ''}
      <div>
        <div class="msg-bubble">${m.text}</div>
        <div class="msg-time">${m.time}</div>
      </div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  const msgs = document.getElementById('chatMessages');
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  msgs.innerHTML += `<div class="msg sent"><div><div class="msg-bubble">${text}</div><div class="msg-time">${now}</div></div></div>`;
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;
  // Auto-reply simulation
  setTimeout(() => {
    msgs.innerHTML += `<div class="msg received"><div class="msg-avatar" style="font-size:1.8rem">👩‍⚕️</div><div><div class="msg-bubble">Thank you for reaching out. I'll review your message and get back to you shortly.</div><div class="msg-time">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div></div></div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 2000);
}

// ─── Reports ──────────────────────────────────
function initReportsPage() {
  const ctx = document.getElementById('reportChart');
  if (!ctx || reportChartInst) return;
  const labels = Array.from({length: 30}, (_, i) => `Day ${i+1}`);
  reportChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Heart Rate', data: Array.from({length:30}, () => Math.round(65+Math.random()*20)), borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.05)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 },
        { label: 'SpO₂', data: Array.from({length:30}, () => Math.round(95+Math.random()*5)), borderColor: '#1e90ff', backgroundColor: 'rgba(30,144,255,0.05)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 },
        { label: 'Glucose', data: Array.from({length:30}, () => Math.round(80+Math.random()*40)), borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.05)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: 'rgba(240,244,255,0.6)', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', maxTicksLimit: 10, font:{size:10} } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font:{size:10} } }
      }
    }
  });
}
function openReport(type) { showToast('Opening Report', `${type.charAt(0).toUpperCase()+type.slice(1)} report is loading...`); }

// ─── Profile ──────────────────────────────────
function saveProfile() { showToast('Profile Saved', 'Your health profile has been updated.'); }

// ─── Emergency ────────────────────────────────
function triggerSOS() {
  new bootstrap.Modal(document.getElementById('dashEmergencyModal')).show();
  const steps = [
    { id: 'des-1', text: '✓ Ambulance (108): <strong class="text-success">Notified</strong>' },
    { id: 'des-2', text: '✓ Emergency Contact: <strong class="text-success">SMS Sent</strong>' },
    { id: 'des-3', text: '✓ On-Call Doctor: <strong class="text-success">Connected</strong>' },
  ];
  steps.forEach((s, i) => {
    setTimeout(() => {
      const el = document.getElementById(s.id);
      if (el) el.innerHTML = `<i class="bi bi-check-circle text-success me-2"></i>${s.text}`;
    }, (i+1) * 1500);
  });
}

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 60000);

  initHRChart();
  initDashScore();
  renderVitalsLog();
  renderAppointmentsFull();

  // Check auth
  if (authToken) {
    fetch(API + '/auth/me', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const name = res.user.fullName.split(' ')[0];
          localStorage.setItem('hc_name', name);
          document.getElementById('userName') && (document.getElementById('userName').textContent = name);
          document.getElementById('profileName') && (document.getElementById('profileName').textContent = res.user.fullName);
          document.getElementById('profileEmail') && (document.getElementById('profileEmail').textContent = res.user.email);
        }
      }).catch(() => {});
  }

  // Socket.IO
  try {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.on('alert:critical', () => showToast('🚨 Critical Alert', 'A critical vital reading was detected.'));
  } catch(e) {}
});
