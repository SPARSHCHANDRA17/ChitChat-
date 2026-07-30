const express = require('express');
const cors = require('cors');
const app = express();

const authRouter = require('./controllers/authController');
const userRouter = require('./controllers/userController');
const chatRouter = require('./controllers/chatController');
const messageRouter = require('./controllers/messageController');
const { suggestReply } = require('./controllers/aiController');
const authMiddleware = require('./middlewares/authMiddleware');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000'
];

const isAllowedOrigin = (origin) => {
  return (
    !origin ||
    allowedOrigins.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));

const server = require('http').createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/message', messageRouter);
app.post('/api/ai/suggest-reply', authMiddleware, suggestReply);

const onlineUser = [];

io.on('connection', socket => {
  socket.on('join-room', userid => {
    socket.join(userid);
  });

  socket.on('send-message', message => {
    if (message && message.members) {
      message.members.forEach(member => {
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

  socket.on('user-typing', data => {
    if (data && data.members) {
      data.members.forEach(member => {
        const targetRoom = member._id ? member._id : member;

        io.to(targetRoom).emit('started-typing', data);
      });
    }
  });

  socket.on('user-login', userId => {
    if (!onlineUser.includes(userId)) {
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