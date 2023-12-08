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

//TODO make class for storing / handling sessions
//TODO make class for storing / handling active games
const activeSessions = new Map();
const activeGames = new Map();

const getActiveGameByPlayerId = (playerId) => {
  for (const [gameId, game] of activeGames) {
    const playerIsParticipant = game.players.some(
      (player) => player.id === playerId
    );

    if (playerIsParticipant) {
      return game;
    }
  }

  return null;
};

//discover / create session on handshake
io.use((socket, next) => {
  console.log(`Looking for session for connecting socket: ${socket.id}`);
  const existingSessionId = socket.handshake.auth.sessionId;

  if (existingSessionId) {
    //if a session id has been passed, find and restore the session if it exists
    const session = activeSessions.get(existingSessionId);

    if (activeSessions.get(existingSessionId)) {
      console.log("Found session with id: ", existingSessionId);
      socket.sessionId = existingSessionId;
      socket.userId = session.userId;
      socket.username = session.username;

      return next();
    }

    console.log(`No session found with id: ${existingSessionId}`);
  }

  const username = socket.handshake.auth.username;

  if (!username) {
    console.log(`No username for connecting socket: ${socket.id}`);
    return next(new Error("Invalid username"));
  }

  //reuse existing session ID if present to ensure any other user sockets use same session on join
  const sessionId = existingSessionId || randomUUID();
  const userId = randomUUID();

  socket.sessionId = sessionId;
  socket.userId = userId;
  socket.username = username;

  activeSessions.set(sessionId, { sessionId, userId, username });

  console.log(
    `New session created for connecting socket: ${socket.id}, user details: ${socket.username} (${socket.userId})`
  );

  next();
});

io.on("connection", (socket) => {
  console.log(`user connected - ${socket.username} (${socket.userId})`);

  //join userId room to keep all user sockets grouped
  socket.join(socket.userId);

  socket.on("disconnect", () => {
    //TODO: check other sockets belonging to same session
    console.log(`${socket.id} disconnected`);
  });

  //send session details to connecting socket
  socket.emit("SESSION_INITIALISED", {
    sessionId: socket.sessionId,
    userId: socket.userId,
    username: socket.username,
  });

  //broadcasts to all sockets other than the one connecting
  socket.broadcast.emit("USER_CONNECTED", {
    userId: socket.userId,
    username: socket.username,
  });

  //TODO: investigate if this is an issue (as all user sockets listen and action)
  socket.on("AWAITING_GAME", async () => {
    try {
      //if user already has game, rejoin and return state
      const game = getActiveGameByPlayerId(socket.userId);

      if (game) {
        console.log(
          `returning ${socket.username} (${socket.userId}) to game ${game.id}`
        );

        socket.join(game.id);
        socket.emit("GAME_STATE_UPDATED", game.toSendableObject());

        return;
      }
    } catch (e) {
      handleError(
        socket,
        `Error retrieving game for ${socket.username} (${socket.userId}) - ${e}`
      );
    }

    //no existing game found, send user to lobby to wait for opponent
    try {
      const lobbySockets = await io.in("lobby").fetchSockets();

      //a single user could have multiple sockets, so find unique users.
      const uniquePlayerSockets = lobbySockets.filter(
        ({ userId }, i, arr) =>
          i ===
          arr.findIndex(
            ({ userId: userIdToCompare }) => userId === userIdToCompare
          )
      );

      if (
        !uniquePlayerSockets.some((player) => player.userId === socket.userId)
      ) {
        console.log(`${socket.username} (${socket.userId}) joining lobby`);
      } else {
        console.log(
          `${socket.username} (${socket.userId}) already waiting in lobby`
        );
      }

      socket.join("lobby");

      if (uniquePlayerSockets.length > 1) {
        console.log("Initialising new game");

        const playerSocketsToAction = uniquePlayerSockets.slice(0, 2);

        const gameId = randomUUID();

        const newGame = new Game(gameId, playerSocketsToAction);
        newGame.init();

        //find all associated sockets for each player and add them to game room
        for (const playerSocket of playerSocketsToAction) {
          const userId = playerSocket.userId;
          console.log(userId, `- joining game ${gameId}`);
          io.in(userId).socketsJoin(gameId);

          console.log(userId, `- leaving lobby`);
          io.in(userId).socketsLeave("lobby");
        }

        activeGames.set(gameId, newGame);

        io.to(gameId).emit("GAME_STARTED", newGame.toSendableObject());
      }
    } catch (e) {
      handleError(null, `Error starting game - ${e}`);
    }
  });

  socket.on("POST_MESSAGE", ({ roomId, message }) => {
    try {
      io.to(roomId).emit("MESSAGE_RECEIVED", message);
    } catch (e) {
      handleError(roomId, `Error posting message - ${e}`);
    }
  });

  socket.on("POST_MOVE", ({ move }) => {
    try {
      const game = getActiveGameByPlayerId(socket.userId);

      if (game) {
        game.handleMoveReceived(socket.userId, move);

        io.to(game.id).emit("GAME_STATE_UPDATED", game.toSendableObject());
      } else {
        throw new Error("game not found");
      }
    } catch (e) {
      handleError(game.id, `Error when performing move - ${e}`);
    }
  });

  socket.on("POST_PROMOTION_OPTION", ({ gameId, newRank }) => {
    try {
      const game = activeGames.get(gameId);

      //TODO: check move has been posted by active player
      game.handlePromotionSelectionReceived(newRank);

      io.to(gameId).emit("GAME_STATE_UPDATED", game.toSendableObject());
    } catch (e) {
      handleError(gameId, `Error promoting piece - ${e}`);
    }
  });
});

const handleError = (broadcastChannel, errorMessage) => {
  console.log(errorMessage);
  if (broadcastChannel) {
    io.to(broadcastChannel).emit("ERROR", errorMessage);
  }
};
