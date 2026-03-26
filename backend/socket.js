const pool = require('./db/config');
let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    // Expected that client will connect and send their userId to join a specific room
    socket.on('join', (userId) => {
      socket.join(userId);
    });
  });

  return io;
};

// Function to create a notification in DB and emit
const sendNotification = async (personId, message, dotColor = 'bg-txt/30') => {
  try {
    const result = await pool.query(
      `INSERT INTO notification (person_id, message, dot_color) 
       VALUES ($1, $2, $3) RETURNING *`,
      [personId, message, dotColor]
    );
    const newNotif = result.rows[0];
    if (io) {
      io.to(personId).emit('new_notification', newNotif);
    }
    return newNotif;
  } catch (err) {
    console.error('Error saving notification:', err);
  }
};

module.exports = { initSocket, sendNotification };
