const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path'); 
const mongoose = require('mongoose');


mongoose.connect('mongodb+srv://zedek:olaitan23CG@hotelroom.yo5eha6.mongodb.net/?retryWrites=true&w=majority&appName=hotelroom')

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const chatSchema = new mongoose.Schema({
  room: String,
  messages: [
    {
      user: String,
      message: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});
const ChatRoom = mongoose.model('ChatRoom', chatSchema);

function broadcast(room, message) {
  room.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

const messageHandlers = {
  async join(ws, data) {
    ws.currentRoom = data.room;
    let room = await ChatRoom.findOne({ room: ws.currentRoom });
    if (!room) {
      room = new ChatRoom({ room: ws.currentRoom, messages: [] });
      await room.save();
    }
    ws.currentRoomInstance = room;
    room.clients.push(ws);
    ws.send(JSON.stringify({ type: 'history', messages: room.messages }));
  },
  async message(ws, data) {
    if (ws.currentRoom && ws.currentRoomInstance) {
      const chatMessage = { user: data.user, message: data.message };
      ws.currentRoomInstance.messages.push(chatMessage);
      await ws.currentRoomInstance.save();
      broadcast(ws.currentRoomInstance, { type: 'message', user: data.user, message: data.message });
    }
  }
};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const handler = messageHandlers[data.type];
      if (handler) {
        handler(ws, data);
      } else {
        console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', async () => {
    if (ws.currentRoom && ws.currentRoomInstance) {
      ws.currentRoomInstance.clients = ws.currentRoomInstance.clients.filter(client => client !== ws);
      await ws.currentRoomInstance.save();
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});