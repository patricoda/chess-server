export default class Player {
  id;
  allegiance;
  legalMoves = [];

  constructor(id, allegiance) {
    this.id = id;
    this.allegiance = allegiance;
  }
}
