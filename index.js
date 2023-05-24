const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
app.use(express.json());
app.use(cors(
    {
        origin: 'http://localhost:3000',
    }
)
);
const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 100e7,
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST', 'DELETE', 'PUT']
    }
});


io.on('connection', (socket) => {
    socket.on('fileData', ({ fileName, fileType, fileData }) => {
        console.log(fileType);
        // const writeStream = fs.createWriteStream('sample.png');
        socket.emit('receive_file', { fileName, fileType, fileData});
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