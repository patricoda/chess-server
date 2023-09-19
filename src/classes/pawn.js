import { PieceType } from "../enums/enums";
import Piece from "./piece";

export default class Pawn extends Piece {
  type = PieceType.PAWN;
  pushMoves = [];
  captureMoves = [];

  isValidMove(row, col) {
    return [...this.pushMoves, ...this.captureMoves].some(
      (move) => move.row === row && move.col === col
    );
  }

  isCapturable(capturingPiece) {
    return this.allegiance !== capturingPiece.allegiance;
  }
}
