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
    try {
      socket.join("lobby");
      console.log(socket.id, "waiting in lobby");

      const waitingPlayers = await io.in("lobby").fetchSockets();

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

        io.to(gameId).emit("GAME_STATE_UPDATED", newGame.toSendableObject());
      }
    } catch (e) {
      console.log("error starting game - ", e);
    }
  });

  //TODO: been more explicit in where this is sent
  socket.on("POST_MESSAGE", (message) => {
    try {
      const associatedRoomIds = Array.from(socket.rooms);

      io.to(associatedRoomIds).emit("MESSAGE_RECEIVED", message);
    } catch (e) {
      console.log("error posting message - ", e);
    }
  });

  //TODO: make sure only current user can make move
  socket.on("POST_MOVE", ({ gameId, move }) => {
    try {
      const game = activeGames.get(gameId);

      if (game) {
        //TODO: check move has been posted by active player
        game.handleMoveReceived(move);

        io.to(gameId).emit("GAME_STATE_UPDATED", game.toSendableObject());
      } else {
        console.log("no game found");
      }
    } catch (e) {
      console.log("error performing move - ", e);
    }
  });

  socket.on("POST_PROMOTION_OPTION", ({ gameId, newRank }) => {
    try {
      const game = activeGames.get(gameId);

      //TODO: check move has been posted by active player
      game.handlePromotionSelectionReceived(newRank);

      io.to(gameId).emit("GAME_STATE_UPDATED", game.toSendableObject());
    } catch (e) {
      console.log("error promotiong piece - ", e);
    }
  });
});
