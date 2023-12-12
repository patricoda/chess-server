export const GameStatus = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  STALEMATE: "STALEMATE",
  CHECKMATE: "CHECKMATE",
  FORFEIT: "FORFEIT",
});

export const Allegiance = Object.freeze({
  BLACK: "BLACK",
  WHITE: "WHITE",
});

export const PieceType = Object.freeze({
  PAWN: "PAWN",
  KING: "KING",
  QUEEN: "QUEEN",
  ROOK: "ROOK",
  BISHOP: "BISHOP",
  KNIGHT: "KNIGHT",
});

export const SlidingPieceType = Object.freeze({
  QUEEN: "QUEEN",
  ROOK: "ROOK",
  BISHOP: "BISHOP",
});

export const DirectionOperator = Object.freeze({
  PLUS: "PLUS",
  MINUS: "MINUS",
});
