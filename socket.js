// "use strict"

// const { io } = require("socket.io-client");
// const { initializeMithuPackageSocket } = require("@mithu/models-constants");
// const { WEBSOCKET_URL } = require("@src/config");
// const socket = io(WEBSOCKET_URL, {
//   autoConnect: true,
//   reconnection: true,
// });

// socket.on("connect", () => {
//   console.log("Successfully connected to WebSocket server");
//   socket.emit("connect_mobile_backend");
//   initializeMithuPackageSocket(socket);
// });

// socket.on('reconnect', () => {
//     console.log('Successfully re-connected to WebSocket server');
//     socket.emit('connect_mobile_backend')
// });

// socket.on('connect_error', (err) => {
//     console.error('Connection error:', err); 
// });

// socket.on('disconnect', (reason) => {
//     console.warn('Disconnected:', reason);
// });



// module.exports = socket