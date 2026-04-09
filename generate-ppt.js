const pptxgen = require("pptxgenjs");

const pres = new pptxgen();

// ── Presentation metadata ──
pres.author = "Health Connect Team";
pres.title = "Health Connect – 24/7 Medical Support Platform";
pres.subject = "Project Presentation";
pres.company = "Health Connect";
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

// ─── Color Palette ─────────────────────────────────
const C = {
  bg:       "0A0E1A",
  bgCard:   "111827",
  accent:   "00D4AA",
  accentDk: "00B894",
  danger:   "FF4757",
  warning:  "F59E0B",
  info:     "1E90FF",
  purple:   "A855F7",
  text:     "F0F4FF",
  textSec:  "8896B3",
  white:    "FFFFFF",
  border:   "1E293B",
  gradient1:"0D1B2A",
  gradient2:"132B43",
};

// ─── Helper: add styled background ──────────────────
function addBg(slide, color = C.bg) {
  slide.background = { color };
}

function addFooter(slide, pageNum, total) {
  slide.addText(`Health Connect  •  ${pageNum}/${total}`, {
    x: 0, y: 6.9, w: "100%", h: 0.4,
    fontSize: 8, color: C.textSec, align: "center",
    fontFace: "Segoe UI",
  });
}

function addDecoLine(slide) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0.6, y: 1.65, w: 0.8, h: 0.05,
    fill: { color: C.accent },
    rectRadius: 0.025,
  });
}

const TOTAL = 14;

