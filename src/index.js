const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server);

server.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', () => console.log('a user connected'));

