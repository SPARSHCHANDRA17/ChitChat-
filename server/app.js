const express = require('express'); 
const cors = require('cors'); 
const app = express(); 

const authRouter = require('./controllers/authController'); 
const userRouter = require('./controllers/userController'); 
const chatRouter = require('./controllers/chatController'); 
const messageRouter = require('./controllers/messageController'); 
const { suggestReply } = require('./controllers/aiController'); 
const authMiddleware = require('./middlewares/authMiddleware'); 

// FIXED: Added Port 5000 for local dev and your real Vercel URL for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://chit-chat-ch2it5pta-sparsh-s-projects4.vercel.app',
  'https://chit-chat-app-puce.vercel.app'
]; 

// Configure Express CORS 
app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] 
})); 

app.use(express.json({ limit: "50mb" })); 

const server = require('http').createServer(app); 

// Configure Socket.io CORS with the allowed origins array 
const io = require('socket.io')(server, { 
  cors: { 
    origin: allowedOrigins, 
    methods: ['GET', 'POST'], 
    credentials: true 
  } 
}); 

// Routes 
app.use('/api/auth', authRouter); 
app.use('/api/user', userRouter); 
app.use('/api/chat', chatRouter); 
app.use('/api/message', messageRouter); 

// AI Route 
app.post('/api/ai/suggest-reply', authMiddleware, suggestReply); 

const onlineUser = []; 

// SOCKET CONNECTION 
io.on('connection', socket => { 
  socket.on('join-room', userid => { 
    socket.join(userid); 
  }); 
  
  socket.on('send-message', (message) => { 
    io .to(message.members[0]) .to(message.members[1]) .emit('receive-message', message); 
    io .to(message.members[0]) .to(message.members[1]) .emit('set-message-count', message); 
  }); 
  
  socket.on('clear-unread-messages', data => { 
    io .to(data.members[0]) .to(data.members[1]) .emit('message-count-cleared', data); 
  }); 
  
  socket.on('user-typing', (data) => { 
    io .to(data.members[0]) .to(data.members[1]) .emit('started-typing', data); 
  }); 
  
  socket.on('user-login', userId => { 
    if(!onlineUser.includes(userId)){ 
      onlineUser.push(userId); 
    } 
    socket.emit('online-users', onlineUser); 
  }); 
  
  socket.on('user-offline', userId => { 
    if (onlineUser.includes(userId)) { 
      onlineUser.splice(onlineUser.indexOf(userId), 1); 
    } 
    io.emit('online-users-updated', onlineUser); 
  }); 
}); 

module.exports = server;
