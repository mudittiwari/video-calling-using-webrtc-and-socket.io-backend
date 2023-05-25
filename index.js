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
        origin: ['http://localhost:3000', 'https://mudittiwari.github.io'],
    }
)
);
const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 100e7,
    cors: {
        origin: ['http://localhost:3000', 'https://mudittiwari.github.io'],
        methods: ['GET', 'POST', 'DELETE', 'PUT']
    }
});



var roomtousersmapping = {};
io.on('connection', (socket) => {
    console.log("user conncted", socket.id);
    socket.emit('connection', null);
    socket.on('fileData', ({ fileName, fileType, fileData,url }) => {
        console.log(fileType);
        // const writeStream = fs.createWriteStream('sample.png');
        socket.in(url).emit('receive_file', { fileName, fileType, fileData });
        // fileData.forEach((chunk) => {
        //     writeStream.write(chunk);
        // });

        // writeStream.end(() => {
        //     console.log('File saved:', fileName);
        // });
    });

    socket.on("create_room", (data) => {
        const { username, password } = data;
        let url = cryptojs.AES.encrypt(password, process.env.PASS_SEC).toString();
        socket.join(url);
        roomtousersmapping[url] = [[username,socket.id]];
        socket.emit("room_created", { url: url, users: [[username,socket.id]] });
    });
    socket.on("join_room", (data) => {
        console.log(data);
        const { username, password } = data;
        socket.join(password);
        roomtousersmapping[password].push([username,socket.id]);
        socket.emit("room_joined", { url: password, users: roomtousersmapping[password] });
        io.in(password).emit("room_data", { users: roomtousersmapping[password] });
    });

    socket.on('disconnect', () => {
        console.log("user disconnected");
        for(let i=0;i<Object.keys(roomtousersmapping).length;i++){
            let key = Object.keys(roomtousersmapping)[i];
            let value = roomtousersmapping[key];
            console.log(value);
            for(let j=0;j<value.length;j++){
                if(value[j][1]===socket.id){
                    value.splice(j,1);
                    io.in(key).emit("room_data", { users: roomtousersmapping[key] });
                    if(value.length===0)
                    {
                        console.log("deleting room");
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