import { immerable } from "immer";
import { boardDimensions } from "../../utils/values";

const COLUMN_VALUES = "abcdefgh";

export default class Tile {
  [immerable] = true;
  row;
  col;
  piece = null;

  constructor(row, col) {
    this.row = row;
    this.col = col;
  }

  get chessCoords() {
    return `${COLUMN_VALUES[this.col] + (boardDimensions.rows - this.row)}`;
  }
}
