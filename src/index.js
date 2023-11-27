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

const activeSessions = new Map();
const activeGames = new Map();

//discover / create session on handshake
io.use((socket, next) => {
  const existingSessionId = socket.handshake.auth.sessionId;

  console.log(existingSessionId);
  //TODO: if two tabs are open on server start up, they return two separate sessions :(
  if (existingSessionId) {
    console.log("has existing session id");
    //if a session id has been passed, find and restore the session if it exists
    const session = activeSessions.get(existingSessionId);

    if (activeSessions.get(existingSessionId)) {
      console.log("found session");
      socket.sessionId = existingSessionId;
      socket.userId = session.userId;
      socket.username = session.username;

      return next();
    }
    console.log("didnt find session");
  }

  const sessionId = randomUUID();
  const userId = randomUUID();
  const username = socket.handshake.auth.username;

  socket.sessionId = sessionId;
  socket.userId = userId;
  socket.username = username;

  activeSessions.set(sessionId, { sessionId, userId, username });
  console.log("set new session");
  console.log("active sessions = ", activeSessions.size);
  next();
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });

  //send session details to connecting socket
  socket.emit("SESSION_INITIALISED", {
    sessionId: socket.sessionId,
    userId: socket.userId,
  });

  //broadcasts to all sockets other than the one connecting
  socket.broadcast.emit("USER_CONNECTED", {
    userId: socket.userId,
    username: socket.username,
  });

  console.log(`user connected - ${socket.username} (${socket.userId})`);

  socket.on("AWAITING_GAME", async () => {
    try {
      //if user already has game, rejoin and return state
      for (const [gameId, game] of activeGames) {
        const playerIsParticipant = game.players.some(
          (player) => player.id === socket.userId
        );
        //TODO: could set player online / offline state for other players?
        if (playerIsParticipant) {
          socket.join(gameId);
          io.to(gameId).emit("GAME_STATE_UPDATED", game.toSendableObject());
        }

        console.log(playerIsParticipant);

        return;
      }

      socket.join("lobby");

      const lobbySockets = await io.in("lobby").fetchSockets();
      //a single user could have multiple sockets, so find unique users.
      const uniquePlayerSockets = lobbySockets.filter(
        ({ userId }, i, arr) =>
          i ===
          arr.findIndex(
            ({ userId: userIdToCompare }) => userId === userIdToCompare
          )
      );

      console.log(uniquePlayerSockets.length);

      if (uniquePlayerSockets.length > 1) {
        const playerSocketsToAction = uniquePlayerSockets.slice(0, 2);

        const gameId = randomUUID();

        const newGame = new Game(gameId, playerSocketsToAction);
        newGame.init();

        //add players to game room for communication
        for (const player of playerSocketsToAction) {
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
