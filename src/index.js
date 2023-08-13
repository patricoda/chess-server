const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(3001, () => {
  console.log("listening on *:3001");
});

//TODO: currently will lose game on refresh.. really need to keep socket id and game id stored client-side
//that way we can get the game state (for both player and spectators), and if socket id is a player, then just carry on as norm \o/
//probably should hold room id as variable on route path
io.on("connection", async (socket) => {
  console.log("a user connected");
  socket.join("lobby");
  console.log(socket.id, "waiting in lobby");

  const waitingPlayers = await io.in("lobby").fetchSockets();

  if (waitingPlayers.length > 1) {
    for (player of waitingPlayers.slice(0, 2)) {
      console.log(player.id, "joining game1");
      player.leave("lobby");
      player.join("game1");
    }
  }

  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});
