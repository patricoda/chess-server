import { immerable } from "immer";
import Tile from "./tile";
import { COLUMN_VALUES, ROW_VALUES, boardDimensions } from "../../utils/values";

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
}
