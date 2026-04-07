const API = 'https://healthconnect-kon9.onrender.com/api';
let authToken   = localStorage.getItem('hc_token') || null;
let currentUser = null;
let liveInterval = null;
let hrChart = null, dashScore = null, reportChartInst = null, liveHrC = null, liveSpo2C = null;
let localStream  = null;
let camEnabled   = true;
let micEnabled   = true;
(function authGuard() {
  if (!authToken) {
    window.location.href = 'index.html?require_login=1';
  }
})();
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
  if (overlay) {
    if (sidebar.classList.contains('open')) overlay.classList.add('active');
    else overlay.classList.remove('active');
  }
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}
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
    return { success: false, message: 'Cannot reach server. Please try again later.' };
  }
}
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
async function loadCurrentUser() {
  const res = await apiCall('/auth/me');
  if (res.success) {
    currentUser = res.user;
    localStorage.setItem('hc_name', res.user.fullName.split(' ')[0]);
    updateDateTime();
    populateProfile(res.user);
    const nameSpan = document.getElementById('topbarUserName');
    if (nameSpan) nameSpan.textContent = res.user.fullName.split(' ')[0];
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = res.user.fullName;
  } else {
    localStorage.removeItem('hc_token');
    localStorage.removeItem('hc_user');
    window.location.href = 'index.html?session_expired=1';
  }
}
function logout() {
  stopLiveMonitoring();
  stopCamera();
  localStorage.removeItem('hc_token');
  localStorage.removeItem('hc_user');
  localStorage.removeItem('hc_name');
  window.location.href = 'index.html';
}
const PAGES = ['overview','vitals','appointments','reports','medications','prescriptions','doctors','chat','notifications','profile','settings'];
function loadPage(page) {
  PAGES.forEach(p => document.getElementById(`page-${p}`)?.classList.add('d-none'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('d-none');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[onclick*="${page}"]`);
  if (activeLink) activeLink.classList.add('active');
  if (page === 'overview')     loadOverviewAppointments();
  if (page === 'vitals')       initVitalsPage();
  if (page === 'appointments') loadAppointmentsPage();
  if (page === 'reports')      initReportsPage();
  if (page === 'medications')  renderMedications();
  if (page === 'prescriptions') loadPrescriptions();
  if (page === 'notifications') loadNotifications();
  if (page === 'doctors')      renderDashDoctors();
  if (page === 'chat')         { initChat(); resetMsgBadges(); }
  if (page === 'profile')      { if (currentUser) populateProfile(currentUser); }
  document.getElementById('sidebar').classList.remove('open');
}
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
    ['heart','spo2','temp','glucose','resp'].forEach(k => {
      const el = document.getElementById(`lv-${k}`); if (el) el.textContent = v[k];
    });
    const bpEl = document.getElementById('lv-bp'); if (bpEl) bpEl.textContent = `${bps}/${bpd}`;
    ['sw-heart','sw-spo2','sw-temp','sw-bp'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'sw-heart') el.textContent = v.heart;
      if (id === 'sw-spo2')  el.innerHTML   = `${v.spo2}<span class="sw-unit-inline">%</span>`;
      if (id === 'sw-temp')  el.innerHTML   = `${v.temp}<span class="sw-unit-inline">°C</span>`;
      if (id === 'sw-bp')    el.textContent = `${bps}/${bpd}`;
    });
    if (liveHrC) {
      liveHrC.data.datasets[0].data.push(v.heart);
      liveHrC.data.datasets[0].data.shift();
      liveHrC.update('none');
    }
    addVitalsLogEntry(v.heart, v.spo2);
    const res = await apiCall('/health/vitals', 'POST', {
      vitals: { heartRate:v.heart, oxygenSaturation:v.spo2, temperature:v.temp, bloodGlucose:v.glucose, respiratoryRate:v.resp, bloodPressureSystolic:bps, bloodPressureDiastolic:bpd }
    });
    if (!res.success) console.warn('Vitals save failed:', res.message);
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
    if (vitals.heartRate) { const el = document.getElementById('lv-heart'); if (el) el.textContent = vitals.heartRate; }
  } else {
    showToast('❌ Error', res.message);
  }
}
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
    const badge = document.getElementById('apptBadge');
    if (badge) { badge.textContent = '0'; badge.classList.add('d-none'); }
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
  if (badge) {
    if (upcoming.length > 0) {
      badge.textContent = upcoming.length;
      badge.classList.remove('d-none');
    } else {
      badge.textContent = '0';
      badge.classList.add('d-none');
    }
  }
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
    const badge = document.getElementById('apptBadge');
    if (badge) { badge.textContent = '0'; badge.classList.add('d-none'); }
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
let callTimerInterval = null;
let callSeconds = 0;
let callChatMessages = [];
let vcChatOpen = false;
let vcIsMaximized = false;
let vcIsMinimized = false;
let currentCallAppointmentId = null;
async function openVideoCall(appointmentId, doctorName) {
  currentCallAppointmentId = appointmentId;
  const win = document.getElementById('videoCallWindow');
  win.style.display = 'flex';
  win.classList.remove('vc-maximized', 'vc-minimized');
  win.style.top = '50%';
  win.style.left = '50%';
  win.style.transform = 'translate(-50%, -50%)';
  win.style.width = '820px';
  win.style.height = '580px';
  vcIsMaximized = false;
  vcIsMinimized = false;
  const doctorNameEl = document.getElementById('videoCallDoctorName');
  if (doctorNameEl) doctorNameEl.textContent = `Video Call — ${doctorName}`;
  const localVideo = document.getElementById('localVideo');
  const statusEl = document.getElementById('videoStatus');
  if (statusEl) statusEl.textContent = 'Accessing camera and microphone...';
  callChatMessages = [];
  renderCallChat();
  const chatPanel = document.getElementById('vcChatPanel');
  if (chatPanel) chatPanel.classList.remove('open');
  vcChatOpen = false;
  const chatToggle = document.getElementById('btnToggleChat');
  if (chatToggle) chatToggle.classList.remove('active');
  startCallTimer();
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true;
    }
    if (statusEl) statusEl.textContent = 'Camera active. Connecting to doctor...';
    camEnabled = true;
    micEnabled = true;
    updateVideoControlIcons();
    setTimeout(() => {
      if (statusEl) statusEl.textContent = `Connected with ${doctorName}`;
      const remoteContainer = document.getElementById('remoteVideoContainer');
      if (remoteContainer) remoteContainer.classList.remove('d-none');
    }, 2000);
  } catch (err) {
    if (statusEl) statusEl.textContent = `Camera error: ${err.message}. Check browser permissions.`;
    showToast('Camera Error', 'Please allow camera/microphone access in your browser.');
  }
  initVCDrag();
  initVCResize();
}
function startCallTimer() {
  callSeconds = 0;
  const el = document.getElementById('vcCallTimer');
  if (el) el.textContent = '00:00';
  if (callTimerInterval) clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    const el = document.getElementById('vcCallTimer');
    if (el) el.textContent = `${m}:${s}`;
  }, 1000);
}
function stopCallTimer() {
  if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
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
async function endCall() {
  stopCamera();
  stopCallTimer();
  const win = document.getElementById('videoCallWindow');
  if (win) win.style.display = 'none';
  showToast('Call Ended', 'Video consultation has ended.');
  if (currentCallAppointmentId) {
    const res = await apiCall(`/appointments/${currentCallAppointmentId}`, 'DELETE');
    if (res.success) {
      showToast('Appointment Removed', 'Completed appointment has been removed.');
    }
    currentCallAppointmentId = null;
    loadOverviewAppointments();
    const page = document.getElementById('page-appointments');
    if (page && !page.classList.contains('d-none')) loadAppointmentsPage();
  }
}
function toggleMinimizeCall() {
  const win = document.getElementById('videoCallWindow');
  if (!win) return;
  if (vcIsMinimized) {
    win.classList.remove('vc-minimized');
    vcIsMinimized = false;
  } else {
    win.classList.remove('vc-maximized');
    vcIsMaximized = false;
    win.classList.add('vc-minimized');
    vcIsMinimized = true;
  }
}
function toggleMaximizeCall() {
  const win = document.getElementById('videoCallWindow');
  if (!win) return;
  if (vcIsMaximized) {
    win.classList.remove('vc-maximized');
    vcIsMaximized = false;
  } else {
    win.classList.remove('vc-minimized');
    vcIsMinimized = false;
    win.classList.add('vc-maximized');
    vcIsMaximized = true;
  }
}
function toggleCallChat() {
  const panel = document.getElementById('vcChatPanel');
  const btn = document.getElementById('btnToggleChat');
  if (!panel) return;
  vcChatOpen = !vcChatOpen;
  panel.classList.toggle('open', vcChatOpen);
  if (btn) btn.classList.toggle('active', vcChatOpen);
  if (vcChatOpen) {
    const badge = document.getElementById('vcChatBadge');
    if (badge) { badge.classList.add('d-none'); badge.textContent = '0'; }
    setTimeout(() => {
      const input = document.getElementById('vcChatInput');
      if (input) input.focus();
    }, 350);
  }
}
function renderCallChat() {
  const el = document.getElementById('vcChatMessages');
  if (!el) return;
  if (!callChatMessages.length) {
    el.innerHTML = `<div class="vc-chat-empty">
      <i class="bi bi-chat-square-text"></i>
      <span>Send a message to the doctor during your consultation</span>
    </div>`;
    return;
  }
  el.innerHTML = callChatMessages.map(m => `
    <div class="vc-chat-msg ${m.from === 'user' ? 'sent' : 'received'}">
      <div>${m.text}</div>
      <div class="vc-chat-msg-time">${m.time}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}
function sendCallChatMsg() {
  const input = document.getElementById('vcChatInput');
  const text = input?.value.trim();
  if (!text) return;
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  callChatMessages.push({ from: 'user', text, time: now });
  input.value = '';
  renderCallChat();
  setTimeout(() => {
    const replies = [
      'Noted, I can see that in your records.',
      'Thank you for the information.',
      'Let me check that for you.',
      'Please continue, I\'m listening.',
      'That\'s helpful context for the consultation.',
      'I\'ll include this in my assessment.'
    ];
    const replyTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    callChatMessages.push({ from: 'doctor', text: replies[Math.floor(Math.random() * replies.length)], time: replyTime });
    renderCallChat();
    if (!vcChatOpen) {
      const badge = document.getElementById('vcChatBadge');
      if (badge) {
        const count = parseInt(badge.textContent || '0') + 1;
        badge.textContent = String(count);
        badge.classList.remove('d-none');
      }
    }
  }, 1500);
}
function initVCDrag() {
  const win = document.getElementById('videoCallWindow');
  const titlebar = document.getElementById('vcTitlebar');
  if (!win || !titlebar) return;
  let isDragging = false, offsetX = 0, offsetY = 0;
  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.vc-title-actions') || vcIsMaximized) return;
    isDragging = true;
    const rect = win.getBoundingClientRect();
    win.style.transform = 'none';
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 100));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 48));
    win.style.left = newLeft + 'px';
    win.style.top = newTop + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
    }
  });
}
function initVCResize() {
  const win = document.getElementById('videoCallWindow');
  if (!win) return;
  const handles = win.querySelectorAll('.vc-resize-handle');
  handles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      if (vcIsMaximized || vcIsMinimized) return;
      e.preventDefault();
      e.stopPropagation();
      const dir = handle.dataset.dir;
      const rect = win.getBoundingClientRect();
      win.style.transform = 'none';
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
      win.style.width = rect.width + 'px';
      win.style.height = rect.height + 'px';
      const startX = e.clientX, startY = e.clientY;
      const startW = rect.width, startH = rect.height;
      const startL = rect.left, startT = rect.top;
      document.body.style.userSelect = 'none';
      function onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let w = startW, h = startH, l = startL, t = startT;
        if (dir.includes('e')) w = Math.max(480, startW + dx);
        if (dir.includes('w')) { w = Math.max(480, startW - dx); l = startL + (startW - w); }
        if (dir.includes('s')) h = Math.max(380, startH + dy);
        if (dir.includes('n')) { h = Math.max(380, startH - dy); t = startT + (startH - h); }
        win.style.width = w + 'px';
        win.style.height = h + 'px';
        win.style.left = l + 'px';
        win.style.top = t + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}
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
  hideChatContacts();
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
  apiCall('/chat/send', 'POST', { to: currentUser?._id || currentUser?.id || null, text }).catch(() => {});
  const doc = DOCTOR_CONTACTS[activeChatIdx];
  const replyText = generateContextualReply(text, doc);
  setTimeout(() => {
    const replyTime = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    chatHistories[activeChatIdx].push({ from:'doctor', text: replyText, time:replyTime });
    renderChatMessages(activeChatIdx);
    updateMsgBadges();
  }, 1500);
}
function generateContextualReply(userMsg, doctor) {
  const msg = userMsg.toLowerCase();
  const name = doctor?.name || 'Doctor';
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good evening') || msg.includes('good afternoon')) {
    return `Hello! I'm ${name}. How can I help you today?`;
  }
  if (msg.includes('headache') || msg.includes('head pain') || msg.includes('migraine')) {
    return 'I understand you\'re experiencing headaches. How long have they been occurring? Are they constant or intermittent? In the meantime, stay hydrated and rest in a quiet, dark room.';
  }
  if (msg.includes('fever') || msg.includes('temperature') || msg.includes('hot')) {
    return 'I see you\'re reporting a fever. What is your current temperature? Have you taken any medication like paracetamol? Please stay hydrated and monitor your temperature regularly.';
  }
  if (msg.includes('cough') || msg.includes('cold') || msg.includes('sneez') || msg.includes('throat') || msg.includes('sore')) {
    return 'Sorry to hear about your symptoms. Is the cough dry or productive? Do you have a sore throat as well? Warm fluids and rest can help. I\'d recommend booking a consultation if it persists beyond 3 days.';
  }
  if (msg.includes('pain') || msg.includes('hurt') || msg.includes('ache')) {
    return 'I\'m sorry you\'re in pain. Can you describe where exactly it hurts and rate the intensity on a scale of 1-10? Also, when did it start? This will help me assess your condition better.';
  }
  if (msg.includes('anxiety') || msg.includes('stress') || msg.includes('depress') || msg.includes('mental') || msg.includes('sleep') || msg.includes('insomnia')) {
    return 'I appreciate you sharing this. Mental health is just as important as physical health. How long have you been feeling this way? I\'d recommend we schedule a proper consultation to discuss this in detail.';
  }
  if (msg.includes('stomach') || msg.includes('nausea') || msg.includes('vomit') || msg.includes('diarr') || msg.includes('digest') || msg.includes('abdomen')) {
    return 'Digestive issues can be uncomfortable. Have you eaten anything unusual recently? Are you experiencing any nausea or changes in appetite? Try to stay hydrated with small sips of water or oral rehydration solution.';
  }
  if (msg.includes('blood pressure') || msg.includes('bp') || msg.includes('hypertension')) {
    return 'Blood pressure management is important. What were your recent readings? Are you currently on any medication for it? I\'d recommend monitoring it twice daily — morning and evening — and keeping a log.';
  }
  if (msg.includes('diabetes') || msg.includes('sugar') || msg.includes('glucose') || msg.includes('insulin')) {
    return 'Managing blood sugar levels is crucial. What are your recent fasting and post-meal glucose readings? Are you following a specific diet plan? Regular monitoring and a balanced diet are key.';
  }
  if (msg.includes('rash') || msg.includes('skin') || msg.includes('itch') || msg.includes('allerg')) {
    return 'Skin concerns can have many causes. When did you first notice this? Have you been exposed to any new products, foods, or environments? Avoid scratching — I\'d recommend a video consult so I can see the affected area.';
  }
  if (msg.includes('appointment') || msg.includes('book') || msg.includes('schedule') || msg.includes('visit') || msg.includes('consult')) {
    return 'I\'d be happy to help you schedule a consultation. You can book directly through the Appointments section — choose a time that works best for you and I\'ll be ready.';
  }
  if (msg.includes('medicine') || msg.includes('medication') || msg.includes('tablet') || msg.includes('drug') || msg.includes('prescription') || msg.includes('dose')) {
    return 'Regarding your medication query — please never change dosages without consulting your doctor first. Can you tell me which medication you\'re referring to so I can provide specific guidance?';
  }
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('appreciate')) {
    return 'You\'re welcome! Don\'t hesitate to reach out if you have more questions. Take care and stay healthy! 😊';
  }
  if (msg.includes('report') || msg.includes('result') || msg.includes('test') || msg.includes('lab')) {
    return 'I\'d like to review your test results. Could you share the specific report or values you\'re concerned about? You can also upload them through the Health Reports section for a detailed analysis.';
  }
  if (msg.includes('chest') || msg.includes('heart') || msg.includes('palpitation') || msg.includes('breath')) {
    return 'Chest-related symptoms should be taken seriously. Are you experiencing any shortness of breath, palpitations, or chest tightness? If the pain is severe or sudden, please call emergency services immediately.';
  }
  if (msg.includes('exercise') || msg.includes('workout') || msg.includes('diet') || msg.includes('weight') || msg.includes('fitness')) {
    return 'Great that you\'re thinking about your fitness! Based on your health profile, I\'d recommend starting with moderate activity — 30 minutes of walking daily. Would you like me to create a personalized wellness plan?';
  }
  if (msg.includes('?')) {
    return `That's a good question. Based on my assessment, I'd recommend we discuss this in detail during a scheduled consultation. Meanwhile, please monitor your symptoms and note any changes.`;
  }
  if (msg.length < 15) {
    return `I see. Could you elaborate a bit more so I can better assist you? Feel free to describe your symptoms or concerns in detail.`;
  }
  return `Thank you for sharing that information. Based on what you've described, I'd like to learn more. Could you provide additional details about when this started and any other symptoms? This will help me give you the best advice.`;
}
let unreadMsgCount = 0;
function updateMsgBadges() {
  unreadMsgCount++;
  const msgBadge = document.getElementById('msgBadge');
  const topbarBadge = document.getElementById('topbarMsgBadge');
  if (msgBadge) {
    msgBadge.textContent = String(unreadMsgCount);
    msgBadge.classList.remove('d-none');
  }
  if (topbarBadge) {
    topbarBadge.textContent = String(unreadMsgCount);
    topbarBadge.classList.remove('d-none');
  }
}
function resetMsgBadges() {
  unreadMsgCount = 0;
  const msgBadge = document.getElementById('msgBadge');
  const topbarBadge = document.getElementById('topbarMsgBadge');
  if (msgBadge) { msgBadge.textContent = '0'; msgBadge.classList.add('d-none'); }
  if (topbarBadge) { topbarBadge.textContent = '0'; topbarBadge.classList.add('d-none'); }
}
async function initReportsPage() {
  const ctx = document.getElementById('reportChart');
  if (!ctx) return;
  if (reportChartInst) { reportChartInst.destroy(); reportChartInst = null; }
  let heartData   = randArr(72, 12, 14);
  let spo2Data    = randArr(97, 2,  14);
  let glucoseData = randArr(95, 20, 14);
  let labels      = Array.from({ length: 14 }, (_, i) => `Day ${i+1}`);
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
// ─── loadPage dispatcher — add prescriptions + notifications ───
const _origLoadPage = typeof loadPage === 'function' ? loadPage : null;

// ─── Prescriptions Page ────────────────────────────────────────────
async function loadPrescriptions() {
  const list = document.getElementById('rxList');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-accent"></div></div>';

  const res = await apiCall('/prescriptions');

  if (!res.success || !res.prescriptions?.length) {
    list.innerHTML = `<div class="dash-card text-center py-5">
      <i class="bi bi-file-earmark-medical fs-1" style="color:var(--text-muted)"></i>
      <p style="color:var(--text-secondary);margin-top:12px">No prescriptions yet. Your doctor will add them here after a consultation.</p>
    </div>`;
    return;
  }

  list.innerHTML = res.prescriptions.map(rx => {
    const statusColor = rx.status === 'active' ? 'success' : rx.status === 'revoked' ? 'danger' : 'secondary';
    const meds = rx.medications.map(m =>
      `<div class="rx-med-row"><i class="bi bi-capsule text-accent me-2"></i>
        <strong style="color:var(--text-primary)">${m.name}</strong>${m.dosage ? ' — '+m.dosage : ''}
        <span style="color:var(--text-secondary);font-size:0.82rem;margin-left:8px">${m.frequency || ''} ${m.duration ? '· '+m.duration : ''}</span>
        ${m.instructions ? '<br><small style="color:var(--text-muted);margin-left:20px">'+m.instructions+'</small>' : ''}
      </div>`
    ).join('');
    return `<div class="dash-card mb-3">
      <div class="d-flex align-items-start justify-content-between mb-2">
        <div>
          <h6 class="fw-700 mb-1" style="color:var(--text-primary)"><i class="bi bi-clipboard2-pulse text-accent me-2"></i>${rx.diagnosis}</h6>
          <small style="color:var(--text-muted)"><i class="bi bi-person-badge me-1"></i>${rx.doctor} &nbsp;·&nbsp; <i class="bi bi-calendar me-1"></i>${new Date(rx.issuedAt).toLocaleDateString('en-IN')}</small>
        </div>
        <span class="badge bg-${statusColor === 'success' ? 'success' : statusColor === 'danger' ? 'danger' : 'secondary'} text-capitalize" style="opacity:0.85;font-size:0.75rem">${rx.status}</span>
      </div>
      <div class="mt-3 pt-2" style="border-top:1px solid var(--border)">${meds}</div>
      ${rx.notes ? `<div class="mt-2 p-2 rounded" style="background:var(--bg-elevated)"><small style="color:var(--text-secondary)"><i class="bi bi-chat-square-text me-1" style="color:var(--text-muted)"></i>${rx.notes}</small></div>` : ''}
      <div class="mt-3 d-flex gap-2 align-items-center">
        <button class="btn btn-xs btn-outline-secondary" onclick="window.print()"><i class="bi bi-printer me-1"></i>Print</button>
        <small style="color:var(--text-muted);margin-left:auto">Expires: ${rx.expiresAt ? new Date(rx.expiresAt).toLocaleDateString('en-IN') : 'N/A'}</small>
      </div>
    </div>`;
  }).join('');
}

// ─── Notifications Page ────────────────────────────────────────────
const localNotifications = [];

function pushNotification(title, body, type='info') {
  localNotifications.unshift({ title, body, type, time: new Date(), read: false });
  const badge = document.getElementById('notifBadge');
  const topBadge = document.getElementById('topbarMsgBadge');
  const unread = localNotifications.filter(n => !n.read).length;
  if (badge) { badge.textContent = unread; badge.classList.toggle('d-none', unread === 0); }
  showToast(title, body);
}

function loadNotifications() {
  const notifList = document.getElementById('notifList');
  const countText = document.getElementById('notifCountText');
  if (!notifList) return;
  const iconMap = { info:'bell', success:'check-circle', warning:'exclamation-triangle', danger:'x-circle' };

  // Seed sample notifications if empty
  if (!localNotifications.length) {
    localNotifications.push(
      { title:'Appointment Confirmed', body:'Your General Medicine consultation is confirmed for tomorrow at 10:00 AM.', type:'success', time: new Date(Date.now()-3600000), read:false },
      { title:'Vital Alert', body:'Your blood pressure reading of 185/110 was above normal range. Consider resting.', type:'warning', time: new Date(Date.now()-7200000), read:true },
      { title:'New Prescription', body:'Dr. Priya Sharma has issued a new prescription for you.', type:'info', time: new Date(Date.now()-86400000), read:true },
      { title:'Emergency Resolved', body:'Your emergency alert from yesterday has been marked resolved.', type:'success', time: new Date(Date.now()-172800000), read:true }
    );
  }

  const unread = localNotifications.filter(n => !n.read).length;
  if (countText) countText.textContent = `${unread} unread notification${unread !== 1 ? 's' : ''}`;

  // Update badge
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.textContent = unread; badge.classList.toggle('d-none', unread === 0); }

  notifList.innerHTML = localNotifications.length === 0
    ? `<div class="dash-card text-center py-5"><i class="bi bi-bell-slash fs-1" style="color:var(--text-muted)"></i><p style="color:var(--text-secondary);margin-top:12px">No notifications yet.</p></div>`
    : localNotifications.map((n, i) => `
      <div class="dash-card mb-2 d-flex align-items-start gap-3" style="cursor:pointer;opacity:${n.read ? '0.65' : '1'}" onclick="readNotif(${i})">
        <div class="notif-icon notif-${n.type}"><i class="bi bi-${iconMap[n.type] || 'bell'}"></i></div>
        <div style="flex:1">
          <div class="d-flex justify-content-between align-items-start">
            <span class="fw-600" style="color:${n.read ? 'var(--text-primary)' : 'var(--accent)'}">${n.title}</span>
            <small style="color:var(--text-muted);margin-left:8px;white-space:nowrap">${timeAgo(n.time)}</small>
          </div>
          <p style="color:var(--text-secondary);font-size:0.83rem;margin:4px 0 0">${n.body}</p>
        </div>
        ${!n.read ? '<span class="notif-dot"></span>' : ''}
      </div>`).join('');
}

