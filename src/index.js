import http from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import GameSession from "./classes/gameSession.js";

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

//TODO make class for storing / handling userSessions
//TODO make class for storing / handling active games
const userSessions = new Map();
const gameSessions = new Map();

const getActiveGameSessionByUserId = (userId) => {
  for (const [id, gameSession] of gameSessions) {
    const userIsParticipant = gameSession.players.some(
      (player) => player.userId === userId
    );

    if (userIsParticipant) {
      return gameSession;
    }
  }

  return null;
};

const getActiveUserSessionBySessionId = (sessionId) =>
  userSessions.get(sessionId);

const getActiveSessionByUserId = (userId) => {
  for (const [id, userSession] of userSessions) {
    if (userSession.userId === userId) {
      return userSession;
    }
  }

  return null;
};

const getPlayerUserDetailsByGameId = (gameId) =>
  gameSessions.get(gameId).players.map((player) => {
    const { username, isConnected } = getActiveSessionByUserId(player.userId);

    return { username, isConnected };
  });

//discover / create user session on handshake
io.use((socket, next) => {
  console.log(`Looking for user session for connecting socket: ${socket.id}`);
  const existingSessionId = socket.handshake.auth.sessionId;

  if (existingSessionId) {
    //if a session id has been passed, find and restore the session if it exists
    const userSession = getActiveUserSessionBySessionId(existingSessionId);

    if (userSession) {
      console.log("Found user session with id: ", existingSessionId);
      socket.sessionId = existingSessionId;
      socket.userId = userSession.userId;
      socket.username = userSession.username;

      return next();
    }

    console.log(`No user session found with id: ${existingSessionId}`);
  }

  const username = socket.handshake.auth.username;

  if (!username) {
    console.log(`No username for connecting socket: ${socket.id}`);
    return next(new Error("Invalid username"));
  }

  //reuse existing session ID if present to ensure any other user sockets use same user session on join
  const sessionId = existingSessionId || randomUUID();
  const userId = randomUUID();

  socket.sessionId = sessionId;
  socket.userId = userId;
  socket.username = username;

  userSessions.set(sessionId, {
    sessionId,
    userId,
    username,
    isConnected: false,
  });

  console.log(
    `New user session created for connecting socket: ${socket.id}, user details: ${socket.username} (${socket.userId})`
  );

  next();
});

