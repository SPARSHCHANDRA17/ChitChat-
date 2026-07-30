const express = require('express'); 
const cors = require('cors'); 
const app = express(); 

const authRouter = require('./controllers/authController'); 
const userRouter = require('./controllers/userController'); 
const chatRouter = require('./controllers/chatController'); 
const messageRouter = require('./controllers/messageController'); 
const { suggestReply } = require('./controllers/aiController'); 
const authMiddleware = require('./middlewares/authMiddleware'); 

// FIXED CORS: Added all matching dev and production addresses
const allowedOrigins = [
  'http://localhost:3000',
  'https://chit-chat-jocc-qfwso7je0-sparsh-s-projects4.vercel.app/login'
];
app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] 
})); 

app.use(express.json({ limit: "50mb" })); 

const server = require('http').createServer(app); 

const io = require('socket.io')(server, { 
  cors: { 
    origin: allowedOrigins, 
    methods: ['GET', 'POST'], 
    credentials: true 
  } 
}); 

// Server endpoints
app.use('/api/auth', authRouter); 
app.use('/api/user', userRouter); 
app.use('/api/chat', chatRouter); 
app.use('/api/message', messageRouter); 
app.post('/api/ai/suggest-reply', authMiddleware, suggestReply); 

const onlineUser = []; 

// FIXED LIVE WEB-SOCKET ROOM LOGIC
io.on('connection', socket => { 
  socket.on('join-room', userid => { 
    socket.join(userid); 
  }); 
  
  socket.on('send-message', (message) => {
    if (message && message.members) {
      message.members.forEach(member => {
        // Safe check if member is an object containing an id or a raw string
        const targetRoom = member._id ? member._id : member;
        io.to(targetRoom).emit('receive-message', message); 
        io.to(targetRoom).emit('set-message-count', message); 
      });
    }
  }); 
  
  socket.on('clear-unread-messages', data => { 
    if (data && data.members) {
      data.members.forEach(member => {
        const targetRoom = member._id ? member._id : member;
        io.to(targetRoom).emit('message-count-cleared', data);
      });
    }
  }); 
  
  socket.on('user-typing', (data) => { 
    if (data && data.members) {
      data.members.forEach(member => {
        const targetRoom = member._id ? member._id : member;
        io.to(targetRoom).emit('started-typing', data);
      });
    }
  }); 

  socket.on('user-login', userId => { 
    if(!onlineUser.includes(userId)){ 
      onlineUser.push(userId); 
    } 
    io.emit('online-users', onlineUser); 
  }); 
  
  socket.on('user-offline', userId => { 
    if (onlineUser.includes(userId)) { 
      onlineUser.splice(onlineUser.indexOf(userId), 1); 
    } 
    io.emit('online-users-updated', onlineUser); 
  }); 
}); 

module.exports = server;
