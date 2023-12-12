import Board from "./board/board.js";
import {
  getCheckingPieces,
  getLegalMoves,
  isPromotable,
  movePiece,
  promotePiece,
  setPieces,
} from "../engine.js";
import { Allegiance, GameStatus, PieceType } from "../enums/enums.js";
import Player from "./player.js";

export default class Game {
  id = null;
  status = GameStatus.NOT_STARTED;
  playerTurn = Allegiance.WHITE;
  legalMoves = {};
  players = [];
  board = [];
  moveHistory = [];
  promotionState = { isAwaitingPromotionSelection: false, coords: "" };
  winningPlayer = null;
  //TODO: don't like these as game state fields
  checkingPieces = [];

  constructor(id, players) {
    this.id = id;
    this.board = new Board();
    this.setPlayers(players);
  }

  init() {
    //TODO: pass FEN string to determine initial state
    setPieces(this.board);
    this.legalMoves = getLegalMoves({
      board: this.board,
      allegiance: this.getActivePlayer().allegiance,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });
    this.status = GameStatus.IN_PROGRESS;
  }

  setPlayers(players) {
    //randomly select player to play white
    const whitePlayerId =
      players[Math.floor(Math.random() * players.length)].userId;

    for (const { userId } of players) {
      const isWhitePlayer = userId === whitePlayerId;

      const newPlayer = new Player(
        userId,
        isWhitePlayer ? Allegiance.WHITE : Allegiance.BLACK
      );

      this.players.push(newPlayer);
    }
  }

  togglePlayerTurn() {
    this.playerTurn =
      this.playerTurn === Allegiance.WHITE
        ? Allegiance.BLACK
        : Allegiance.WHITE;
  }

  getActivePlayer() {
    return this.players.find((player) => player.allegiance === this.playerTurn);
  }

  getInactivePlayer() {
    return this.players.find((player) => player.allegiance !== this.playerTurn);
  }

  handleMoveReceived(userId, move) {
    const activePlayer = this.getActivePlayer();

    if (activePlayer.userId !== userId) {
      throw new Error(
        "Move cannot be made by any player other than the active player"
      );
    } else {
      const { from, to } = move;

      if (this.legalMoves[from]?.some((legalMove) => legalMove === to)) {
        this.move(move);

        //if piece is promotable, delay next turn until promotion has been actioned
        if (!this.promotionState.isAwaitingPromotionSelection) {
          this.startNextTurn();
        }
      } else {
        throw new Error("Move is not legal");
      }
    }
  }

  move({ from, to }) {
    if (isPromotable(this.board, from, to)) {
      this.promotionState.isAwaitingPromotionSelection = true;
      this.promotionState.coords = to;
    }

    movePiece(this.board, from, to);

    this.moveHistory.push({
      from,
      to,
    });
  }

  handlePromotionSelectionReceived(userId, newType) {
    const activePlayer = this.getActivePlayer();

    if (activePlayer.userId !== userId) {
      throw new Error(
        "Move cannot be made by any player other than the active player"
      );
    } else {
      if (
        this.promotionState.isAwaitingPromotionSelection &&
        PieceType[newType]
      ) {
        this.promote(newType);
        this.startNextTurn();
      } else {
        throw new Error("Promotion selection is not valid");
      }
    }
  }

  promote(newType) {
    promotePiece(this.board, this.promotionState.coords, newType);
    this.promotionState.isAwaitingPromotionSelection = false;
    this.promotionState.coords = null;
  }

  startNextTurn() {
    this.legalMoves = {};
    this.togglePlayerTurn();

    this.checkingPieces = getCheckingPieces(
      this.board,
      this.getActivePlayer().allegiance
    );

    this.legalMoves = getLegalMoves({
      board: this.board,
      allegiance: this.getActivePlayer().allegiance,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });

    //check for checkmate / stalemate
    this.checkGameCondition();
  }

  handleForfeit(userId) {
    const winner = this.players.find((player) => player.userId !== userId);
    this.endGame(GameStatus.FORFEIT, winner);
  }

  checkGameCondition() {
    if (!Object.keys(this.legalMoves).length) {
      if (this.checkingPieces.length) {
        this.endGame(GameStatus.CHECKMATE, this.getInactivePlayer());
      } else {
        this.endGame(GameStatus.STALEMATE);
      }
    }
  }

  endGame(status, winningPlayer) {
    this.status = status;
    this.winningPlayer = winningPlayer;
    this.legalMoves = {};

    if (status === GameStatus.CHECKMATE) {
      console.log(
        `${this.id} has ended in checkmate. Winner: ${winningPlayer.allegiance}`
      );
    } else if (status === GameStatus.STALEMATE) {
      console.log(`${this.id} has ended in stalemate.`);
    } else {
      console.log(
        `${this.id} has ended with a forfeit. Winner: ${winningPlayer.allegiance}`
      );
    }
  }

  //construct full game state object intended to be sent to clients on initialisation
  toGameInitialisedObject() {
    const { board, players, promotionState, ...otherFields } = this;
    return {
      ...otherFields,
      players: players.map(({ userId, allegiance }) => ({
        userId,
        allegiance,
      })),
      //TODO send board as FEN string
      boardState: JSON.stringify(board),
      isAwaitingPromotionSelection: promotionState.isAwaitingPromotionSelection,
    };
  }

  //construct game state object intended to be sent to clients on each turn
  toCurrentGameStatusObject() {
    const {
      id,
      status,
      playerTurn,
      legalMoves,
      board,
      moveHistory,
      promotionState,
      winningPlayer,
    } = this;

    return {
      id,
      status,
      playerTurn,
      legalMoves,
      //TODO send board as FEN string
      boardState: JSON.stringify(board),
      moveHistory,
      isAwaitingPromotionSelection: promotionState.isAwaitingPromotionSelection,
      winningPlayer,
    };
  }
}