io.on("connection", (socket) => {
  console.log(`user connected - ${socket.username} (${socket.userId})`);

  const userSession = getActiveUserSessionBySessionId(socket.sessionId);
  userSessions.set(socket.sessionId, { ...userSession, isConnected: true });

  const activeGame = getActiveGameSessionByUserId(socket.userId);

  if (activeGame) {
    io.to(activeGame.id).emit("USER_CONNECTED", socket.userId);
  }

  //join userId room to keep all user sockets grouped
  socket.join(socket.userId);

  socket.on("disconnect", () => {
    console.log(`${socket.userId} disconnected`);
    handleAbandon(socket.userId);
  });

  //send user session details to connecting socket
  socket.emit("SESSION_INITIALISED", {
    sessionId: socket.sessionId,
    userId: socket.userId,
    username: socket.username,
  });

  socket.on("AWAITING_GAME", async () => {
    try {
      //if user already has game, rejoin and return state
      const gameSession = getActiveGameSessionByUserId(socket.userId);

      if (gameSession) {
        console.log(
          `returning ${socket.username} (${socket.userId}) to game ${gameSession.id}`
        );

        socket.join(gameSession.id);
        //TODO: extract into function
        socket.emit("GAME_INITIALISED", {
          userDetails: getPlayerUserDetailsByGameId(gameSession.id),
          gameState: gameSession.getFullGameState(),
        });

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
      socket.join("lobby");

      const lobbySockets = await io.in("lobby").fetchSockets();

      if (
        lobbySockets.filter(
          (playerSocket) => playerSocket.userId === socket.userId
        ).length <= 1
      ) {
        console.log(`${socket.username} (${socket.userId}) joined lobby`);
      } else {
        console.log(
          `${socket.username} (${socket.userId}) already waiting in lobby`
        );
      }

      //a single user could have multiple sockets, so find unique users.
      const onlinePlayerSockets = lobbySockets
        .filter(
          ({ userId }, i, arr) =>
            i ===
            arr.findIndex(
              ({ userId: userIdToCompare }) => userId === userIdToCompare
            )
        )
        .filter(({ userId }) => getActiveSessionByUserId(userId).isConnected);

      if (onlinePlayerSockets.length > 1) {
        console.log("Initialising new game session");

        const playerSocketsToAction = onlinePlayerSockets.slice(0, 2);

        const newGameSession = new GameSession(playerSocketsToAction);
        newGameSession.startGame();

        //find all associated sockets for each player and add them to game room
        for (const playerSocket of playerSocketsToAction) {
          const userId = playerSocket.userId;
          console.log(userId, `- joining game ${newGameSession.id}`);
          io.in(userId).socketsJoin(newGameSession.id);

          console.log(userId, `- leaving lobby`);
          io.in(userId).socketsLeave("lobby");
        }

        gameSessions.set(newGameSession.id, newGameSession);

        io.to(newGameSession.id).emit("GAME_INITIALISED", {
          userDetails: getPlayerUserDetailsByGameId(newGameSession.id),
          gameState: newGameSession.getSendableState(),
        });
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
    const gameSession = getActiveGameSessionByUserId(socket.userId);

    try {
      if (gameSession) {
        gameSession.handleMove(socket.userId, move);

        io.to(gameSession.id).emit(
          "GAME_STATE_UPDATED",
          gameSession.getSendableState()
        );
      } else {
        throw new Error("game not found");
      }
    } catch (e) {
      handleError(gameSession.id, `Error when performing move - ${e}`);
    }
  });

  socket.on("POST_PROMOTION_OPTION", ({ newType }) => {
    const gameSession = getActiveGameSessionByUserId(socket.userId);

    try {
      if (gameSession) {
        gameSession.handlePromotion(socket.userId, newType);

        io.to(gameSession.id).emit(
          "GAME_STATE_UPDATED",
          gameSession.getSendableState()
        );
      }
    } catch (e) {
      handleError(gameSession.id, `Error promoting piece - ${e}`);
    }
  });

  socket.on("FORFEIT", () => {
    handleForfeit(socket.userId);
  });

  socket.on("LEAVE_GAME", () => handleLeaveGame(socket.userId));
});

const handleError = (broadcastChannel, errorMessage) => {
  console.log(errorMessage);
  if (broadcastChannel) {
    io.to(broadcastChannel).emit("ERROR", errorMessage);
  }
};

const handleForfeit = (userId) => {
  const gameSession = getActiveGameSessionByUserId(userId);

  try {
    if (gameSession) {
      gameSession.handleForfeit(userId);

      io.to(gameSession.id).emit(
        "GAME_STATE_UPDATED",
        gameSession.getSendableState()
      );
    } else {
      throw new Error("game not found");
    }
  } catch (e) {
    handleError(gameSession?.id, `Error when attempting to forfeit - ${e}`);
  }
};

const handleLeaveGame = (userId) => {
  const gameSession = getActiveGameSessionByUserId(userId);

  try {
    if (gameSession) {
      gameSession.players.splice(
        gameSession.players.findIndex((player) => player.userId === userId),
        1
      );

      io.in(userId).socketsLeave(gameSession.id);

      console.log(`${userId} has left game ${gameSession.id}`);

      //if both players have left, remove the game from game store
      if (gameSession.players.length === 0) {
        gameSessions.delete(gameSession.id);
        console.log(`removed game ${gameSession.id}`);
      }
    } else {
      throw new Error("game not found");
    }
  } catch (e) {
    handleError(gameSession?.id, `Error when attempting to leave - ${e}`);
  }
};

const handleAbandon = (userId) => {
  handleForfeit(userId);
  handleLeaveGame(userId);
};
