// test/chat-app.test.mjs
import { expect } from 'chai';
import request from 'supertest';
import WebSocket from 'ws';
import mongoose from 'mongoose';
import { app } from '../app.mjs'; // Ensure app.mjs is updated accordingly

describe('Chat App', function() {
  let server;
  let ws;

  before((done) => {
    server = app.listen(8081, () => {
      done();
    });
  });

  after((done) => {
    server.close(() => {
      mongoose.connection.close();
      done();
    });
  });

  it('should serve static files', function(done) {
    request(server)
      .get('/')
      .expect(200, done);
  });

  it('should connect to WebSocket server', function(done) {
    ws = new WebSocket('ws://localhost:8081');
    ws.on('open', () => {
      expect(ws.readyState).to.equal(WebSocket.OPEN);
      done();
    });
  });

  it('should join a chat room and receive history', function(done) {
    ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'history') {
        expect(data.messages).to.be.an('array');
        done();
      }
    });
    ws.send(JSON.stringify({ type: 'join', room: 'room1' }));
  });

  it('should send and receive messages', function(done) {
    const testMessage = { user: 'test', message: 'Hello' };
    ws.send(JSON.stringify({ type: 'message', ...testMessage }));

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'message' && data.message === testMessage.message) {
        expect(data.user).to.equal(testMessage.user);
        done();
      }
    });
  });
});
