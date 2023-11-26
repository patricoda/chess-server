import Board from "./board/board.js";
import {
  getCheckingPieces,
  getLegalMoves,
  isPromotable,
  movePiece,
  promotePiece,
  setPieces,
} from "../engine.js";
import { Allegiance } from "../enums/enums.js";
import Player from "./player.js";

export default class Game {
  id;
  players = [];
  board = [];
  moveHistory = [];
  promotionState = { isAwaitingPromotionSelection: false, coords: "" };
  promotableCoords = null;
  isStalemate = false;
  isCheckmate = false;
  //TODO: don't like these as game state fields
  checkingPieces = [];

  constructor(id, playerIds) {
    this.id = id;
    this.board = new Board();
    this.setPlayers(playerIds);
  }

  init() {
    //TODO: pass FEN string to determine initial state
    setPieces(this.board);
    this.getActivePlayer().legalMoves = getLegalMoves({
      board: this.board,
      allegiance: this.getActivePlayer().allegiance,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });
  }

  setPlayers(sockets) {
    //randomly select player to play white
    const whitePlayerId =
      sockets[Math.floor(Math.random() * sockets.length)].id;

    for (const socket of sockets) {
      //TODO definitely don't want to use socket IDs
      const id = socket.id;
      const isWhitePlayer = id === whitePlayerId;

      const newPlayer = new Player(
        id,
        isWhitePlayer ? Allegiance.WHITE : Allegiance.BLACK,
        isWhitePlayer
      );

      this.players.push(newPlayer);
    }
  }

  toggleActivePlayer() {
    for (const player of this.players) {
      player.isPlayerTurn = !player.isPlayerTurn;
    }
  }

  getActivePlayer() {
    return this.players.find((player) => player.isPlayerTurn);
  }

  handleMoveReceived(move) {
    this.move(move);

    //if piece is promotable, delay next turn until promotion has been actioned
    if (!this.promotionState.isAwaitingPromotionSelection) {
      console.log("handling next turn");
      this.startNextTurn();
    } else {
      console.log("awaiting promotion");
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

  handlePromotionSelectionReceived(newRank) {
    if (this.promotionState.isAwaitingPromotionSelection) {
      console.log("promoting piece");
      this.promote(newRank);

      console.log("handling next turn");
      this.startNextTurn();
    }
  }

  promote(newRank) {
    promotePiece(this.board, this.promotionState.coords, newRank);
    this.promotionState.isAwaitingPromotionSelection = false;
    this.promotionState.coords = null;
  }

  startNextTurn() {
    this.getActivePlayer().legalMoves = {};
    this.toggleActivePlayer();

    this.checkingPieces = getCheckingPieces(
      this.board,
      this.getActivePlayer().allegiance
    );

    this.getActivePlayer().legalMoves = getLegalMoves({
      board: this.board,
      allegiance: this.getActivePlayer().allegiance,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });

    //check for checkmate / stalemate
    this.checkGameCondition();
  }

  checkGameCondition() {
    if (!Object.keys(this.getActivePlayer().legalMoves).length) {
      if (this.checkingPieces.length) {
        this.isCheckmate = true;
        console.log(`checkmate! ${this.getActivePlayer().allegiance} loses!`);
      } else {
        this.isStalemate = true;
        console.log(`stalemate!`);
      }
    }
  }

  //construct game state object intended to be sent to clients
  toSendableObject() {
    return {
      gameId: this.id,
      players: this.players.map(
        ({ id, name, allegiance, legalMoves, isPlayerTurn }) => ({
          id,
          name,
          allegiance,
          legalMoves,
          isPlayerTurn,
        })
      ),
      //TODO send board as FEN string
      boardState: JSON.stringify(this.board),
      isAwaitingPromotionSelection:
        this.promotionState.isAwaitingPromotionSelection,
      isStalemate: this.isStalemate,
      isCheckmate: this.isCheckmate,
      moveHistory: this.moveHistory,
    };
  }
}