// ═══════════════════════════════════════════════════════
// SLIDE 1 — Title Slide
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.gradient1);

  // Decorative circle top-right
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.5, y: -1.5, w: 4, h: 4,
    fill: { color: C.accent, transparency: 92 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: -1.5, y: 4.5, w: 5, h: 5,
    fill: { color: C.info, transparency: 95 },
  });

  // Accent bar
  s.addShape(pres.ShapeType.rect, {
    x: 1, y: 2.6, w: 1.2, h: 0.06,
    fill: { color: C.accent },
    rectRadius: 0.03,
  });

  s.addText("🏥", { x: 1, y: 1.5, w: 1.5, h: 1, fontSize: 48, fontFace: "Segoe UI Emoji" });

  s.addText("Health Connect", {
    x: 1, y: 2.8, w: 10, h: 1.2,
    fontSize: 48, bold: true, color: C.white,
    fontFace: "Segoe UI",
  });

  s.addText("24/7 Medical Support Platform", {
    x: 1, y: 3.8, w: 10, h: 0.7,
    fontSize: 22, color: C.accent,
    fontFace: "Segoe UI Light",
  });

  s.addText("Real-time body monitoring  •  Instant doctor access  •  Automatic emergency response", {
    x: 1, y: 4.6, w: 10, h: 0.6,
    fontSize: 13, color: C.textSec,
    fontFace: "Segoe UI",
  });

  // Stats row
  const stats = [
    { val: "50K+", lbl: "Active Patients" },
    { val: "500+", lbl: "Expert Doctors" },
    { val: "99.9%", lbl: "Uptime" },
  ];
  stats.forEach((st, i) => {
    const xPos = 1 + i * 3;
    s.addText(st.val, { x: xPos, y: 5.6, w: 2.5, h: 0.6, fontSize: 28, bold: true, color: C.accent, fontFace: "Segoe UI" });
    s.addText(st.lbl, { x: xPos, y: 6.1, w: 2.5, h: 0.4, fontSize: 11, color: C.textSec, fontFace: "Segoe UI" });
  });

  addFooter(s, 1, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 2 — Problem Statement
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("The Problem", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const problems = [
    { icon: "⏰", title: "Delayed Medical Access", desc: "Patients struggle to reach doctors quickly, especially during off-hours and emergencies." },
    { icon: "📊", title: "No Continuous Monitoring", desc: "Vital signs are only checked during visits — critical changes between appointments go unnoticed." },
    { icon: "🚑", title: "Slow Emergency Response", desc: "Manual emergency calls waste precious minutes when every second counts." },
    { icon: "📋", title: "Fragmented Health Records", desc: "Health data is scattered across facilities, making holistic care difficult." },
  ];

  problems.forEach((p, i) => {
    const yPos = 2 + i * 1.25;
    // Card background
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yPos, w: 11.5, h: 1.05,
      fill: { color: C.bgCard },
      rectRadius: 0.12,
      line: { color: C.border, width: 0.5 },
    });
    s.addText(p.icon, { x: 1, y: yPos + 0.08, w: 0.8, h: 0.8, fontSize: 28, fontFace: "Segoe UI Emoji" });
    s.addText(p.title, { x: 1.9, y: yPos + 0.05, w: 9, h: 0.45, fontSize: 16, bold: true, color: C.white, fontFace: "Segoe UI" });
    s.addText(p.desc, { x: 1.9, y: yPos + 0.48, w: 9, h: 0.45, fontSize: 11, color: C.textSec, fontFace: "Segoe UI" });
  });

  addFooter(s, 2, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 3 — Our Solution
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Our Solution", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  s.addText("Health Connect is an all-in-one intelligent healthcare platform that provides real-time monitoring, instant doctor access, and automatic emergency response — accessible 24/7 from any device.", {
    x: 0.8, y: 1.9, w: 11.5, h: 0.9,
    fontSize: 14, color: C.textSec, fontFace: "Segoe UI",
    lineSpacingMultiple: 1.3,
  });

  const features = [
    { icon: "🩺", title: "24/7 Doctor Support", desc: "Video, chat, and in-person consultations with certified physicians available around the clock.", color: "22C55E" },
    { icon: "💓", title: "Real-time Body Monitoring", desc: "Track heart rate, SpO₂, temperature, BP, glucose, and respiration with live dashboards.", color: C.danger },
    { icon: "🚨", title: "Auto Emergency Response", desc: "Detects critical vitals and auto-alerts ambulance, emergency contacts, and on-call doctors.", color: C.warning },
    { icon: "🤖", title: "AI Health Insights", desc: "Smart analytics detect patterns and anomalies for proactive health recommendations.", color: C.purple },
  ];

  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const xPos = 0.8 + col * 6.2;
    const yPos = 3.1 + row * 2;

    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: yPos, w: 5.8, h: 1.7,
      fill: { color: C.bgCard },
      rectRadius: 0.12,
      line: { color: C.border, width: 0.5 },
    });
    // Accent top line
    s.addShape(pres.ShapeType.rect, {
      x: xPos + 0.3, y: yPos, w: 0.6, h: 0.04,
      fill: { color: f.color },
    });
    s.addText(f.icon, { x: xPos + 0.2, y: yPos + 0.2, w: 0.8, h: 0.8, fontSize: 28, fontFace: "Segoe UI Emoji" });
    s.addText(f.title, { x: xPos + 1.1, y: yPos + 0.2, w: 4.2, h: 0.45, fontSize: 15, bold: true, color: C.white, fontFace: "Segoe UI" });
    s.addText(f.desc, { x: xPos + 1.1, y: yPos + 0.7, w: 4.2, h: 0.8, fontSize: 10.5, color: C.textSec, fontFace: "Segoe UI", lineSpacingMultiple: 1.3 });
  });

  addFooter(s, 3, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 4 — Tech Stack
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Technology Stack", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const stack = [
    { layer: "Frontend",  tech: "HTML5, CSS3, Bootstrap 5, JavaScript (ES6+), Chart.js",       color: C.info,    icon: "🖥️"  },
    { layer: "Backend",   tech: "Node.js, Express.js, Socket.IO",                               color: "22C55E",  icon: "⚙️"  },
    { layer: "Database",  tech: "MongoDB with Mongoose ODM",                                    color: C.warning, icon: "🗄️"  },
    { layer: "Real-time", tech: "Socket.IO for live vitals and emergency alerts",               color: C.purple,  icon: "⚡"  },
    { layer: "Auth",      tech: "JWT (JSON Web Tokens) + bcryptjs password hashing",            color: C.danger,  icon: "🔐"  },
    { layer: "Tooling",   tech: "Morgan logging, CORS, express-validator, Nodemailer, dotenv",  color: C.accent,  icon: "🛠️"  },
  ];

  stack.forEach((item, i) => {
    const yPos = 2 + i * 0.9;
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yPos, w: 11.5, h: 0.75,
      fill: { color: C.bgCard },
      rectRadius: 0.1,
      line: { color: C.border, width: 0.5 },
    });
    // Color accent
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yPos, w: 0.06, h: 0.75,
      fill: { color: item.color },
      rectRadius: 0.03,
    });
    s.addText(item.icon, { x: 1.1, y: yPos + 0.05, w: 0.6, h: 0.6, fontSize: 20, fontFace: "Segoe UI Emoji" });
    s.addText(item.layer, { x: 1.8, y: yPos + 0.05, w: 2, h: 0.65, fontSize: 14, bold: true, color: C.white, fontFace: "Segoe UI", valign: "middle" });
    s.addText(item.tech, { x: 3.8, y: yPos + 0.05, w: 8, h: 0.65, fontSize: 12, color: C.textSec, fontFace: "Segoe UI", valign: "middle" });
  });

  addFooter(s, 4, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 5 — System Architecture
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("System Architecture", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  // Three-tier architecture boxes
  const tiers = [
    {
      title: "Frontend (Client)",
      items: ["index.html — Landing Page", "dashboard.html — Patient Dashboard", "app.js — Landing Logic", "dashboard.js — Dashboard Logic", "style.css — Custom Styles", "Chart.js — Data Visualization"],
      color: C.info,
      x: 0.4,
    },
    {
      title: "Backend (Server)",
      items: ["server.js — Express + Socket.IO", "routes/auth.js — Authentication", "routes/health.js — Vitals API", "routes/appointments.js", "routes/emergency.js", "routes/chat.js & prescriptions.js"],
      color: "22C55E",
      x: 4.7,
    },
    {
      title: "Database & Services",
      items: ["MongoDB (Mongoose ODM)", "User Model", "HealthData Model", "Appointment Model", "EmergencyAlert Model", "Prescription Model"],
      color: C.warning,
      x: 9,
    },
  ];

  tiers.forEach((tier) => {
    // Header
    s.addShape(pres.ShapeType.rect, {
      x: tier.x, y: 2.0, w: 4, h: 0.55,
      fill: { color: tier.color },
      rectRadius: 0.08,
    });
    s.addText(tier.title, {
      x: tier.x, y: 2.0, w: 4, h: 0.55,
      fontSize: 13, bold: true, color: C.bg, align: "center", fontFace: "Segoe UI",
    });

    // Body
    s.addShape(pres.ShapeType.rect, {
      x: tier.x, y: 2.55, w: 4, h: 4,
      fill: { color: C.bgCard },
      rectRadius: 0.08,
      line: { color: C.border, width: 0.5 },
    });

    tier.items.forEach((item, j) => {
      s.addText(`▸  ${item}`, {
        x: tier.x + 0.2, y: 2.7 + j * 0.55, w: 3.6, h: 0.5,
        fontSize: 10.5, color: C.textSec, fontFace: "Segoe UI",
        valign: "middle",
      });
    });
  });

  // Arrows between tiers
  s.addText("◀─── REST API / Socket.IO ───▶", {
    x: 3.2, y: 6.7, w: 7, h: 0.4,
    fontSize: 10, color: C.accent, align: "center", fontFace: "Segoe UI", italic: true,
  });

  addFooter(s, 5, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 6 — Project Structure
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Project Structure", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const structure = [
    "healthconnect/",
    "├── server.js                    Main Express + Socket.IO server",
    "├── package.json               Dependencies & scripts",
    "├── .env                           Environment variables",
    "├── config/",
    "│   └── database.js            MongoDB connection config",
    "├── models/",
    "│   ├── User.js                   User/patient schema",
    "│   ├── HealthData.js          Vitals data schema",
    "│   ├── Appointment.js       Appointment schema",
    "│   ├── EmergencyAlert.js   Emergency alert schema",
    "│   └── Prescription.js        Prescription schema",
    "├── routes/",
    "│   ├── auth.js                    Register, Login, Profile",
    "│   ├── health.js                 Submit & retrieve vitals",
    "│   ├── appointments.js     Book & manage appointments",
    "│   ├── emergency.js          Trigger & track emergencies",
    "│   ├── chat.js                     AI-powered chat",
    "│   └── prescriptions.js      Manage prescriptions",
    "└── public/",
    "    ├── index.html               Landing page",
    "    ├── dashboard.html        Patient dashboard",
    "    ├── css/style.css            Custom styles",
    "    └── js/",
    "        ├── app.js                  Landing page JS",
    "        └── dashboard.js       Dashboard JS",
  ];

  s.addShape(pres.ShapeType.rect, {
    x: 0.6, y: 1.85, w: 12, h: 5.2,
    fill: { color: C.bgCard },
    rectRadius: 0.12,
    line: { color: C.border, width: 0.5 },
  });

  structure.forEach((line, i) => {
    const isDir = line.includes("/") && !line.includes(".");
    s.addText(line, {
      x: 0.9, y: 1.95 + i * 0.195, w: 11, h: 0.19,
      fontSize: 9.5, fontFace: "Consolas",
      color: isDir ? C.accent : C.textSec,
    });
  });

  addFooter(s, 6, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 7 — API Endpoints
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("API Endpoints", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const endpoints = [
    { cat: "Authentication", color: C.info, routes: [
      { method: "POST", path: "/api/auth/register", desc: "Create new user account" },
      { method: "POST", path: "/api/auth/login", desc: "Login & get JWT token" },
      { method: "GET",  path: "/api/auth/me", desc: "Get current user profile" },
    ]},
    { cat: "Health Monitoring", color: "22C55E", routes: [
      { method: "POST", path: "/api/health/vitals", desc: "Submit health readings" },
      { method: "GET",  path: "/api/health/vitals", desc: "Get historical readings" },
      { method: "GET",  path: "/api/health/latest", desc: "Get latest reading" },
    ]},
    { cat: "Appointments", color: C.warning, routes: [
      { method: "POST", path: "/api/appointments", desc: "Book an appointment" },
      { method: "GET",  path: "/api/appointments", desc: "Get user appointments" },
      { method: "PUT",  path: "/api/appointments/:id/cancel", desc: "Cancel appointment" },
    ]},
    { cat: "Emergency", color: C.danger, routes: [
      { method: "POST", path: "/api/emergency/alert", desc: "Trigger emergency alert" },
      { method: "GET",  path: "/api/emergency/history", desc: "Get alert history" },
      { method: "PUT",  path: "/api/emergency/:id/resolve", desc: "Resolve an alert" },
    ]},
  ];

  let yOff = 1.85;
  endpoints.forEach((group) => {
    // Category header
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yOff, w: 11.5, h: 0.35,
      fill: { color: group.color, transparency: 85 },
      rectRadius: 0.06,
    });
    s.addText(group.cat, {
      x: 1, y: yOff, w: 10, h: 0.35,
      fontSize: 11, bold: true, color: group.color, fontFace: "Segoe UI",
    });
    yOff += 0.4;

    group.routes.forEach((r) => {
      const methodColor = { POST: C.accent, GET: C.info, PUT: C.warning, DELETE: C.danger }[r.method] || C.textSec;
      s.addText(r.method, { x: 1, y: yOff, w: 0.7, h: 0.3, fontSize: 9, bold: true, color: methodColor, fontFace: "Consolas" });
      s.addText(r.path, { x: 1.7, y: yOff, w: 4, h: 0.3, fontSize: 9, color: C.text, fontFace: "Consolas" });
      s.addText(r.desc, { x: 6, y: yOff, w: 6, h: 0.3, fontSize: 9, color: C.textSec, fontFace: "Segoe UI" });
      yOff += 0.3;
    });
    yOff += 0.15;
  });

  addFooter(s, 7, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 8 — Database Models
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Database Models", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const models = [
    {
      name: "User", icon: "👤", color: C.info,
      fields: ["fullName, email, phone", "password (bcrypt hashed)", "bloodGroup, dateOfBirth", "role (patient/doctor/admin)", "emergencyContact {name, phone, relation}"],
    },
    {
      name: "HealthData", icon: "💓", color: C.danger,
      fields: ["userId (ref: User)", "heartRate, oxygenSaturation", "temperature, bloodPressure", "bloodGlucose, respiratoryRate", "weight, timestamp"],
    },
    {
      name: "Appointment", icon: "📅", color: "22C55E",
      fields: ["userId (ref: User)", "doctorName, specialty", "type (video/chat/in-person)", "scheduledAt, status", "symptoms"],
    },
    {
      name: "EmergencyAlert", icon: "🚨", color: C.warning,
      fields: ["userId (ref: User)", "type, severity", "triggeredBy (auto/manual)", "location {lat, lng}", "status, resolvedAt"],
    },
    {
      name: "Prescription", icon: "💊", color: C.purple,
      fields: ["userId (ref: User)", "medication, dosage", "frequency, duration", "prescribedBy, notes", "isActive, createdAt"],
    },
  ];

  models.forEach((m, i) => {
    const xPos = 0.4 + (i % 5) * 2.55;
    const yPos = 2.0;

    // Header
    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: yPos, w: 2.35, h: 0.5,
      fill: { color: m.color },
      rectRadius: 0.08,
    });
    s.addText(`${m.icon} ${m.name}`, {
      x: xPos, y: yPos, w: 2.35, h: 0.5,
      fontSize: 11, bold: true, color: C.bg, align: "center", fontFace: "Segoe UI",
    });

    // Body
    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: yPos + 0.5, w: 2.35, h: 3.5,
      fill: { color: C.bgCard },
      rectRadius: 0.08,
      line: { color: C.border, width: 0.5 },
    });

    m.fields.forEach((field, j) => {
      s.addText(`•  ${field}`, {
        x: xPos + 0.1, y: yPos + 0.7 + j * 0.6, w: 2.15, h: 0.5,
        fontSize: 8.5, color: C.textSec, fontFace: "Segoe UI",
        lineSpacingMultiple: 1.15,
      });
    });
  });

  addFooter(s, 8, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 9 — Authentication & Security
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Authentication & Security", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  // Auth flow
  const flow = [
    { step: "1", title: "Registration", desc: "User submits fullName, email, phone, password.\nPassword hashed with bcryptjs (12 salt rounds).\nJWT token generated and returned.", color: C.info },
    { step: "2", title: "Login", desc: "User provides email + password + role.\nDoctor login requires Medical Licence No.\nAdmin login requires Access Code.", color: "22C55E" },
    { step: "3", title: "JWT Auth", desc: "Token stored in localStorage.\nSent via Authorization: Bearer header.\nAll protected routes validate token.", color: C.warning },
    { step: "4", title: "Role-Based Access", desc: "Three roles: Patient, Doctor, Admin.\nEach role has dedicated dashboard.\nRole-specific API authorization.", color: C.purple },
  ];

  flow.forEach((f, i) => {
    const xPos = 0.5 + i * 3.15;
    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: 2, w: 2.9, h: 3.5,
      fill: { color: C.bgCard },
      rectRadius: 0.12,
      line: { color: C.border, width: 0.5 },
    });
    // Step number circle
    s.addShape(pres.ShapeType.ellipse, {
      x: xPos + 1.1, y: 2.15, w: 0.6, h: 0.6,
      fill: { color: f.color },
    });
    s.addText(f.step, {
      x: xPos + 1.1, y: 2.15, w: 0.6, h: 0.6,
      fontSize: 16, bold: true, color: C.bg, align: "center", fontFace: "Segoe UI",
    });
    s.addText(f.title, {
      x: xPos + 0.2, y: 2.9, w: 2.5, h: 0.4,
      fontSize: 14, bold: true, color: C.white, align: "center", fontFace: "Segoe UI",
    });
    s.addText(f.desc, {
      x: xPos + 0.2, y: 3.35, w: 2.5, h: 2,
      fontSize: 10, color: C.textSec, align: "center", fontFace: "Segoe UI",
      lineSpacingMultiple: 1.5,
    });
  });

  // Security features at bottom
  const secFeats = [
    "🔒 bcryptjs password hashing",
    "🛡️ JWT token authentication",
    "✅ express-validator input validation",
    "🌐 CORS enabled",
    "🔑 Environment variables for secrets",
  ];
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 5.8, w: 12.3, h: 0.7,
    fill: { color: C.bgCard },
    rectRadius: 0.1,
    line: { color: C.accent, width: 0.5 },
  });
  secFeats.forEach((feat, i) => {
    s.addText(feat, {
      x: 0.5 + i * 2.5, y: 5.85, w: 2.4, h: 0.6,
      fontSize: 9, color: C.accent, align: "center", fontFace: "Segoe UI",
    });
  });

  addFooter(s, 9, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 10 — Real-time Features (Socket.IO)
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Real-Time Features", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  s.addText("Powered by Socket.IO for instant bidirectional communication", {
    x: 0.8, y: 1.8, w: 11, h: 0.5,
    fontSize: 14, color: C.textSec, fontFace: "Segoe UI", italic: true,
  });

  const events = [
    { event: "user:join", dir: "Client → Server", desc: "User connects and joins their personal room for targeted notifications.", color: C.info },
    { event: "vitals:update", dir: "Client → Server", desc: "Sends live vital readings. If critical, server broadcasts emergency alert to all clients.", color: C.accent },
    { event: "alert:critical", dir: "Server → All Clients", desc: "Broadcasts critical vital alert with userId, vitals data, and timestamp.", color: C.danger },
    { event: "emergency:triggered", dir: "Client → Server", desc: "Manual or auto SOS trigger. Server broadcasts to all connected medical staff.", color: C.warning },
    { event: "vitals:confirmed", dir: "Server → Client", desc: "Acknowledges successful receipt of vitals data from the client.", color: "22C55E" },
  ];

  events.forEach((e, i) => {
    const yPos = 2.5 + i * 0.95;
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yPos, w: 11.5, h: 0.8,
      fill: { color: C.bgCard },
      rectRadius: 0.1,
      line: { color: C.border, width: 0.5 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yPos, w: 0.06, h: 0.8,
      fill: { color: e.color },
    });
    s.addText(e.event, { x: 1.1, y: yPos + 0.05, w: 2.5, h: 0.35, fontSize: 11, bold: true, color: e.color, fontFace: "Consolas" });
    s.addText(e.dir, { x: 1.1, y: yPos + 0.4, w: 2.5, h: 0.3, fontSize: 9, color: C.textSec, fontFace: "Segoe UI", italic: true });
    s.addText(e.desc, { x: 3.8, y: yPos + 0.1, w: 8, h: 0.6, fontSize: 11, color: C.textSec, fontFace: "Segoe UI", valign: "middle" });
  });

  addFooter(s, 10, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 11 — Emergency Response Flow
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Emergency Response Flow", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const flow = [
    { icon: "⚠️", title: "Critical Vital Detected", desc: "Heart rate > 140, SpO₂ < 90%,\nor manual SOS trigger", color: C.danger },
    { icon: "📡", title: "Alert Created", desc: "EmergencyAlert saved to MongoDB\nwith location, severity, timestamp", color: C.warning },
    { icon: "📢", title: "Socket.IO Broadcast", desc: "Real-time alert sent to all\nconnected clients instantly", color: C.info },
    { icon: "🚑", title: "Services Notified", desc: "Ambulance (108), Emergency (112),\nOn-call doctor alerted", color: "22C55E" },
    { icon: "📱", title: "Contacts Alerted", desc: "SMS/Call to emergency contacts\nwith location & vital data", color: C.purple },
  ];

  flow.forEach((f, i) => {
    const xPos = 0.4 + i * 2.55;
    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: 2.2, w: 2.35, h: 3.2,
      fill: { color: C.bgCard },
      rectRadius: 0.12,
      line: { color: f.color, width: 1 },
    });
    s.addText(f.icon, { x: xPos, y: 2.35, w: 2.35, h: 0.7, fontSize: 32, align: "center", fontFace: "Segoe UI Emoji" });
    s.addText(f.title, { x: xPos + 0.1, y: 3.1, w: 2.15, h: 0.5, fontSize: 12, bold: true, color: C.white, align: "center", fontFace: "Segoe UI" });
    s.addText(f.desc, { x: xPos + 0.1, y: 3.65, w: 2.15, h: 1.5, fontSize: 10, color: C.textSec, align: "center", fontFace: "Segoe UI", lineSpacingMultiple: 1.4 });

    // Arrow between boxes
    if (i < flow.length - 1) {
      s.addText("→", { x: xPos + 2.25, y: 3.3, w: 0.4, h: 0.5, fontSize: 20, color: C.accent, align: "center", fontFace: "Segoe UI" });
    }
  });

  // Emergency numbers bar
  const nums = [
    { label: "Ambulance", num: "108", color: C.danger },
    { label: "Emergency", num: "112", color: C.warning },
    { label: "Police", num: "100", color: C.info },
    { label: "Health Connect", num: "1800-HC-HELP", color: C.accent },
  ];
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 5.8, w: 12.3, h: 0.8,
    fill: { color: C.bgCard },
    rectRadius: 0.1,
    line: { color: C.danger, width: 0.5 },
  });
  nums.forEach((n, i) => {
    s.addText(`${n.label}: ${n.num}`, {
      x: 0.5 + i * 3.1, y: 5.85, w: 3, h: 0.7,
      fontSize: 12, bold: true, color: n.color, align: "center", fontFace: "Segoe UI",
    });
  });

  addFooter(s, 11, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 12 — Dashboard Features
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("Dashboard Features", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const pages = [
    { icon: "📊", title: "Overview", desc: "Health score, HR chart, upcoming appointments, medication schedule" },
    { icon: "💓", title: "Live Vitals", desc: "Real-time monitoring with auto/manual logging and alert banners" },
    { icon: "📅", title: "Appointments", desc: "Book, view, cancel appointments with video call integration" },
    { icon: "📋", title: "Reports", desc: "7-day health summaries with downloadable PDF reports" },
    { icon: "💊", title: "Medications", desc: "Track medications, mark taken, manage schedules" },
    { icon: "📝", title: "Prescriptions", desc: "View prescriptions from doctors, dosage & duration" },
    { icon: "🩺", title: "Doctors", desc: "Browse doctors by specialty, check availability, consult now" },
    { icon: "💬", title: "Chat", desc: "AI-powered contextual health chat with conversation history" },
    { icon: "🔔", title: "Notifications", desc: "Vital alerts, appointment reminders, medication schedules" },
    { icon: "📹", title: "Video Calls", desc: "Draggable, resizable video window with in-call chat" },
    { icon: "👤", title: "Profile", desc: "View and update personal info, emergency contacts" },
    { icon: "⚙️", title: "Settings", desc: "Preferences, notification toggles, account management" },
  ];

  pages.forEach((p, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const xPos = 0.5 + col * 3.15;
    const yPos = 1.9 + row * 1.7;

    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: yPos, w: 2.95, h: 1.45,
      fill: { color: C.bgCard },
      rectRadius: 0.1,
      line: { color: C.border, width: 0.5 },
    });
    s.addText(p.icon, { x: xPos + 0.15, y: yPos + 0.1, w: 0.5, h: 0.5, fontSize: 20, fontFace: "Segoe UI Emoji" });
    s.addText(p.title, { x: xPos + 0.65, y: yPos + 0.1, w: 2.1, h: 0.4, fontSize: 13, bold: true, color: C.white, fontFace: "Segoe UI" });
    s.addText(p.desc, { x: xPos + 0.15, y: yPos + 0.6, w: 2.65, h: 0.75, fontSize: 9.5, color: C.textSec, fontFace: "Segoe UI", lineSpacingMultiple: 1.25 });
  });

  addFooter(s, 12, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 13 — How It Works
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.bg);

  s.addText("How It Works", {
    x: 0.6, y: 0.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: C.white, fontFace: "Segoe UI",
  });
  addDecoLine(s);

  const steps = [
    {
      num: "01", title: "Create Your Profile",
      desc: "Sign up with your health details, medical history, and emergency contacts in under 2 minutes. Supports patient, doctor, and admin roles.",
      icon: "👤", color: C.info,
    },
    {
      num: "02", title: "Connect Your Device",
      desc: "Sync your wearable or manually input vitals. We support all major health monitoring devices. Real-time data streams via Socket.IO.",
      icon: "⌚", color: C.accent,
    },
    {
      num: "03", title: "Stay Protected 24/7",
      desc: "Our system monitors continuously. Critical vital changes trigger automatic emergency alerts, doctor notifications, and ambulance dispatch.",
      icon: "🛡️", color: "22C55E",
    },
  ];

  steps.forEach((step, i) => {
    const xPos = 0.5 + i * 4.2;

    s.addShape(pres.ShapeType.rect, {
      x: xPos, y: 2.2, w: 3.9, h: 4.2,
      fill: { color: C.bgCard },
      rectRadius: 0.15,
      line: { color: C.border, width: 0.5 },
    });

    // Step number
    s.addText(step.num, {
      x: xPos + 0.3, y: 2.4, w: 1.2, h: 0.8,
      fontSize: 36, bold: true, color: step.color, fontFace: "Segoe UI",
      transparency: 30,
    });

    s.addText(step.icon, {
      x: xPos + 0.3, y: 3.2, w: 3.3, h: 1,
      fontSize: 42, align: "center", fontFace: "Segoe UI Emoji",
    });

    s.addText(step.title, {
      x: xPos + 0.3, y: 4.3, w: 3.3, h: 0.5,
      fontSize: 16, bold: true, color: C.white, align: "center", fontFace: "Segoe UI",
    });

    s.addText(step.desc, {
      x: xPos + 0.3, y: 4.8, w: 3.3, h: 1.4,
      fontSize: 10.5, color: C.textSec, align: "center", fontFace: "Segoe UI",
      lineSpacingMultiple: 1.4,
    });
  });

  addFooter(s, 13, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// SLIDE 14 — Thank You / Contact
// ═══════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  addBg(s, C.gradient1);

  // Decorative
  s.addShape(pres.ShapeType.ellipse, {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: C.accent, transparency: 94 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10, y: 4, w: 5, h: 5,
    fill: { color: C.info, transparency: 94 },
  });

  s.addText("🏥", { x: 0, y: 1.5, w: "100%", h: 1, fontSize: 48, align: "center", fontFace: "Segoe UI Emoji" });

  s.addText("Thank You!", {
    x: 0, y: 2.5, w: "100%", h: 1.2,
    fontSize: 52, bold: true, color: C.white, align: "center", fontFace: "Segoe UI",
  });

  s.addShape(pres.ShapeType.rect, {
    x: 5.9, y: 3.65, w: 1.5, h: 0.06,
    fill: { color: C.accent },
    rectRadius: 0.03,
  });

  s.addText("Health Connect — Your Health, Always Connected", {
    x: 0, y: 3.9, w: "100%", h: 0.6,
    fontSize: 18, color: C.accent, align: "center", fontFace: "Segoe UI",
  });

  s.addText("Built with Node.js  •  Express  •  MongoDB  •  Socket.IO  •  Chart.js", {
    x: 0, y: 4.6, w: "100%", h: 0.5,
    fontSize: 12, color: C.textSec, align: "center", fontFace: "Segoe UI",
  });

  // Contact info box
  s.addShape(pres.ShapeType.rect, {
    x: 3.5, y: 5.3, w: 6.3, h: 1.2,
    fill: { color: C.bgCard },
    rectRadius: 0.12,
    line: { color: C.border, width: 0.5 },
  });

  s.addText("📧  healthconnect@support.com   |   🌐  healthconnect.app   |   📞  1800-HC-HELP", {
    x: 3.5, y: 5.3, w: 6.3, h: 1.2,
    fontSize: 11, color: C.textSec, align: "center", fontFace: "Segoe UI",
  });

  addFooter(s, 14, TOTAL);
})();

// ═══════════════════════════════════════════════════════
// Save the file
// ═══════════════════════════════════════════════════════
const outputPath = "HealthConnect_Presentation.pptx";
pres.writeFile({ fileName: `d:/healthconnect/${outputPath}` })
  .then(() => {
    console.log(`\n✅ Presentation saved: ${outputPath}`);
    console.log(`📄 ${TOTAL} slides generated successfully!`);
    console.log(`📁 Location: d:/healthconnect/${outputPath}\n`);
  })
  .catch(err => console.error("❌ Error:", err));
