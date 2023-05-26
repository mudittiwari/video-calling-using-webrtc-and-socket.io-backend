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


var roompasswords=[];
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
        console.log(password);
        if(roompasswords.includes(password))
        {
            socket.emit("room_already_exists", { "message": "Room already exists" });
            return;
        }
        let url = cryptojs.AES.encrypt(password, process.env.PASS_SEC).toString();
        roompasswords.push(password);
        socket.join(url);
        roomtousersmapping[url] = [[username,socket.id]];
        console.log(roomtousersmapping);
        socket.emit("room_created", { url: url, users: [[username,socket.id]] });
    });
    socket.on("join_room", (data) => {
        console.log(data);
        const { username, password } = data;
        let bytes  = cryptojs.AES.decrypt(password, process.env.PASS_SEC);
        let originalText = bytes.toString(cryptojs.enc.Utf8);
        if(roompasswords.indexOf(originalText)===-1)
        {
            socket.emit("room_not_found", { "message": "Room Not Found" });
            return;
        }
        socket.join(password);
        roomtousersmapping[password].push([username,socket.id]);
        socket.emit("room_joined", { url: password, users: roomtousersmapping[password] });
        socket.to(password).emit("room_data", { users: roomtousersmapping[password] });
        socket.to(password).emit("user_joined", { user: username });
    });

    socket.on('disconnect', () => {
        console.log("user disconnected");
        for(let i=0;i<Object.keys(roomtousersmapping).length;i++){
            let key = Object.keys(roomtousersmapping)[i];
            let value = roomtousersmapping[key];
            for(let j=0;j<value.length;j++){
                if(value[j][1]===socket.id){
                    socket.to(key).emit("user_disconnected", { user: value[j][0] });
                    value.splice(j,1);
                    socket.to(key).emit("room_data", { users: roomtousersmapping[key] });
                    
                    if(value.length===0)
                    {
                        let bytes  = cryptojs.AES.decrypt(key, process.env.PASS_SEC);
                        let originalText = bytes.toString(cryptojs.enc.Utf8);
                        roompasswords.splice(roompasswords.indexOf(originalText),1);
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