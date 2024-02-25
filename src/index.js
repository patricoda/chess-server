import http from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import Game from "@patricoda/chess-engine";

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
const sessions = new Map();
const activeGames = new Map();

const getActiveGameByUserId = (userId) => {
  for (const [gameId, game] of activeGames) {
    const userIsParticipant = game.players.some(
      (player) => player.userId === userId
    );

    if (userIsParticipant) {
      return game;
    }
  }

  return null;
};

const getActiveSessionBySessionId = (sessionId) => sessions.get(sessionId);

const getActiveSessionByUserId = (userId) => {
  for (const [sessionId, session] of sessions) {
    if (session.userId === userId) {
      return session;
    }
  }

  return null;
};

const getPlayerUserDetailsByGameId = (gameId) =>
  activeGames.get(gameId).players.map((player) => {
    const { username, isConnected } = getActiveSessionByUserId(player.userId);

    return { username, isConnected };
  });

//discover / create session on handshake
io.use((socket, next) => {
  console.log(`Looking for session for connecting socket: ${socket.id}`);
  const existingSessionId = socket.handshake.auth.sessionId;

  if (existingSessionId) {
    //if a session id has been passed, find and restore the session if it exists
    const session = getActiveSessionBySessionId(existingSessionId);

    if (session) {
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

  sessions.set(sessionId, { sessionId, userId, username, isConnected: false });

  console.log(
    `New session created for connecting socket: ${socket.id}, user details: ${socket.username} (${socket.userId})`
  );

  next();
});

io.on("connection", (socket) => {
  console.log(`user connected - ${socket.username} (${socket.userId})`);

  const userSession = getActiveSessionBySessionId(socket.sessionId);
  sessions.set(socket.sessionId, { ...userSession, isConnected: true });

  const activeGame = getActiveGameByUserId(socket.userId);

  if (activeGame) {
    io.to(activeGame.id).emit("USER_CONNECTED", socket.userId);
  }

  //join userId room to keep all user sockets grouped
  socket.join(socket.userId);

  socket.on("disconnect", () => {
    console.log(`${socket.userId} disconnected`);
    handleAbandon(socket.userId);
  });

  //send session details to connecting socket
  socket.emit("SESSION_INITIALISED", {
    sessionId: socket.sessionId,
    userId: socket.userId,
    username: socket.username,
  });

  socket.on("AWAITING_GAME", async () => {
    try {
      //if user already has game, rejoin and return state
      const game = getActiveGameByUserId(socket.userId);

      if (game) {
        console.log(
          `returning ${socket.username} (${socket.userId}) to game ${game.id}`
        );

        socket.join(game.id);
        //TODO: extract into function
        socket.emit("GAME_INITIALISED", {
          userDetails: getPlayerUserDetailsByGameId(game.id),
          gameState: game.getFullGameState(),
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
        console.log("Initialising new game");

        const playerSocketsToAction = onlinePlayerSockets.slice(0, 2);

        const newGame = new Game(playerSocketsToAction);
        newGame.init();

        //find all associated sockets for each player and add them to game room
        for (const playerSocket of playerSocketsToAction) {
          const userId = playerSocket.userId;
          console.log(userId, `- joining game ${newGame.id}`);
          io.in(userId).socketsJoin(newGame.id);

          console.log(userId, `- leaving lobby`);
          io.in(userId).socketsLeave("lobby");
        }

        activeGames.set(newGame.id, newGame);

        io.to(newGame.id).emit("GAME_INITIALISED", {
          userDetails: getPlayerUserDetailsByGameId(newGame.id),
          gameState: newGame.getFullGameState(),
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
    const game = getActiveGameByUserId(socket.userId);

    try {
      if (game) {
        game.move(socket.userId, move);

        io.to(game.id).emit("GAME_STATE_UPDATED", game.getGameState());
      } else {
        throw new Error("game not found");
      }
    } catch (e) {
      handleError(game.id, `Error when performing move - ${e}`);
    }
  });

  socket.on("POST_PROMOTION_OPTION", ({ newType }) => {
    const game = getActiveGameByUserId(socket.userId);

    try {
      if (game) {
        game.promote(socket.userId, newType);

        io.to(game.id).emit("GAME_STATE_UPDATED", game.getGameState());
      }
    } catch (e) {
      handleError(game.id, `Error promoting piece - ${e}`);
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
  const game = getActiveGameByUserId(userId);

  try {
    if (game) {
      game.forfeit(userId);

      io.to(game.id).emit("GAME_STATE_UPDATED", game.getGameState());
    } else {
      throw new Error("game not found");
    }
  } catch (e) {
    handleError(game?.id, `Error when attempting to forfeit - ${e}`);
  }
};

const handleLeaveGame = (userId) => {
  const game = getActiveGameByUserId(userId);

  try {
    if (game) {
      game.players.splice(
        game.players.findIndex((player) => player.userId === userId),
        1
      );

      io.in(userId).socketsLeave(game.id);

      console.log(`${userId} has left game ${game.id}`);

      //if both players have left, remove the game from game store
      if (game.players.length === 0) {
        activeGames.delete(game.id);
        console.log(`removed game ${game.id}`);
      }
    } else {
      throw new Error("game not found");
    }
  } catch (e) {
    handleError(game?.id, `Error when attempting to leave - ${e}`);
  }
};

const handleAbandon = (userId) => {
  handleForfeit(userId);
  handleLeaveGame(userId);
};
