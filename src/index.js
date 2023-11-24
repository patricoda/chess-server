import http from "http";
import { Server } from "socket.io";
import Game from "./classes/game.js";
import { randomUUID } from "crypto";

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

const activeGames = new Map();

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

    //TODO: emit that player is in lobby

    if (waitingPlayers.length > 1) {
      const playersToAction = waitingPlayers.slice(0, 2);
      const gameId = randomUUID();

      const newGame = new Game(gameId, playersToAction);
      newGame.init();

      //add players to game room for communication
      for (const player of playersToAction) {
        player.join(gameId);
        console.log(player.id, `- joining game ${gameId}`);
        player.leave("lobby");
        console.log(player.id, `- leaving lobby`);
      }

      activeGames.set(gameId, newGame);

      //TODO: separate emit for active player and everyone else?
      //TODO: player names
      //pass game id to client and player name / allegiance.
      console.log(
        newGame.players.map(({ id, name, allegiance, legalMoves }) => ({
          id,
          name,
          allegiance,
          legalMoves,
        }))
      );
      io.to(gameId).emit("GAME_INITIALISED", {
        gameId: newGame.id,
        players: newGame.players.map(
          ({ id, name, allegiance, legalMoves }) => ({
            id,
            name,
            allegiance,
            legalMoves,
          })
        ),
        boardState: JSON.stringify(newGame.board),
      });
    }
  });

  socket.on("POST_MESSAGE", (message) => {
    //on message, emit to all users
    //TODO: persist room's chat?
    const associatedRoomIds = Array.from(socket.rooms);

    console.log(`message received - sending to rooms ${associatedRoomIds}`);
    io.to(associatedRoomIds).emit("MESSAGE_RECEIVED", message);
  });

  //TODO: make sure only current user can make move
  socket.on("POST_MOVE", ({ gameId, move }) => {
    console.log(gameId);
    const game = activeGames.get(gameId);

    try {
      console.log("performing move");
      game.handleMove(move);
      console.log("move performed");
      //on post move, update room's game state, and emit the state to all users in room.
      console.log("sending update");
      io.to(gameId).emit("GAME_STATE_UPDATED", {
        gameId: game.id,
        players: game.players.map(({ id, name, allegiance, legalMoves }) => ({
          id,
          name,
          allegiance,
          legalMoves,
        })),
        boardState: JSON.stringify(game.board),
      });
    } catch (e) {
      console.log(e);
    }
  });
});
