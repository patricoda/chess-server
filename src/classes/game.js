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
  id = null;
  players = [];
  board = [];
  moveHistory = [];
  promotionState = { isAwaitingPromotionSelection: false, coords: "" };
  promotableCoords = null;
  isStalemate = false;
  isCheckmate = false;
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
    this.getActivePlayer().legalMoves = getLegalMoves({
      board: this.board,
      allegiance: this.getActivePlayer().allegiance,
      checkingPieces: this.checkingPieces,
      moveHistory: this.moveHistory,
    });
  }

  setPlayers(players) {
    //randomly select player to play white
    const whitePlayerId =
      players[Math.floor(Math.random() * players.length)].userId;

    for (const { userId } of players) {
      const isWhitePlayer = userId === whitePlayerId;

      const newPlayer = new Player(
        userId,
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

  getInactivePlayer() {
    return this.players.find((player) => !player.isPlayerTurn);
  }

  handleMoveReceived(move) {
    this.move(move);

    //if piece is promotable, delay next turn until promotion has been actioned
    if (!this.promotionState.isAwaitingPromotionSelection) {
      this.startNextTurn();
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
      this.promote(newRank);
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
        console.log(
          `${this.id} has ended in checkmate. Winner: ${
            this.getInactivePlayer().allegiance
          }`
        );
        this.isCheckmate = true;
        this.winningPlayer = this.getInactivePlayer();
      } else {
        this.isStalemate = true;
        console.log(`${this.id} has ended in stalemate.`);
      }
    }
  }

  //construct game state object intended to be sent to clients
  toSendableObject() {
    const { board, players, promotionState, ...otherFields } = this;
    return {
      ...otherFields,
      players: players.map(
        ({ id, name, allegiance, legalMoves, isPlayerTurn }) => ({
          id,
          name,
          allegiance,
          legalMoves,
          isPlayerTurn,
        })
      ),
      //TODO send board as FEN string
      boardState: JSON.stringify(board),
      isAwaitingPromotionSelection: promotionState.isAwaitingPromotionSelection,
    };
  }
}
