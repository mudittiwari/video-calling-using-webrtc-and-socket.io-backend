const express = require('express');
const cors = require('cors');
const app = express();
const dotenv = require("dotenv");
const http = require('http');
const cryptojs = require("crypto-js");

const fs = require('fs');
const { Server } = require('socket.io');
dotenv.config();

app.use(express.json());
app.use(cors(
  {
    origin: ['http://localhost:3000', 'https://video-calling-using-webrtc-and-socketio.mudittiwari2.repl.co','https://video-calling-using-webrtc-and-socket-io-mz4y-eao7wih1w.vercel.app'],
  }
)
);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://video-calling-using-webrtc-and-socketio.mudittiwari2.repl.co','https://video-calling-using-webrtc-and-socket-io-mz4y-eao7wih1w.vercel.app'],
    methods: ['GET', 'POST', 'DELETE', 'PUT']
  }
});


var roompasswords = [];
var roomtousersmapping = {};
io.on('connection', (socket) => {
  console.log("user conncted", socket.id);
  socket.emit('connection', null);
  socket.on("create_room", (data) => {
    const { username, password } = data;
    console.log(password);
    if (roompasswords.includes(password)) {
      socket.emit("room_already_exists", { "message": "Room already exists" });
      return;
    }
    let url = cryptojs.AES.encrypt(password, process.env.PASS_SEC).toString();
    roompasswords.push(password);
    socket.join(url);
    roomtousersmapping[url] = [[username, socket.id]];
    console.log(roomtousersmapping);
    socket.emit("room_created", { url: url, users: [[username, socket.id]] });
  });
  socket.on("join_room", (data) => {
    console.log(data);
    const { username, password } = data;
    let bytes = cryptojs.AES.decrypt(password, process.env.PASS_SEC);
    let originalText = bytes.toString(cryptojs.enc.Utf8);
    if (roompasswords.indexOf(originalText) === -1) {
      socket.emit("room_not_found", { "message": "Room Not Found" });
      return;
    }
    socket.join(password);
    roomtousersmapping[password].push([username, socket.id]);
    socket.emit("room_joined", { url: password, users: roomtousersmapping[password] });
    socket.to(password).emit("room_data", { users: roomtousersmapping[password] });
    socket.to(password).emit("user_joined", { user: username });
  });
  socket.on('userstream_changed',(data)=>{
    const {audio,video,password}=data;
    socket.to(password).emit("userstream_changed",{audio,video})
  })
  socket.on("send_offer", (data) => {
    const { offer, password } = data;
    // console.log(data);
    // console.log("sending");
    // console.log(password);
    let bytes = cryptojs.AES.decrypt(password, process.env.PASS_SEC);
    let originalText = bytes.toString(cryptojs.enc.Utf8);
    // console.log(originalText);
    if (roompasswords.indexOf(originalText) === -1) {
      console.log("mudittiwari");
      socket.emit("room_not_found", { "message": "Room Not Found" });
      return;
    }
    let user2 = roomtousersmapping[password][0][1];
    console.log("offer sending to " + roomtousersmapping[password][0][0]);
    // console.log(user2);
    socket.to(user2).emit("offer_received", { offer: offer, user: socket.id });
  });
  socket.on("send_answer", (data) => {
    const { answer, password } = data;
    let bytes = cryptojs.AES.decrypt(password, process.env.PASS_SEC);
    let originalText = bytes.toString(cryptojs.enc.Utf8);
    if (roompasswords.indexOf(originalText) === -1) {
      socket.emit("room_not_found", { "message": "Room Not Found" });
      return;
    }
    let user2 = roomtousersmapping[password][1][1];
    console.log("answer sending to " + roomtousersmapping[password][1][0]);
    socket.to(user2).emit("answer_received", { answer: answer, user: socket.id });

  });

  socket.on("send_streams", (data) => {
    const { password } = data;
    io.to(password).emit("send_data");
  });
  socket.on('disconnect', () => {
    console.log("user disconnected");
    for (let i = 0; i < Object.keys(roomtousersmapping).length; i++) {
      let key = Object.keys(roomtousersmapping)[i];
      let value = roomtousersmapping[key];
      for (let j = 0; j < value.length; j++) {
        if (value[j][1] === socket.id) {
          socket.to(key).emit("user_disconnected", { user: value[j][0] });
          value.splice(j, 1);
          socket.to(key).emit("room_data", { users: roomtousersmapping[key] });

          if (value.length === 0) {
            let bytes = cryptojs.AES.decrypt(key, process.env.PASS_SEC);
            let originalText = bytes.toString(cryptojs.enc.Utf8);
            roompasswords.splice(roompasswords.indexOf(originalText), 1);
            delete roomtousersmapping[key];
            io.sockets.adapter.rooms.delete(key);
          }
          break;
        }
      }
    }
  }

  );


});


server.listen(5000, () => {
  console.log('listening on port 5000');
}
);


app.get('/', (req, res) => {
  return res.json("hello")
})
// next work in this project
// add screen sharing feature