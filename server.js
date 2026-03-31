require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

connectDB();

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/health', require('./routes/health'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/chat', require('./routes/chat'));

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'Health Connect API running', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('user:join', (userId) => {
    onlineUsers.set(String(userId), socket.id);
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} online`);
  });

  socket.on('vitals:update', (data) => {
    if (data.status === 'critical') {
      io.emit('alert:critical', { userId: data.userId, vitals: data.vitals, timestamp: new Date() });
    }
    socket.emit('vitals:confirmed', { received: true });
  });

  socket.on('emergency:triggered', (data) => {
    io.emit('emergency:alert', { ...data, timestamp: new Date() });
    console.log(`🚨 Emergency: user ${data.userId}`);
  });

  socket.on('disconnect', () => {
    onlineUsers.forEach((sid, uid) => { if (sid === socket.id) onlineUsers.delete(uid); });
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║    🏥 HEALTH CONNECT SERVER              ║
║    API:      http://localhost:${PORT}/api    ║
║    Frontend: http://localhost:5500       ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
