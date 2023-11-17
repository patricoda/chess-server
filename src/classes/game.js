import Board from "./board/board.js";
import { generateLegalMoves, setPieces } from "../engine.js";
import { Allegiance } from "../enums/enums.js";
import Player from "./player.js";

export default class Game {
  id;
  players = [];
  board = [];
  moveHistory = [];
  //TODO: don't like this as a separate field
  checkingPieces = [];
  playerTurn = Allegiance.WHITE;

  constructor(id, playerIds) {
    this.id = id;
    this.board = new Board();
    this.setPlayers(playerIds);
  }

  init() {
    //TODO: set pieces should be in board class
    //TODO: pass FEN string to determine initial state
    this.board.setPieces();
    generateLegalMoves({
      board: this.board,
      allegiance: this.playerTurn,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });
  }

  setPlayers(ids) {
    //randomly select player to play white
    const whitePlayerId = ids[Math.floor(Math.random() * ids.length)];

    for (const id of ids) {
      const isWhitePlayer = id === whitePlayerId;
      const newPlayer = new Player(
        id,
        isWhitePlayer ? Allegiance.WHITE : Allegiance.BLACK
      );

      this.players.push(newPlayer);
    }
  }
}
