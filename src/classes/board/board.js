import { immerable } from "immer";
import Tile from "./tile.js";
import {
  COLUMN_VALUES,
  ROW_VALUES,
  boardDimensions,
} from "../../utils/values.js";
import { Allegiance, PieceType } from "../../enums/enums.js";
import Piece from "../piece.js";

export default class Board {
  [immerable] = true;
  tiles = [];

  constructor() {
    this.generateTiles();
  }

  generateTiles() {
    this.tiles = [...Array(boardDimensions.rows)].map((row, r) =>
      [...Array(boardDimensions.columns)].map((col, c) => new Tile(r, c))
    );
  }

  getTile(row, col) {
    return this.tiles[row][col];
  }

  getTileByCoords(coords) {
    const [col, row] = coords.split("");

    return this.getTile(
      ROW_VALUES.length - 1 - ROW_VALUES.indexOf(row),
      COLUMN_VALUES.indexOf(col)
    );
  }

  setPieces = () => {
    this.tiles[0][0].piece = new Piece(Allegiance.BLACK, PieceType.ROOK);
    this.tiles[0][1].piece = new Piece(Allegiance.BLACK, PieceType.KNIGHT);
    this.tiles[0][2].piece = new Piece(Allegiance.BLACK, PieceType.BISHOP);
    this.tiles[0][3].piece = new Piece(Allegiance.BLACK, PieceType.QUEEN);
    this.tiles[0][4].piece = new Piece(Allegiance.BLACK, PieceType.KING);
    this.tiles[0][5].piece = new Piece(Allegiance.BLACK, PieceType.BISHOP);
    this.tiles[0][6].piece = new Piece(Allegiance.BLACK, PieceType.KNIGHT);
    this.tiles[0][7].piece = new Piece(Allegiance.BLACK, PieceType.ROOK);

    this.tiles[1][0].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][1].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][2].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][3].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][4].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][5].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][6].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);
    this.tiles[1][7].piece = new Piece(Allegiance.BLACK, PieceType.PAWN);

    this.tiles[6][0].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][1].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][2].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][3].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][4].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][5].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][6].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);
    this.tiles[6][7].piece = new Piece(Allegiance.WHITE, PieceType.PAWN);

    this.tiles[7][0].piece = new Piece(Allegiance.WHITE, PieceType.ROOK);
    this.tiles[7][1].piece = new Piece(Allegiance.WHITE, PieceType.KNIGHT);
    this.tiles[7][2].piece = new Piece(Allegiance.WHITE, PieceType.BISHOP);
    this.tiles[7][3].piece = new Piece(Allegiance.WHITE, PieceType.QUEEN);
    this.tiles[7][4].piece = new Piece(Allegiance.WHITE, PieceType.KING);
    this.tiles[7][5].piece = new Piece(Allegiance.WHITE, PieceType.BISHOP);
    this.tiles[7][6].piece = new Piece(Allegiance.WHITE, PieceType.KNIGHT);
    this.tiles[7][7].piece = new Piece(Allegiance.WHITE, PieceType.ROOK);
  };

  //TODO: convert board to simple board state object
  toFen() {}
}
