# 🏥 Health Connect

**Your Health, Always Connected** — A 24/7 medical support platform with real-time body monitoring, doctor consultations, and automatic emergency response.

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🩺 **24/7 Doctor Support** | Instant video/chat consultations with certified doctors |
| 💓 **Whole Body Monitoring** | Real-time tracking of heart rate, SpO₂, temperature, BP, glucose |
| 🚨 **Auto Emergency Response** | Detects critical vitals and auto-alerts ambulance + emergency contacts |
| 🤖 **AI Health Insights** | Smart pattern detection with health score tracking |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Bootstrap 5, JavaScript (ES6+), Chart.js |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.IO for live vitals and emergency alerts |
| **Auth** | JWT (JSON Web Tokens) + bcryptjs |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm

### Installation

```bash
# 1. Clone the project
git clone https://github.com/your-org/healthconnect.git
cd healthconnect

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.

# 4. Start MongoDB (if local)
mongod

# 5. Start the server
npm start

# For development with auto-reload:
npm run dev
```

Visit: **http://localhost:3000**

---

## 📁 Project Structure

```
healthconnect/
├── server.js              # Main Express + Socket.IO server
├── config/
│   └── database.js        # MongoDB connection
├── models/
│   ├── User.js            # User/patient model
│   ├── HealthData.js      # Vitals & monitoring data
│   ├── Appointment.js     # Doctor appointments
│   └── EmergencyAlert.js  # Emergency alerts
├── routes/
│   ├── auth.js            # Register, login, profile
│   ├── health.js          # Submit & retrieve vitals
│   ├── appointments.js    # Book & manage appointments
│   └── emergency.js       # Trigger & track emergencies
└── public/
    ├── index.html         # Main frontend page
    ├── css/style.css      # Stylesheet
    └── js/app.js          # Frontend JavaScript
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Health Monitoring
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/health/vitals` | Submit health readings |
| GET | `/api/health/vitals` | Get historical readings |
| GET | `/api/health/latest` | Get latest reading |
| GET | `/api/health/summary` | Get 7-day summary |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/appointments/doctors` | List available doctors |
| POST | `/api/appointments` | Book an appointment |
| GET | `/api/appointments` | Get user's appointments |
| PUT | `/api/appointments/:id/cancel` | Cancel appointment |

### Emergency
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/emergency/alert` | Trigger emergency alert |
| GET | `/api/emergency/history` | Get alert history |
| PUT | `/api/emergency/:id/resolve` | Resolve an alert |

---

## 🚨 Emergency Response Flow

```
Critical Vital Detected
        │
        ▼
Auto-trigger EmergencyAlert (MongoDB)
        │
        ▼
Socket.IO broadcasts to all connected clients
        │
        ├── Notify On-Call Doctor
        ├── SMS Emergency Contact (via Twilio)
        └── Alert Ambulance Services (108/112)
```

---

## 🔒 Security

- JWT authentication on all protected routes
- Passwords hashed with bcryptjs (12 rounds)
- Input validation with express-validator
- CORS enabled
- Environment variables for all secrets

---

## 📱 Emergency Contacts (India)

| Service | Number |
|---|---|
| Ambulance | 108 |
| Emergency Services | 112 |
| Police | 100 |
| Health Connect 24/7 | 1800-HC-HELP |

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ for better healthcare accessibility.