function readNotif(i) {
  if (localNotifications[i]) { localNotifications[i].read = true; }
  loadNotifications();
}

function markAllRead() {
  localNotifications.forEach(n => n.read = true);
  loadNotifications();
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

// ─── Export Health Record ─────────────────────────────────────────
function exportHealthRecord() {
  const user = currentUser || JSON.parse(localStorage.getItem('hc_user') || '{}');
  const name = user.fullName || 'Patient';
  const date = new Date().toLocaleDateString('en-IN');
  const content = `HEALTH CONNECT — HEALTH RECORD EXPORT\n${'='.repeat(50)}\nPatient: ${name}\nExported: ${date}\nBlood Group: ${user.bloodGroup || 'Unknown'}\n\nThis is a summary export. Please visit your dashboard for full records.\n\nContact: 1800-HC-HELP`;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `HealthRecord_${name.replace(/ /g,'_')}_${Date.now()}.txt`;
  a.click();
  showToast('Export Ready ✅', 'Your health record has been downloaded.');
}

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
document.addEventListener('DOMContentLoaded', async () => {
  updateDateTime();
  setInterval(updateDateTime, 60000);
  initHRChart();
  initDashScore();
  renderVitalsLog();
  await loadCurrentUser();
  await loadOverviewAppointments();
  try {
    const socket = io('https://healthconnect-kon9.onrender.com', { transports:['websocket','polling'] });
    socket.on('connect', () => {
      if (currentUser) socket.emit('user:join', currentUser._id);
    });
    socket.on('alert:critical', () => showToast('🚨 Critical Alert', 'A critical vital reading was detected.'));
    socket.on('connect_error', e => console.warn('Socket:', e.message));
  } catch (e) { console.warn('Socket.IO:', e.message); }
});
