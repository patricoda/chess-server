import randomUUID from "crypto";
import Board from "../classes/board/board";

export default class Game {
  id;
  players;
  board = [];
  moveHistory = [];

  constructor(players) {
    this.id = randomUUID();
    this.players = players;
    this.board = new Board();
  }
}
