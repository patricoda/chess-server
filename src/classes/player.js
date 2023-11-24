export default class Player {
  id;
  allegiance;
  isPlayerTurn;
  legalMoves = [];

  constructor(id, allegiance, isPlayerTurn) {
    this.id = id;
    this.allegiance = allegiance;
    this.isPlayerTurn = isPlayerTurn;
  }
}
