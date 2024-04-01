import { Game, Allegiance, GameStatus } from "@patricoda/chess-engine";
import { v4 as uuidv4 } from "uuid";
import Player from "./player.js";

export default class GameSession {
  id = uuidv4();
  game = new Game();
  players = [];

  constructor(playerSockets) {
    this.setPlayers(playerSockets);
  }

  startGame() {
    if (this.players.length === 2) {
      this.game.init();
    } else {
      throw new Error("Game cannot be started as players have not been set");
    }
  }

  setPlayers(playerSockets) {
    if (playerSockets.length === 2) {
      //randomly select player to play white
      const whitePlayerId =
        playerSockets[Math.floor(Math.random() * playerSockets.length)].userId;

      for (const { userId, username } of playerSockets) {
        const isWhitePlayer = userId === whitePlayerId;

        const newPlayer = new Player(
          userId,
          username,
          isWhitePlayer ? Allegiance.WHITE : Allegiance.BLACK
        );

        this.players.push(newPlayer);
      }
    } else {
      throw new Error("A game must have exactly 2 players");
    }
  }

  getActivePlayer() {
    return this.players.find(
      (player) => player.allegiance === this.game.playerTurn
    );
  }

  getInactivePlayer() {
    return this.players.find(
      (player) => player.allegiance !== this.game.playerTurn
    );
  }

  getPlayerByAllegiance(allegiance) {
    return this.players.find((player) => player.allegiance === allegiance);
  }

  handleMove(userId, move) {
    this.#verifyIsActiveUser(userId);
    this.game.move(move);

    if (this.#hasGameEnded()) {
      this.#handleGameEnd();
    }
  }

  handlePromotion(userId, newType) {
    this.#verifyIsActiveUser(userId);
    this.game.promote(newType);

    if (this.#hasGameEnded()) {
      this.#handleGameEnd();
    }
  }

  handleForfeit(userId) {
    const forfeitingPlayer = this.players.find(
      (player) => player.userId === userId
    );
    this.game.forfeit(forfeitingPlayer.allegiance);
    this.#handleGameEnd();
  }

  getSendableState() {
    const { board, promotionState, ...otherFields } = this.game.getGameState();

    return {
      ...otherFields,
      //map class instances to sendable objects
      players: this.players.map(({ userId, username, allegiance }) => ({
        userId,
        username,
        allegiance,
      })),
      board: JSON.stringify(board),
    };
  }

  #verifyIsActiveUser(userId) {
    const activePlayer = this.getActivePlayer();

    if (activePlayer.userId !== userId) {
      throw new Error(
        "Move cannot be made by any player other than the active player"
      );
    }
  }

  #hasGameEnded() {
    const { CHECKMATE, STALEMATE, FORFEIT } = GameStatus;
    return [CHECKMATE, STALEMATE, FORFEIT].includes(this.game.status);
  }

  #handleGameEnd() {
    if (this.game.status === GameStatus.CHECKMATE) {
      console.log(
        `${this.id} has ended in checkmate. Winner: ${
          this.getPlayerByAllegiance(this.game.winningPlayer).userId
        }`
      );
    } else if (this.game.status === GameStatus.STALEMATE) {
      console.log(`${this.id} has ended in stalemate.`);
    } else if (this.game.status === GameStatus.FORFEIT) {
      console.log(
        `${this.id} has ended with a forfeit. Winner: ${
          this.getPlayerByAllegiance(this.game.winningPlayer).userId
        }`
      );
    }
  }
}
