import Board from "./board/board.js";
import {
  getCheckingPieces,
  getLegalMoves,
  isPromotable,
  movePiece,
  setPieces,
} from "../engine.js";
import { Allegiance } from "../enums/enums.js";
import Player from "./player.js";

export default class Game {
  id;
  players = [];
  board = [];
  moveHistory = [];
  isStalemate = false;
  isCheckmate = false;
  //TODO: don't like these as game state fields
  checkingPieces = [];
  promotableCoords = null;

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

    console.log(this.getActivePlayer().legalMoves);
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

  handleMove({ from, to }) {
    this.promotableCoords = isPromotable(this.board, from, to) ? to : null;

    movePiece(this.board, from, to);

    this.moveHistory.push({
      from,
      to,
    });

    //if piece is promotable, delay next turn until promotion has been actioned
    if (!this.promotableCoords) {
      this.handleNextTurn();
    }
  }

  handleNextTurn() {
    this.getActivePlayer().legalMoves = [];
    this.toggleActivePlayer();

    this.checkingPieces = getCheckingPieces(
      this.board,
      this.getActivePlayer().allegiance
    );

    console.log("board = ", this.board);
    this.getActivePlayer().legalMoves = getLegalMoves({
      board: this.board,
      allegiance: this.getActivePlayer().allegiance,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });

    if (this.getActivePlayer().legalMoves.length) {
      if (this.checkingPieces.length) {
        this.isCheckmate = true;
        console.log(`checkmate! ${this.getActivePlayer.allegiance} loses!`);
      } else {
        this.isStalemate = true;
        console.log(`stalemate!`);
      }
    }
  }
}
