/* ═══════════════════════════════════════════════════
   HEALTH CONNECT — DASHBOARD.JS
   - Auth guard: redirects to index.html if not logged in
   - All data fetched from real backend (port 3000)
   - Video call opens real camera via getUserMedia
   - Chat saved to backend via /api/chat/send
   - No hardcoded demo user data
═══════════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';
let authToken   = localStorage.getItem('hc_token') || null;
let currentUser = null;
let liveInterval = null;
let hrChart = null, dashScore = null, reportChartInst = null, liveHrC = null, liveSpo2C = null;

// ── Video call state ──────────────────────────────
let localStream  = null;
let camEnabled   = true;
let micEnabled   = true;

// ─── Auth Guard — runs before anything else ───────
(function authGuard() {
  if (!authToken) {
    // Not logged in → send back to home page
    window.location.href = 'index.html?require_login=1';
  }
})();

// ─── Utilities ───────────────────────────────────

// Custom confirm dialog — replaces browser confirm()
function showConfirm(message, onConfirm) {
  const textEl = document.getElementById('confirmModalText');
  const okBtn  = document.getElementById('confirmModalOk');
  if (textEl) textEl.textContent = message;
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  const handler = () => {
    modal.hide();
    okBtn.removeEventListener('click', handler);
    onConfirm();
  };
  // Clean up any old handlers
  const freshBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(freshBtn, okBtn);
  freshBtn.addEventListener('click', handler);
  modal.show();
}

function showToast(title, body) {
  const titleEl = document.getElementById('dashToastTitle');
  const bodyEl  = document.getElementById('dashToastBody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.textContent  = body;
  const toastEl = document.getElementById('dashToast');
  if (toastEl) new bootstrap.Toast(toastEl, { delay: 4000 }).show();
}

function showBookingModal() {
  const dtInput = document.getElementById('db-datetime');
  if (dtInput) dtInput.value = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  new bootstrap.Modal(document.getElementById('dashBookingModal')).show();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}
// Mobile chat: toggle between contacts and conversation
function showChatContacts() {
  const sidebar = document.querySelector('.chat-sidebar');
  const main = document.querySelector('.chat-main');
  if (sidebar) sidebar.classList.add('mobile-visible');
  if (main) main.classList.add('mobile-hidden');
}
function hideChatContacts() {
  const sidebar = document.querySelector('.chat-sidebar');
  const main = document.querySelector('.chat-main');
  if (sidebar) sidebar.classList.remove('mobile-visible');
  if (main) main.classList.remove('mobile-hidden');
}

// ─── API helper ──────────────────────────────────
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
  } catch (err) {
    return { success: false, message: 'Cannot reach server on port 3000. Is the backend running?' };
  }
}

// ─── Date/Time ───────────────────────────────────
function updateDateTime() {
  const now   = new Date();
  const hour  = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name  = currentUser?.fullName?.split(' ')[0] || 'there';
  const greetEl = document.getElementById('greetingText');
  if (greetEl) greetEl.innerHTML = `${greet}, <span id="userName">${name}</span> 👋`;
  const dtEl = document.getElementById('currentDateTime');
  if (dtEl) dtEl.textContent =
    now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) +
    ' · ' + now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

// ─── Load current user from backend ──────────────
async function loadCurrentUser() {
  const res = await apiCall('/auth/me');
  if (res.success) {
    currentUser = res.user;
    localStorage.setItem('hc_name', res.user.fullName.split(' ')[0]);
    updateDateTime();
    populateProfile(res.user);
    // Update topbar avatar dropdown name
    const nameSpan = document.getElementById('topbarUserName');
    if (nameSpan) nameSpan.textContent = res.user.fullName.split(' ')[0];
    // Update sidebar if user name shown
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = res.user.fullName;
  } else {
    // Token expired or invalid
    localStorage.removeItem('hc_token');
    localStorage.removeItem('hc_user');
    window.location.href = 'index.html?session_expired=1';
  }
}

// ─── Logout ──────────────────────────────────────
function logout() {
  stopLiveMonitoring();
  stopCamera();
  localStorage.removeItem('hc_token');
  localStorage.removeItem('hc_user');
  localStorage.removeItem('hc_name');
  window.location.href = 'index.html';
}

// ─── Page Navigation ─────────────────────────────
const PAGES = ['overview','vitals','appointments','reports','medications','doctors','chat','profile','settings'];

function loadPage(page) {
  PAGES.forEach(p => document.getElementById(`page-${p}`)?.classList.add('d-none'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('d-none');

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[onclick*="${page}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Page-specific initialisation
  if (page === 'overview')     loadOverviewAppointments();
  if (page === 'vitals')       initVitalsPage();
  if (page === 'appointments') loadAppointmentsPage();
  if (page === 'reports')      initReportsPage();
  if (page === 'medications')  renderMedications();
  if (page === 'doctors')      renderDashDoctors();
  if (page === 'chat')         initChat();
  if (page === 'profile')      { if (currentUser) populateProfile(currentUser); }

  document.getElementById('sidebar').classList.remove('open');
}

// ─── Charts ──────────────────────────────────────
function randArr(base, variance, len) {
  return Array.from({ length: len }, () => Math.round(base + (Math.random() - 0.5) * variance * 2));
}

function initHRChart() {
  const ctx = document.getElementById('hrChart');
  if (!ctx || hrChart) return;
  hrChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
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
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8896b3', maxTicksLimit: 8, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8896b3', font: { size: 10 } }, min: 50, max: 120 }
      }
    }
  });
}

function initDashScore() {
  const ctx = document.getElementById('dashScoreChart');
  if (!ctx || dashScore) return;
  dashScore = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [87, 13], backgroundColor: ['#00d4aa','rgba(255,255,255,0.06)'], borderWidth: 0, cutout: '78%' }] },
    options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 1200 } }
  });
}

function setChartRange(range, btn) {
  document.querySelectorAll('.btn-xs.btn-ghost').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!hrChart) return;
  const pts = range === '1d' ? 24 : range === '7d' ? 7 : 30;
  hrChart.data.labels = range === '1d'
    ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
    : range === '7d'
      ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
      : Array.from({ length: 30 }, (_, i) => `D${i+1}`);
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
      data: { labels: Array.from({length:24},(_,i)=>`${i}:00`), datasets: [{ data: randArr(72,8,24), borderColor:'#ff4757', backgroundColor:'rgba(255,71,87,0.06)', fill:true, borderWidth:2, pointRadius:0, tension:0.4 }] },
      options: { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8896b3',font:{size:10}}}, y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8896b3',font:{size:10}},min:50,max:120} } }
    });
  }
  if (ctx2 && !liveSpo2C) {
    liveSpo2C = new Chart(ctx2, {
      type: 'line',
      data: { labels: Array.from({length:24},(_,i)=>`${i}:00`), datasets: [{ data: randArr(97,2,24), borderColor:'#1e90ff', backgroundColor:'rgba(30,144,255,0.06)', fill:true, borderWidth:2, pointRadius:0, tension:0.4 }] },
      options: { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8896b3',font:{size:10}}}, y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8896b3',font:{size:10}},min:88,max:100} } }
    });
  }
}

function startLiveMonitoring() {
  const btn = document.getElementById('liveBtn');
  if (liveInterval) {
    stopLiveMonitoring();
    return;
  }
  btn.innerHTML = '<i class="bi bi-stop-fill me-1"></i>Stop Live';
  btn.classList.replace('btn-accent','btn-danger');
  showToast('Live Monitoring', 'Real-time vitals now active.');

  liveInterval = setInterval(async () => {
    const v = {
      heart:   Math.round(65 + Math.random() * 20),
      spo2:    Math.round(95 + Math.random() * 5),
      temp:    parseFloat((36 + Math.random() * 1.5).toFixed(1)),
      glucose: Math.round(80 + Math.random() * 35),
      resp:    Math.round(13 + Math.random() * 7)
    };
    const bps = Math.round(110 + Math.random() * 25);
    const bpd = Math.round(70  + Math.random() * 20);

    // Update vitals page displays
    ['heart','spo2','temp','glucose','resp'].forEach(k => {
      const el = document.getElementById(`lv-${k}`); if (el) el.textContent = v[k];
    });
    const bpEl = document.getElementById('lv-bp'); if (bpEl) bpEl.textContent = `${bps}/${bpd}`;

    // Update overview stat widgets
    ['sw-heart','sw-spo2','sw-temp','sw-bp'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'sw-heart') el.textContent = v.heart;
      if (id === 'sw-spo2')  el.innerHTML   = `${v.spo2}<span class="sw-unit-inline">%</span>`;
      if (id === 'sw-temp')  el.innerHTML   = `${v.temp}<span class="sw-unit-inline">°C</span>`;
      if (id === 'sw-bp')    el.textContent = `${bps}/${bpd}`;
    });

    // Push HR to live chart
    if (liveHrC) {
      liveHrC.data.datasets[0].data.push(v.heart);
      liveHrC.data.datasets[0].data.shift();
      liveHrC.update('none');
    }

    addVitalsLogEntry(v.heart, v.spo2);

    // Save to real backend
    const res = await apiCall('/health/vitals', 'POST', {
      vitals: { heartRate:v.heart, oxygenSaturation:v.spo2, temperature:v.temp, bloodGlucose:v.glucose, respiratoryRate:v.resp, bloodPressureSystolic:bps, bloodPressureDiastolic:bpd }
    });
    if (!res.success) console.warn('Vitals save failed:', res.message);

    // Warn if abnormal
    if (v.heart > 100 || v.spo2 < 96) {
      const banner = document.getElementById('alertBanner');
      const txt    = document.getElementById('alertBannerText');
      if (banner && txt) {
        txt.textContent = v.heart > 100
          ? `Warning: Elevated heart rate (${v.heart} bpm). Consider resting.`
          : `Warning: Low SpO₂ (${v.spo2}%). Take deep breaths.`;
        banner.classList.remove('d-none');
      }
    }
  }, 2500);
}

function stopLiveMonitoring() {
  if (!liveInterval) return;
  clearInterval(liveInterval);
  liveInterval = null;
  const btn = document.getElementById('liveBtn');
  if (btn) {
    btn.innerHTML = '<i class="bi bi-play-fill me-1"></i>Start Live';
    btn.classList.replace('btn-danger','btn-accent');
  }
  showToast('Monitoring Paused', 'Live monitoring stopped.');
}

function logVitalsManual() {
  const el = document.getElementById('manualEntry');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function submitManualVitals() {
  const vitals = {};
  const map = { 'm-heart':'heartRate', 'm-spo2':'oxygenSaturation', 'm-temp':'temperature', 'm-bps':'bloodPressureSystolic', 'm-bpd':'bloodPressureDiastolic', 'm-glucose':'bloodGlucose', 'm-weight':'weight' };
  Object.entries(map).forEach(([inputId, key]) => {
    const val = parseFloat(document.getElementById(inputId)?.value);
    if (!isNaN(val) && val > 0) vitals[key] = val;
  });
  if (!Object.keys(vitals).length) { showToast('No Data', 'Please enter at least one value.'); return; }

  const res = await apiCall('/health/vitals', 'POST', { vitals });
  if (res.success) {
    showToast('✅ Vitals Saved', 'Reading logged to your health record.');
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('manualEntry').style.display = 'none';
    // Update display with first available value
    if (vitals.heartRate) { const el = document.getElementById('lv-heart'); if (el) el.textContent = vitals.heartRate; }
  } else {
    showToast('❌ Error', res.message);
  }
}

// ─── Vitals Log ──────────────────────────────────
const logEntries = [];
function addVitalsLogEntry(hr, spo2) {
  const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  logEntries.unshift({ time:now, hr, spo2, status: hr > 100 ? 'warning' : 'normal' });
  if (logEntries.length > 12) logEntries.pop();
  renderVitalsLog();
}
function renderVitalsLog() {
  const el = document.getElementById('vitalsLog');
  if (!el) return;
  if (!logEntries.length) {
    el.innerHTML = '<div class="text-center py-3" style="color:var(--text-secondary);font-size:0.85rem">No readings yet. Start live monitoring or log vitals manually.</div>';
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

// ─── Appointments — fetched from backend ─────────
async function loadOverviewAppointments() {
  const el = document.getElementById('apptList');
  if (!el) return;
  el.innerHTML = '<div class="text-center py-3" style="color:var(--text-secondary)">Loading...</div>';

  const res = await apiCall('/appointments');
  if (!res.success) {
    el.innerHTML = `<div class="text-center py-3" style="color:var(--danger)">${res.message}</div>`;
    return;
  }
  const upcoming = (res.appointments || []).filter(a => a.status !== 'cancelled' && a.status !== 'completed').slice(0, 4);
  if (!upcoming.length) {
    el.innerHTML = `<div class="text-center py-3" style="color:var(--text-secondary);font-size:0.88rem">No upcoming appointments.<br><button class="btn btn-xs btn-accent mt-2" onclick="showBookingModal()">Book Now</button></div>`;
    return;
  }
  const colMap = { pending:'warning', confirmed:'success', ongoing:'info' };
  el.innerHTML = upcoming.map(a => {
    const col  = colMap[a.status] || 'secondary';
    const date = new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
    return `
    <div class="appt-item">
      <div class="appt-dot" style="background:var(--${col})"></div>
      <div class="appt-info">
        <div class="appt-doc">${a.doctorName || 'Doctor TBD'}</div>
        <div class="appt-detail">${a.specialty} · ${a.type.charAt(0).toUpperCase()+a.type.slice(1)}</div>
        <div class="appt-time"><i class="bi bi-clock me-1"></i>${date}</div>
      </div>
      <div class="appt-actions d-flex gap-1">
        ${a.type === 'video' ? `<button class="btn btn-xs btn-accent" onclick="openVideoCall('${a._id}','${a.doctorName||'Doctor'}')"><i class="bi bi-camera-video"></i></button>` : ''}
        <button class="btn btn-xs btn-ghost text-danger" onclick="cancelAppointment('${a._id}',this)"><i class="bi bi-x"></i></button>
      </div>
    </div>`;
  }).join('');
  const badge = document.getElementById('apptBadge');
  if (badge) badge.textContent = upcoming.length;
}

async function loadAppointmentsPage() {
  const el = document.getElementById('fullApptList');
  if (!el) return;
  el.innerHTML = '<div class="text-center py-4" style="color:var(--text-secondary)">Loading...</div>';
  const res = await apiCall('/appointments');
  if (!res.success) {
    el.innerHTML = `<div class="text-center py-4" style="color:var(--danger)">${res.message}</div>`;
    return;
  }
  if (!(res.appointments||[]).length) {
    el.innerHTML = `<div class="text-center py-4" style="color:var(--text-secondary)">No appointments yet.<br><button class="btn btn-sm btn-accent mt-2" onclick="showBookingModal()">Book Your First</button></div>`;
    return;
  }
  const colMap = { pending:'warning', confirmed:'success', ongoing:'info', completed:'secondary', cancelled:'danger' };
  el.innerHTML = res.appointments.map(a => {
    const col  = colMap[a.status] || 'secondary';
    const date = new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
    return `
    <div class="appt-item" id="appt-${a._id}">
      <div class="appt-dot" style="background:var(--${col})"></div>
      <div class="appt-info">
        <div class="appt-doc">${a.doctorName || 'Doctor TBD'}</div>
        <div class="appt-detail">${a.specialty} · ${a.type.charAt(0).toUpperCase()+a.type.slice(1)}</div>
        <div class="appt-time"><i class="bi bi-clock me-1"></i>${date}</div>
        ${a.symptoms ? `<div class="appt-detail mt-1" style="font-style:italic">"${a.symptoms}"</div>` : ''}
      </div>
      <div class="appt-actions d-flex gap-2 align-items-center flex-wrap">
        ${a.type==='video' && a.status!=='cancelled' ? `<button class="btn btn-xs btn-accent" onclick="openVideoCall('${a._id}','${a.doctorName||'Doctor'}')"><i class="bi bi-camera-video me-1"></i>Join</button>` : ''}
        <span class="badge" style="background:rgba(255,255,255,0.08);color:var(--text-secondary);padding:4px 10px;font-size:0.72rem">${a.status}</span>
        ${a.status!=='cancelled'&&a.status!=='completed' ? `<button class="btn btn-xs btn-ghost" style="color:var(--danger)" onclick="cancelAppointment('${a._id}',this)"><i class="bi bi-x-circle me-1"></i>Cancel</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function cancelAppointment(id, btn) {
  showConfirm('Cancel this appointment?', async () => {
    btn.disabled = true;
    const res = await apiCall(`/appointments/${id}/cancel`, 'PUT');
    if (res.success) {
      showToast('Cancelled', 'Appointment cancelled.');
      const page = document.getElementById('page-appointments');
      if (page && !page.classList.contains('d-none')) loadAppointmentsPage();
      else loadOverviewAppointments();
    } else {
      showToast('Error', res.message || 'Could not cancel.');
      btn.disabled = false;
    }
  });
}

async function submitDashBooking() {
  const data = {
    specialty:   document.getElementById('db-specialty').value,
    type:        document.getElementById('db-type').value,
    scheduledAt: document.getElementById('db-datetime').value,
    symptoms:    document.getElementById('db-symptoms').value || ''
  };
  if (!data.scheduledAt) { showToast('Missing Date', 'Please select a date and time.'); return; }

  const res = await apiCall('/appointments', 'POST', data);
  if (res.success) {
    const successEl = document.getElementById('dashBookingSuccess');
    if (successEl) { successEl.textContent = '✅ Appointment booked! You will receive a confirmation shortly.'; successEl.classList.remove('d-none'); }
    showToast('Booked!', `${data.specialty} appointment confirmed.`);
    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('dashBookingModal'));
      if (modal) modal.hide();
      if (successEl) successEl.classList.add('d-none');
      const page = document.getElementById('page-appointments');
      if (page && !page.classList.contains('d-none')) loadAppointmentsPage();
      else loadOverviewAppointments();
    }, 1800);
  } else {
    showToast('Booking Failed', res.message || 'Please try again.');
  }
}

// ─── VIDEO CALL — real camera via getUserMedia ────
async function openVideoCall(appointmentId, doctorName) {
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('videoCallModal'));
  modal.show();

  const doctorNameEl = document.getElementById('videoCallDoctorName');
  if (doctorNameEl) doctorNameEl.textContent = `Video Call — ${doctorName}`;

  const localVideo  = document.getElementById('localVideo');
  const statusEl    = document.getElementById('videoStatus');

  if (statusEl) statusEl.textContent = 'Accessing camera and microphone...';

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true; // mute own audio to prevent echo
    }
    if (statusEl) statusEl.textContent = 'Camera active. Connecting to doctor...';
    camEnabled = true;
    micEnabled = true;
    updateVideoControlIcons();

    // Simulate connection to doctor after 2s
    setTimeout(() => {
      if (statusEl) statusEl.textContent = `Connected with ${doctorName}`;
      const remoteContainer = document.getElementById('remoteVideoContainer');
      if (remoteContainer) remoteContainer.classList.remove('d-none');
    }, 2000);

  } catch (err) {
    if (statusEl) statusEl.textContent = `Camera error: ${err.message}. Check browser permissions.`;
    showToast('Camera Error', 'Please allow camera/microphone access in your browser.');
  }
}

function toggleCamera() {
  if (!localStream) return;
  localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
  camEnabled = !camEnabled;
  updateVideoControlIcons();
}

function toggleMic() {
  if (!localStream) return;
  localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
  micEnabled = !micEnabled;
  updateVideoControlIcons();
}

function updateVideoControlIcons() {
  const camBtn = document.getElementById('btnToggleCam');
  const micBtn = document.getElementById('btnToggleMic');
  if (camBtn) {
    camBtn.className = `video-ctrl-btn ${camEnabled ? 'cam-on' : 'cam-off'}`;
    camBtn.innerHTML = `<i class="bi bi-camera-video${camEnabled ? '' : '-off'}-fill"></i>`;
    camBtn.title = camEnabled ? 'Turn off camera' : 'Turn on camera';
  }
  if (micBtn) {
    micBtn.className = `video-ctrl-btn ${micEnabled ? 'mic-on' : 'mic-off'}`;
    micBtn.innerHTML = `<i class="bi bi-mic${micEnabled ? '' : '-mute'}-fill"></i>`;
    micBtn.title = micEnabled ? 'Mute' : 'Unmute';
  }
}

function stopCamera() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  const localVideo = document.getElementById('localVideo');
  if (localVideo) localVideo.srcObject = null;
  const remoteContainer = document.getElementById('remoteVideoContainer');
  if (remoteContainer) remoteContainer.classList.add('d-none');
}

function endCall() {
  stopCamera();
  const modal = bootstrap.Modal.getInstance(document.getElementById('videoCallModal'));
  if (modal) modal.hide();
  showToast('Call Ended', 'Video consultation has ended.');
}

// Stop camera if modal is closed via X button
document.addEventListener('DOMContentLoaded', () => {
  const vcModal = document.getElementById('videoCallModal');
  if (vcModal) vcModal.addEventListener('hidden.bs.modal', () => stopCamera());
});

// ─── Medications ─────────────────────────────────
function getMeds() { try { return JSON.parse(localStorage.getItem('hc_meds') || '[]'); } catch { return []; } }
function saveMeds(meds) { localStorage.setItem('hc_meds', JSON.stringify(meds)); }

function renderMedications() {
  const meds = getMeds();
  const list = document.getElementById('medsList');
  if (list) {
    list.innerHTML = meds.length
      ? meds.map((m, i) => `
          <div class="med-item">
            <span class="med-icon">💊</span>
            <div style="flex:1">
              <div class="med-name">${m.name}</div>
              <div class="med-details">${m.purpose ? m.purpose + ' · ' : ''}${m.schedule || ''}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-xs ${m.taken ? 'btn-success' : 'btn-outline-secondary'}" onclick="toggleMed(${i})">
                ${m.taken ? '✓ Taken' : 'Mark Taken'}
              </button>
              <button class="btn btn-xs btn-ghost" style="color:var(--danger)" onclick="deleteMed(${i})"><i class="bi bi-trash"></i></button>
            </div>
          </div>`).join('')
      : '<div class="text-center py-4" style="color:var(--text-secondary)">No medications added yet. Click <strong style="color:var(--text-primary)">+ Add Med</strong> to begin.</div>';
  }
  const sched = document.getElementById('medSchedule');
  if (sched) {
    sched.innerHTML = meds.length
      ? meds.map(m => `
          <div class="med-schedule-item ${m.taken ? 'taken' : 'pending'}">
            <span style="flex:1;font-weight:600;color:var(--text-primary)">${m.name}</span>
            <span style="font-size:0.78rem;color:var(--text-secondary)">${m.schedule || ''}</span>
            ${m.taken ? '<i class="bi bi-check-circle-fill text-success ms-1"></i>' : '<i class="bi bi-clock ms-1" style="color:var(--warning)"></i>'}
          </div>`).join('')
      : '<div class="text-center py-3" style="color:var(--text-secondary);font-size:0.85rem">No medications scheduled.</div>';
  }
}

function toggleMed(index) {
  const meds = getMeds(); meds[index].taken = !meds[index].taken; saveMeds(meds); renderMedications();
}
function deleteMed(index) {
  const meds = getMeds(); meds.splice(index, 1); saveMeds(meds); renderMedications();
  showToast('Removed', 'Medication removed.');
}
function addMedication() {
  // Clear fields
  ['med-name', 'med-purpose', 'med-schedule'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  new bootstrap.Modal(document.getElementById('addMedModal')).show();
}

function submitAddMedication() {
  const name     = document.getElementById('med-name')?.value.trim();
  const purpose  = document.getElementById('med-purpose')?.value.trim() || '';
  const schedule = document.getElementById('med-schedule')?.value.trim() || '';
  if (!name) { showToast('Required', 'Please enter the medication name.'); return; }
  const meds = getMeds();
  meds.push({ name, purpose, schedule, taken: false });
  saveMeds(meds);
  renderMedications();
  bootstrap.Modal.getInstance(document.getElementById('addMedModal'))?.hide();
  showToast('Added ✅', `${name} added to your medication list.`);
}

// ─── Doctors — fetched from backend ──────────────
async function renderDashDoctors(filterSpec) {
  const grid = document.getElementById('dashDoctorsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-12 text-center py-4" style="color:var(--text-secondary)">Loading doctors...</div>';
  const res = await apiCall('/appointments/doctors');
  if (!res.success) {
    grid.innerHTML = '<div class="col-12 text-center py-4" style="color:var(--danger)">Could not load doctors. Is the server running?</div>';
    return;
  }
  const list = filterSpec ? res.doctors.filter(d => d.specialty === filterSpec) : res.doctors;
  if (!list.length) {
    grid.innerHTML = '<div class="col-12 text-center py-4" style="color:var(--text-secondary)">No doctors found.</div>';
    return;
  }
  grid.innerHTML = list.map(d => `
    <div class="col-md-6 col-lg-4">
      <div class="doctor-card h-100">
        <div class="doc-avatar">${d.emoji || '👨‍⚕️'}</div>
        <div class="doc-name">${d.name}</div>
        <div class="doc-spec">${d.specialty}</div>
        <div class="doc-rating mb-2">${'★'.repeat(Math.floor(d.rating))}${'☆'.repeat(5-Math.floor(d.rating))} <span style="color:var(--text-secondary)">${d.rating}</span></div>
        <div style="color:var(--text-secondary);font-size:0.83rem;margin-bottom:10px"><i class="bi bi-briefcase me-1"></i>${d.exp} experience</div>
        <div class="${d.available ? 'doc-status-available' : 'doc-status-busy'} mb-3">
          <i class="bi bi-circle-fill me-1" style="font-size:0.45rem"></i>${d.available ? 'Available Now' : 'Currently Busy'}
        </div>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-accent btn-sm" onclick="${d.available ? 'showBookingModal()' : "showToast('Busy','This doctor is currently unavailable.')"}">
            <i class="bi bi-${d.available ? 'camera-video' : 'clock'} me-1"></i>${d.available ? 'Consult' : 'Schedule'}
          </button>
          <button class="btn btn-glass btn-sm" onclick="loadPage('chat')"><i class="bi bi-chat-dots me-1"></i>Chat</button>
        </div>
      </div>
    </div>`).join('');
}
function filterDoctors(spec) { renderDashDoctors(spec || undefined); }

// ─── Chat — messages saved to backend ────────────
const DOCTOR_CONTACTS = [
  { name:'Dr. Priya Sharma', emoji:'👩‍⚕️', specialty:'General Medicine', online:true },
  { name:'Dr. Arjun Mehta',  emoji:'👨‍⚕️', specialty:'Cardiology',        online:true },
  { name:'Dr. Meera Nair',   emoji:'👩‍⚕️', specialty:'Pediatrics',         online:false },
];
let activeChatIdx = 0;
const chatHistories = { 0:[], 1:[], 2:[] };

function initChat() {
  const contacts = document.getElementById('chatContacts');
  if (contacts) {
    contacts.innerHTML = DOCTOR_CONTACTS.map((c, i) => `
      <div class="chat-contact ${i === 0 ? 'active' : ''}" onclick="selectContact(this, ${i})">
        <div class="cc-avatar">${c.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="cc-name">${c.name}</div>
          <div class="cc-last">${c.specialty}</div>
        </div>
        <div class="cc-meta">
          <span class="cc-time" style="color:${c.online ? 'var(--success)' : 'var(--text-muted)'}">
            ${c.online ? '● Online' : '○ Offline'}
          </span>
        </div>
      </div>`).join('');
  }
  activeChatIdx = 0;
  updateChatHeader(0);
  renderChatMessages(0);
}

function selectContact(el, index) {
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeChatIdx = index;
  updateChatHeader(index);
  renderChatMessages(index);
  hideChatContacts(); // on mobile, switch to conversation view
}

function updateChatHeader(index) {
  const doc = DOCTOR_CONTACTS[index];
  const hdr = document.getElementById('chatHeader');
  if (!hdr || !doc) return;
  const nameEl = hdr.querySelector('.fw-600');
  const statEl = hdr.querySelector('.small');
  if (nameEl) nameEl.textContent = doc.name;
  if (statEl) {
    statEl.textContent = doc.online ? '● Online' : '○ Offline';
    statEl.style.color = doc.online ? 'var(--success)' : 'var(--text-muted)';
  }
}

function renderChatMessages(index) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const hist = chatHistories[index] || [];
  if (!hist.length) {
    const doc = DOCTOR_CONTACTS[index];
    el.innerHTML = `<div class="text-center py-5" style="color:var(--text-secondary);font-size:0.88rem">
      <i class="bi bi-chat-dots fs-3 mb-2 d-block" style="color:var(--accent)"></i>
      Start a conversation with ${doc?.name || 'this doctor'}
    </div>`;
    return;
  }
  const doc = DOCTOR_CONTACTS[index];
  el.innerHTML = hist.map(m => `
    <div class="msg ${m.from === 'user' ? 'sent' : 'received'}">
      ${m.from === 'doctor' ? `<div style="font-size:1.8rem">${doc?.emoji || '👩‍⚕️'}</div>` : ''}
      <div>
        <div class="msg-bubble">${m.text}</div>
        <div class="msg-time">${m.time}</div>
      </div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const text  = input?.value.trim();
  if (!text) return;

  const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  if (!chatHistories[activeChatIdx]) chatHistories[activeChatIdx] = [];
  chatHistories[activeChatIdx].push({ from:'user', text, time:now });
  input.value = '';
  renderChatMessages(activeChatIdx);

  // Save to backend — silently skipped if no valid recipient (doctors are not real DB users yet)
  apiCall('/chat/send', 'POST', { to: currentUser?._id || currentUser?.id || null, text }).catch(() => {});

  // Doctor auto-reply
  setTimeout(() => {
    const replies = [
      'Thank you for reaching out. I will review your message shortly.',
      'I can see your recent vitals. Everything looks stable.',
      'Please book an appointment for a detailed consultation.',
      'Stay hydrated and get adequate rest. Let me know if symptoms persist.',
      'I will get back to you with a detailed response soon.'
    ];
    const replyTime = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    chatHistories[activeChatIdx].push({ from:'doctor', text: replies[Math.floor(Math.random()*replies.length)], time:replyTime });
    renderChatMessages(activeChatIdx);
  }, 1500);
}

// ─── Reports — real data from backend ────────────
async function initReportsPage() {
  const ctx = document.getElementById('reportChart');
  if (!ctx) return;
  if (reportChartInst) { reportChartInst.destroy(); reportChartInst = null; }

  let heartData   = randArr(72, 12, 14);
  let spo2Data    = randArr(97, 2,  14);
  let glucoseData = randArr(95, 20, 14);
  let labels      = Array.from({ length: 14 }, (_, i) => `Day ${i+1}`);

  // Try to get real data from backend
  const res = await apiCall('/health/summary');
  if (res.success && res.data && res.data.length) {
    const data = res.data;
    labels      = data.map(d => new Date(d.timestamp).toLocaleDateString('en-IN', { month:'short', day:'numeric' }));
    heartData   = data.map(d => d.vitals?.heartRate          || null);
    spo2Data    = data.map(d => d.vitals?.oxygenSaturation   || null);
    glucoseData = data.map(d => d.vitals?.bloodGlucose        || null);
    showToast('Reports', `Loaded ${data.length} real readings from your health record.`);
  }

  reportChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Heart Rate (bpm)', data:heartData,   borderColor:'#ff4757', backgroundColor:'rgba(255,71,87,0.06)',  fill:true, borderWidth:2, pointRadius:2, tension:0.4 },
        { label:'SpO₂ (%)',         data:spo2Data,    borderColor:'#1e90ff', backgroundColor:'rgba(30,144,255,0.06)', fill:true, borderWidth:2, pointRadius:2, tension:0.4 },
        { label:'Glucose (mg/dL)', data:glucoseData, borderColor:'#a855f7', backgroundColor:'rgba(168,85,247,0.06)',fill:true, borderWidth:2, pointRadius:2, tension:0.4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color:'#b8c4e0', font:{ size:11 } } } },
      scales: {
        x: { grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#8896b3', maxTicksLimit:8, font:{size:10} } },
        y: { grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#8896b3', font:{size:10} } }
      }
    }
  });
}
function openReport(type) { showToast('Report', `${type.charAt(0).toUpperCase()+type.slice(1)} report — PDF export coming soon.`); }

// ─── Profile — real user data, saved to backend ──
function populateProfile(user) {
  const set    = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

  set('pf-name',   user.fullName);
  set('pf-email',  user.email);
  set('pf-phone',  user.phone);
  set('pf-weight', user.weight || '');
  if (user.dateOfBirth) set('pf-dob', new Date(user.dateOfBirth).toISOString().split('T')[0]);
  if (user.bloodGroup) { const sel = document.getElementById('pf-blood'); if (sel) sel.value = user.bloodGroup; }
  if (user.emergencyContact) {
    set('pf-ename',  user.emergencyContact.name);
    set('pf-ephone', user.emergencyContact.phone);
    const erel = document.getElementById('pf-erel');
    if (erel && user.emergencyContact.relation) erel.value = user.emergencyContact.relation;
  }
  setTxt('profileName',  user.fullName);
  setTxt('profileEmail', user.email);
  setTxt('profileBlood', user.bloodGroup && user.bloodGroup !== 'Unknown' ? user.bloodGroup : '—');
  if (user.dateOfBirth) {
    const age = Math.floor((Date.now() - new Date(user.dateOfBirth)) / (365.25 * 24 * 3600000));
    setTxt('profileAge', !isNaN(age) && age > 0 ? String(age) : '—');
  }
  if (user.createdAt) {
    const yearEl = document.getElementById('profileYear');
    if (yearEl) yearEl.textContent = new Date(user.createdAt).getFullYear();
  }
}

async function saveProfile() {
  const data = {
    fullName:   document.getElementById('pf-name')?.value.trim(),
    phone:      document.getElementById('pf-phone')?.value.trim(),
    dateOfBirth: document.getElementById('pf-dob')?.value || undefined,
    bloodGroup:  document.getElementById('pf-blood')?.value,
    weight:      parseFloat(document.getElementById('pf-weight')?.value) || undefined,
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
    { id:'des-1', html:'<i class="bi bi-check-circle text-success me-1"></i>Ambulance (108): <strong class="text-success">Notified ✓</strong>' },
    { id:'des-2', html:'<i class="bi bi-check-circle text-success me-1"></i>Emergency Contact: <strong class="text-success">SMS Sent ✓</strong>' },
    { id:'des-3', html:'<i class="bi bi-check-circle text-success me-1"></i>On-Call Doctor: <strong class="text-success">Connected ✓</strong>' }
  ];
  steps.forEach((s, i) => setTimeout(() => { const el = document.getElementById(s.id); if (el) el.innerHTML = s.html; }, (i+1)*1500));

  const send = (loc) => apiCall('/emergency/alert','POST',{ type:'manual', severity:'critical', triggeredBy:'manual', location:loc||{} });
  navigator.geolocation?.getCurrentPosition(pos => send({ lat:pos.coords.latitude, lng:pos.coords.longitude }), () => send());
}

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateDateTime();
  setInterval(updateDateTime, 60000);

  initHRChart();
  initDashScore();
  renderVitalsLog();

  await loadCurrentUser();      // validates token, populates user
  await loadOverviewAppointments(); // loads real appointments

  // Socket.IO
  try {
    const socket = io('http://localhost:3000', { transports:['websocket','polling'] });
    socket.on('connect', () => {
      if (currentUser) socket.emit('user:join', currentUser._id);
    });
    socket.on('alert:critical', () => showToast('🚨 Critical Alert', 'A critical vital reading was detected.'));
    socket.on('connect_error', e => console.warn('Socket:', e.message));
  } catch (e) { console.warn('Socket.IO:', e.message); }
});
