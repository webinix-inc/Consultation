require('dotenv').config(); // Load env variables

const http = require('http');
const mongoose = require('mongoose');
const app = require('./app'); // Import configured express app
const { connectDB } = require('./config/db'); // DB connection function

const PORT = process.env.PORT || 5000;

// Create HTTP server instance
const server = http.createServer(app);

// Initialize Socket.io
const SocketService = require("./services/socket.service");
SocketService.initialize(server);

// Connect to DB and start the server
(async () => {
  try {
    await connectDB();

    // Start the appointment auto-completion scheduler
    const { startAppointmentScheduler } = require('./services/appointmentScheduler');
    startAppointmentScheduler();

    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
