const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path'); // For serving static files efficiently

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const chatRooms = {};

function broadcast(room, message) {
  chatRooms[room]?.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

const messageHandlers = {
  join(ws, data) {
    ws.currentRoom = data.room;
    if (!chatRooms[ws.currentRoom]) {
      chatRooms[ws.currentRoom] = { clients: [], messages: [] };
    }
    chatRooms[ws.currentRoom].clients.push(ws);
    ws.send(JSON.stringify({ type: 'history', messages: chatRooms[ws.currentRoom].messages }));
  },
  message(ws, data) {
    if (ws.currentRoom && chatRooms[ws.currentRoom]) {
      const chatMessage = { user: data.user, message: data.message };
      chatRooms[ws.currentRoom].messages.push(chatMessage);
      broadcast(ws.currentRoom, { type: 'message', user: data.user, message: data.message });
    }
  },
};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const handler = messageHandlers[data.type];
      if (handler) {
        handler(ws, data); // Call the appropriate handler function
      } else {
        console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Handle invalid message format gracefully (e.g., send error message to client)
    }
  });

  ws.on('close', () => {
    if (ws.currentRoom && chatRooms[ws.currentRoom]) {
      chatRooms[ws.currentRoom].clients = chatRooms[ws.currentRoom].clients.filter(client => client !== ws);
    }
  });
});

// Serve static client files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});
