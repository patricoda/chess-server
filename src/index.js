import http from "http";
import { Server } from "socket.io";

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

const activeGames = [];

//TODO: currently will lose game on refresh.. really need to keep socket id and game id stored client-side
//that way we can get the game state (for both player and spectators), and if socket id is a player, then just carry on as norm \o/
//https://socket.io/get-started/private-messaging-part-2/
io.on("connection", (socket) => {
  console.log(`new socket connection - ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });

  socket.on("AWAITING_GAME", async () => {
    socket.join("lobby");
    console.log(socket.id, "waiting in lobby");

    const waitingPlayers = await io.in("lobby").fetchSockets();

    if (waitingPlayers.length > 1) {
      const playersToAction = waitingPlayers.slice(0, 2);
      const gameId = randomUUID();

      //construct game instance
      //add game instance to list of active games
      for (player of playersToAction) {
        player.join(gameId);
        console.log(player.id, `- joining game ${roomId}`);
        player.leave("lobby");
        console.log(player.id, `- leaving lobby`);
        //TODO: on game join, pass default state, store room and state somewhere
        player.emit("INITIATE_GAME", { gameId: roomId, board: [] });
      }
    }
  });

  socket.on("POST_MESSAGE", (message) => {
    //on message, emit to all users
    //TODO: persist room's chat?
    const associatedRoomIds = Array.from(socket.rooms);

    console.log(`message received - sending to rooms ${associatedRoomIds}`);
    io.to(associatedRoomIds).emit("MESSAGE_RECEIVED", message);
  });

  socket.on("POST_MOVE", (message) => {
    //on post move, update room's game state, and emit the state to all users in room.
    io.to(socket.rooms).emit("GAME_UPDATED");
  });
});
