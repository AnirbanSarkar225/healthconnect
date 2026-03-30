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
const io = new Server(server, { cors: { origin: '*' } });

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/health', require('./routes/health'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/chat', require('./routes/chat'));

// Health Check
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'Health Connect API is running 24/7', timestamp: new Date() });
});

// Serve index.html only for the root — let express.static handle dashboard.html etc.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback for any non-API, non-file route
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO — Real-time
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('user:join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} is online`);
  });

  socket.on('vitals:update', (data) => {
    if (data.status === 'critical') {
      io.emit('alert:critical', { userId: data.userId, vitals: data.vitals, timestamp: new Date() });
    }
    socket.emit('vitals:confirmed', { received: true, timestamp: new Date() });
  });

  socket.on('chat:message', (msg) => {
    // Only emit to sender and recipient, not everyone
    const recipientSocket = onlineUsers.get(msg.to);
    if (recipientSocket) io.to(recipientSocket).emit('chat:message', { ...msg, timestamp: new Date() });
    socket.emit('chat:message', { ...msg, timestamp: new Date() });
  });

  socket.on('emergency:triggered', (data) => {
    io.emit('emergency:alert', { ...data, timestamp: new Date() });
    console.log(`🚨 Emergency triggered by user: ${data.userId}`);
  });

  socket.on('disconnect', () => {
    onlineUsers.forEach((sid, uid) => { if (sid === socket.id) onlineUsers.delete(uid); });
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║    🏥 HEALTH CONNECT SERVER          ║
║    Running on: http://localhost:${PORT}  ║
║    Status: ONLINE 24/7               ║
╚══════════════════════════════════════╝
  `);
});

module.exports = app;
