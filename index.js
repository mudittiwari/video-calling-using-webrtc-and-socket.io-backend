const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
app.use(express.json());
app.use(cors(
    {
        origin:['http://localhost:3000','https://mudittiwari.github.io'],
    }
)
);
const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 100e7,
    cors: {
        origin:['http://localhost:3000','https://mudittiwari.github.io'],
        methods: ['GET', 'POST', 'DELETE', 'PUT']
    }
});


io.on('connection', (socket) => {
    console.log("user conncted", socket.id);
    socket.emit('connection', null);
    socket.on('fileData', ({ fileName, fileType, fileData }) => {
        console.log(fileType);
        // const writeStream = fs.createWriteStream('sample.png');
        io.emit('receive_file', { fileName, fileType, fileData});
        // fileData.forEach((chunk) => {
        //     writeStream.write(chunk);
        // });

        // writeStream.end(() => {
        //     console.log('File saved:', fileName);
        // });
    });


});


server.listen(5000, () => {
    console.log('listening on port 5000');
}
);