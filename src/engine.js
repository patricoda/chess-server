import Piece from "../../classes/piece";
import Pawn from "../../classes/pawn";
import {
  Allegiance,
  DirectionOperator,
  PieceType,
  SlidingPieceType,
} from "../../enums/enums";
import { boardDimensions } from "../../utils/values";

export const setPieces = (board) => {
  board.tiles[0][0].piece = new Piece(Allegiance.BLACK, PieceType.ROOK);
  board.tiles[0][1].piece = new Piece(Allegiance.BLACK, PieceType.KNIGHT);
  board.tiles[0][2].piece = new Piece(Allegiance.BLACK, PieceType.BISHOP);
  board.tiles[0][3].piece = new Piece(Allegiance.BLACK, PieceType.QUEEN);
  board.tiles[0][4].piece = new Piece(Allegiance.BLACK, PieceType.KING);
  board.tiles[0][5].piece = new Piece(Allegiance.BLACK, PieceType.BISHOP);
  board.tiles[0][6].piece = new Piece(Allegiance.BLACK, PieceType.KNIGHT);
  board.tiles[0][7].piece = new Piece(Allegiance.BLACK, PieceType.ROOK);

  board.tiles[1][0].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][1].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][2].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][3].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][4].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][5].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][6].piece = new Pawn(Allegiance.BLACK);
  board.tiles[1][7].piece = new Pawn(Allegiance.BLACK);

  board.tiles[6][0].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][1].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][2].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][3].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][4].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][5].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][6].piece = new Pawn(Allegiance.WHITE);
  board.tiles[6][7].piece = new Pawn(Allegiance.WHITE);

  board.tiles[7][0].piece = new Piece(Allegiance.WHITE, PieceType.ROOK);
  board.tiles[7][1].piece = new Piece(Allegiance.WHITE, PieceType.KNIGHT);
  board.tiles[7][2].piece = new Piece(Allegiance.WHITE, PieceType.BISHOP);
  board.tiles[7][3].piece = new Piece(Allegiance.WHITE, PieceType.QUEEN);
  board.tiles[7][4].piece = new Piece(Allegiance.WHITE, PieceType.KING);
  board.tiles[7][5].piece = new Piece(Allegiance.WHITE, PieceType.BISHOP);
  board.tiles[7][6].piece = new Piece(Allegiance.WHITE, PieceType.KNIGHT);
  board.tiles[7][7].piece = new Piece(Allegiance.WHITE, PieceType.ROOK);
};

export const movePiece = (board, source, destination) => {
  const sourceTile = board.getTileByCoords(source);
  const destinationTile = board.getTileByCoords(destination);

  const sourcePiece = sourceTile.piece;

  //handle en passant
  if (sourcePiece.type === PieceType.PAWN) {
    const enPassantPawnCoords = sourcePiece.captureMoves.find(
      ({ row, col }) =>
        col === destinationTile.col && row === destinationTile.row
    )?.enPassantPawnCoords;

    if (enPassantPawnCoords) {
      const enPassantPawnTile = board.getTile(
        enPassantPawnCoords.row,
        enPassantPawnCoords.col
      );

      enPassantPawnTile.piece = null;
    }
  }

  //handle castling
  if (sourcePiece.type === PieceType.KING && !sourcePiece.hasMoved) {
    const castlingRookCoords = sourcePiece.validMoves.find(
      ({ row, col }) =>
        col === destinationTile.col && row === destinationTile.row
    ).castlingRookCoords;

    if (castlingRookCoords) {
      const rookSourceTile = board.getTile(
        castlingRookCoords.source.row,
        castlingRookCoords.source.col
      );

      const rookDestinationTile = board.getTile(
        castlingRookCoords.destination.row,
        castlingRookCoords.destination.col
      );

      rookDestinationTile.piece = rookSourceTile.piece;
      rookDestinationTile.piece.hasMoved = true;
      rookSourceTile.piece = null;
    }
  }

  destinationTile.piece = sourcePiece;
  destinationTile.piece.hasMoved = true;
  sourceTile.piece = null;
};

export const getCheckingPieces = ({ board, activePlayer }) => {
  const flatTileArray = board.tiles.flat();

  //test moves from king tile for different types of movement type, and see if that piece is present
  //to determine
  const kingTile = flatTileArray.find(
    ({ piece }) =>
      piece?.type === PieceType.KING && piece?.allegiance === activePlayer
  );

  const direction =
    kingTile.piece.allegiance === Allegiance.BLACK
      ? DirectionOperator.PLUS
      : DirectionOperator.MINUS;

  const pawnCheckingTiles = getPawnCaptureMoves(
    board,
    kingTile,
    direction
  ).pseudoMoves.reduce((acc, { row, col }) => {
    const tile = board.getTile(row, col);
    const { piece } = tile;

    return piece?.type === PieceType.PAWN && piece?.allegiance !== activePlayer
      ? [...acc, tile]
      : acc;
  }, []);

  const knightCheckingTiles = getKnightMoves(board, kingTile).reduce(
    (acc, { row, col }) => {
      const tile = board.getTile(row, col);
      const { piece } = tile;

      return piece?.type === PieceType.KNIGHT &&
        piece?.allegiance !== activePlayer
        ? [...acc, tile]
        : acc;
    },
    []
  );

  const lateralCheckingTiles = getLateralMoves(board, kingTile).reduce(
    (acc, { row, col }) => {
      const tile = board.getTile(row, col);
      const { piece } = tile;

      return (piece?.type === PieceType.ROOK ||
        piece?.type === PieceType.QUEEN) &&
        piece?.allegiance !== activePlayer
        ? [...acc, tile]
        : acc;
    },
    []
  );

  const diagonalCheckingTiles = getDiagonalMoves(board, kingTile).reduce(
    (acc, { row, col }) => {
      const tile = board.getTile(row, col);
      const { piece } = tile;

      return (piece?.type === PieceType.BISHOP ||
        piece?.type === PieceType.QUEEN) &&
        piece?.allegiance !== activePlayer
        ? [...acc, tile]
        : acc;
    },
    []
  );

  const checkingTiles = [
    ...pawnCheckingTiles,
    ...knightCheckingTiles,
    ...lateralCheckingTiles,
    ...diagonalCheckingTiles,
  ];

  return checkingTiles;
};

const evaluatePins = (board, kingTile) => {
  const flatTileArray = board.tiles.flat();

  const lateralAttackingTiles = getLateralMoves(
    board,
    kingTile,
    boardDimensions.rows,
    true
  ).reduce((acc, { row, col }) => {
    const tile = board.getTile(row, col);
    const { piece } = tile;

    return (piece?.type === PieceType.ROOK ||
      piece?.type === PieceType.QUEEN) &&
      piece?.allegiance !== kingTile.piece.allegiance
      ? [...acc, tile]
      : acc;
  }, []);

  const diagonalAttackingTiles = getDiagonalMoves(
    board,
    kingTile,
    boardDimensions.rows,
    true
  ).reduce((acc, { row, col }) => {
    const tile = board.getTile(row, col);
    const { piece } = tile;

    return (piece?.type === PieceType.BISHOP ||
      piece?.type === PieceType.QUEEN) &&
      piece?.allegiance !== kingTile.piece.allegiance
      ? [...acc, tile]
      : acc;
  }, []);

  for (const attackingTile of [
    ...lateralAttackingTiles,
    ...diagonalAttackingTiles,
  ]) {
    //TODO: consider getDirectLineBetweenTiles returning tiles not coords..?
    const inbetweenTileCoords = getDirectLineBetweenTiles(
      board,
      attackingTile,
      kingTile,
      true
    );

    const inbetweenTilesWithPieces = flatTileArray.filter(
      (tile) =>
        tile.piece &&
        inbetweenTileCoords.find(({ row, col }) => {
          return tile.row === row && tile.col === col;
        })
    );

    //if there is a single piece between an opposing sliding piece and the king, it is pinned
    if (inbetweenTilesWithPieces.length === 1) {
      const piece = inbetweenTilesWithPieces[0].piece;

      if (piece.allegiance !== kingTile.piece.allegiance) {
        continue;
      } else {
        if (piece.type === PieceType.PAWN) {
          piece.pushMoves = piece.pushMoves.filter((move) =>
            inbetweenTileCoords.some(
              ({ row, col }) => move.row === row && move.col === col
            )
          );

          piece.captureMoves = piece.captureMoves.filter(
            (move) =>
              move.row === attackingTile.row && move.col === attackingTile.col
          );
        } else {
          piece.validMoves = piece.validMoves.filter(
            ({ row, col }) =>
              (row === attackingTile.row && col === attackingTile.col) ||
              inbetweenTileCoords.some(
                (tile) => row === tile.row && col === tile.col
              )
          );
        }

        piece.isPinned = true;
      }
    }
  }
};

const handleSingleCheck = (
  board,
  currentPlayerPopulatedTiles,
  kingTile,
  checkingTile
) => {
  const { piece: checkingPiece } = checkingTile;
  //if checker is a sliding piece, check for blocking / capture moves
  const isSlidingPiece = !!SlidingPieceType[checkingPiece.type];
  let tilesInCheck = [];

  //get tiles on shared line between king and checking piece to evaluate blockers and escape moves
  if (isSlidingPiece) {
    tilesInCheck = getDirectLineBetweenTiles(board, checkingTile, kingTile);
  }

  for (const tile of currentPlayerPopulatedTiles) {
    const piece = tile.piece;

    if (tile !== kingTile && !piece.isPinned) {
      //TODO: this block is very similar to generating pins, reuse possible?
      if (piece.type === PieceType.PAWN) {
        piece.pushMoves = piece.pushMoves.filter(({ row, col }) =>
          tilesInCheck.some((tile) => tile.row === row && tile.col === col)
        );

        piece.captureMoves = piece.captureMoves.filter(
          ({ row, col }) => checkingTile.row === row && checkingTile.col === col
        );
      } else {
        piece.validMoves = piece.validMoves.filter(
          ({ row, col }) =>
            (checkingTile.row === row && checkingTile.col === col) ||
            tilesInCheck.some((tile) => tile.row === row && tile.col === col)
        );
      }
    }
  }
};

export const getActivePlayerValidMoves = ({ board, activePlayer }) => {
  const flattenedTileArray = board.tiles.flat();

  const tilesWithValidMoves = flattenedTileArray.filter(
    ({ piece }) => piece?.allegiance === activePlayer && piece.validMoves.length
  );

  return tilesWithValidMoves;
};

export const generateLegalMoves = ({
  board,
  activePlayer,
  checkingPieces,
  moveHistory,
}) => {
  const tiles = board.tiles.flat();

  const currentPlayerPopulatedTiles = tiles.filter(
    (tile) => tile.piece?.allegiance === activePlayer
  );

  for (const tile of currentPlayerPopulatedTiles) {
    generatePseudoLegalMoves(board, tile, moveHistory[moveHistory.length - 1]);
    tile.piece.isPinned = false;
  }

  const kingTile = currentPlayerPopulatedTiles.find(
    (tile) => tile.piece.type === PieceType.KING
  );

  //if there are two checking pieces, only king moves are valid
  if (checkingPieces.length !== 2) {
    evaluatePins(board, kingTile);
  }

  //if there is only one checking piece, filter moves so that pieces can only block check
  if (checkingPieces.length === 1) {
    handleSingleCheck(
      board,
      currentPlayerPopulatedTiles,
      kingTile,
      checkingPieces[0]
    );
  }

  //filter king moves based on attacking tiles, etc
  evaluateLegalKngMoves(board, kingTile);
};

export const evaluateLegalKngMoves = (board, kingTile) => {
  //for each move, move the king temporarily, and see if it would be in check
  kingTile.piece.validMoves = kingTile.piece.validMoves.filter((move) => {
    const destinationTile = board.getTile(move.row, move.col);
    const kingPiece = kingTile.piece;
    const piece = destinationTile.piece;

    destinationTile.piece = kingTile.piece;
    kingTile.piece = null;

    const tileIsAttacked = !!getCheckingPieces({
      board,
      activePlayer: kingPiece.allegiance,
    }).length;

    destinationTile.piece = piece;
    kingTile.piece = kingPiece;

    return !tileIsAttacked;
  });
};

//get direct tile coordinates on line shared between two tiles, only works on straight lines.
const getDirectLineBetweenTiles = (
  board,
  tile1,
  tile2,
  generateMovesPastBlockers = false
) => {
  const { row: tile1Row, col: tile1Col } = tile1;
  const { row: tile2Row, col: tile2Col } = tile2;

  //determine direction towards tile
  const rowDirection =
    tile2Row > tile1Row
      ? DirectionOperator.PLUS
      : tile2Row < tile1Row
      ? DirectionOperator.MINUS
      : null;

  const colDirection =
    tile2Col > tile1Col
      ? DirectionOperator.PLUS
      : tile2Col < tile1Col
      ? DirectionOperator.MINUS
      : null;

  const distance =
    rowDirection === null
      ? Math.abs(tile2Col - tile1Col)
      : Math.abs(tile2Row - tile1Row);

  return generateMovesInDirection(
    board,
    rowDirection,
    colDirection,
    distance,
    tile1,
    generateMovesPastBlockers
  );
};

export const generatePseudoLegalMoves = (
  board,
  actionedTile,
  mostRecentMove
) => {
  const validMoves = [];
  const piece = actionedTile.piece;

  switch (piece.type) {
    case PieceType.PAWN:
      const { pushMoves, captureMoves } = getPawnMoves(
        board,
        actionedTile,
        mostRecentMove
      );
      piece.pushMoves = pushMoves;
      piece.captureMoves = captureMoves;
      return;
    case PieceType.ROOK:
      validMoves.push(...getLateralMoves(board, actionedTile));
      break;
    case PieceType.KNIGHT:
      validMoves.push(...getKnightMoves(board, actionedTile));
      break;
    case PieceType.BISHOP:
      validMoves.push(...getDiagonalMoves(board, actionedTile));
      break;
    case PieceType.KING:
      validMoves.push(...getOmnidirectionalMoves(board, actionedTile, 2));
      validMoves.push(...getCastlingMoves(board, actionedTile));
      break;
    case PieceType.QUEEN:
      validMoves.push(...getOmnidirectionalMoves(board, actionedTile));
      break;
    default:
      break;
  }

  piece.validMoves = validMoves;
};

const getCastlingMoves = (board, kingTile) => {
  const { tiles } = board;
  const king = kingTile.piece;
  const castlingMoves = [];

  if (!king.hasMoved) {
    let rowToEvaluate;

    if (king.allegiance === Allegiance.BLACK) {
      rowToEvaluate = tiles[0];
    } else {
      rowToEvaluate = tiles[tiles.length - 1];
    }

    const unmovedRookTiles = rowToEvaluate.filter(
      ({ piece: tilePiece }) =>
        tilePiece &&
        tilePiece.allegiance === king.allegiance &&
        tilePiece.type === PieceType.ROOK &&
        !tilePiece.hasMoved
    );

    for (const rookTile of unmovedRookTiles) {
      const inbetweenTileCoords = getDirectLineBetweenTiles(
        board,
        kingTile,
        rookTile,
        true
      );

      const piecesBetweenKingAndRook = rowToEvaluate.some(
        (tile) =>
          tile.piece &&
          inbetweenTileCoords.find(({ row, col }) => {
            return tile.row === row && tile.col === col;
          })
      );

      if (piecesBetweenKingAndRook) {
        continue;
      } else {
        castlingMoves.push({
          ...inbetweenTileCoords[1],
          castlingRookCoords: {
            source: { row: rookTile.row, col: rookTile.col },
            destination: inbetweenTileCoords[0],
          },
        });
      }
    }
  }

  return castlingMoves;
};

const getPawnMoves = (board, actionedTile, mostRecentMove) => {
  const direction =
    actionedTile.piece.allegiance === Allegiance.BLACK
      ? DirectionOperator.PLUS
      : DirectionOperator.MINUS;

  //pawns follow different rules for movement / capturing pieces
  const pushMoves = getPawnPushMoves(board, actionedTile, direction);

  const { legalMoves: captureMoves } = getPawnCaptureMoves(
    board,
    actionedTile,
    direction,
    mostRecentMove
  );

  return {
    pushMoves,
    captureMoves,
  };
};

const getPawnPushMoves = ({ tiles }, { row, col, piece }, direction) =>
  [
    tiles[nextTile(row, 1, direction)]?.[col],
    !piece.hasMoved && tiles[nextTile(row, 2, direction)]?.[col],
  ]
    .filter((tile) => tile && !tile.piece)
    .map(({ row, col }) => ({
      row,
      col,
    }));

const getPawnCaptureMoves = (
  board,
  { row, col, piece },
  direction,
  mostRecentMove
) => {
  const { tiles } = board;
  const pseudoMoves = [
    tiles[nextTile(row, 1, direction)]?.[col + 1],
    tiles[nextTile(row, 1, direction)]?.[col - 1],
  ]
    .filter((tile) => tile)
    .map(({ row, col }) => ({
      row,
      col,
    }));

  if (mostRecentMove) {
    const mostRecentMoveSourceTile = board.getTileByCoords(
      mostRecentMove.source
    );
    const mostRecentMoveDestinationTile = board.getTileByCoords(
      mostRecentMove.destination
    );

    //check for en passant
    if (
      mostRecentMoveDestinationTile.piece.type === PieceType.PAWN &&
      Math.abs(
        mostRecentMoveSourceTile.row - mostRecentMoveDestinationTile.row
      ) === 2
    ) {
      const adjacentTiles = [tiles[row]?.[col + 1], tiles[row]?.[col - 1]];

      const enPassantTile = adjacentTiles.find(
        (tile) =>
          tile &&
          tile.row === mostRecentMoveDestinationTile.row &&
          tile.col === mostRecentMoveDestinationTile.col
      );

      if (enPassantTile) {
        pseudoMoves.push({
          row: nextTile(row, 1, direction),
          col: enPassantTile.col,
          enPassantPawnCoords: {
            row: enPassantTile.row,
            col: enPassantTile.col,
          },
        });
      }
    }
  }

  const legalMoves = pseudoMoves.filter(
    ({ row, col, enPassantPawnCoords }) =>
      tiles[row][col].piece?.isCapturable(piece) || !!enPassantPawnCoords
  );

  return { pseudoMoves, legalMoves };
};

const getKnightMoves = (
  { tiles },
  { row: pieceRow, col: pieceCol, piece: actionedPiece }
) => {
  const possibleMoves = [
    tiles[pieceRow - 2]?.[pieceCol - 1],
    tiles[pieceRow - 2]?.[pieceCol + 1],
    tiles[pieceRow + 2]?.[pieceCol - 1],
    tiles[pieceRow + 2]?.[pieceCol + 1],
    tiles[pieceRow - 1]?.[pieceCol - 2],
    tiles[pieceRow - 1]?.[pieceCol + 2],
    tiles[pieceRow + 1]?.[pieceCol - 2],
    tiles[pieceRow + 1]?.[pieceCol + 2],
  ];

  return possibleMoves
    .filter(
      (tile) => tile && (!tile.piece || tile.piece.isCapturable(actionedPiece))
    )
    .map(({ row, col }) => ({ row, col }));
};

const getOmnidirectionalMoves = (board, actionedTile, distanceLimit) => [
  ...getLateralMoves(board, actionedTile, distanceLimit),
  ...getDiagonalMoves(board, actionedTile, distanceLimit),
];

const getLateralMoves = (
  board,
  actionedTile,
  distanceLimit = boardDimensions.rows,
  generateMovesPastBlockers = false
) => {
  const moves = [];

  moves.push(
    ...generateMovesInDirection(
      board,
      DirectionOperator.MINUS,
      null,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  moves.push(
    ...generateMovesInDirection(
      board,
      DirectionOperator.PLUS,
      null,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  moves.push(
    ...generateMovesInDirection(
      board,
      null,
      DirectionOperator.MINUS,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  moves.push(
    ...generateMovesInDirection(
      board,
      null,
      DirectionOperator.PLUS,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  return moves;
};

const getDiagonalMoves = (
  board,
  actionedTile,
  distanceLimit = boardDimensions.rows,
  generateMovesPastBlockers = false
) => {
  const moves = [];

  moves.push(
    ...generateMovesInDirection(
      board,
      DirectionOperator.MINUS,
      DirectionOperator.MINUS,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  moves.push(
    ...generateMovesInDirection(
      board,
      DirectionOperator.MINUS,
      DirectionOperator.PLUS,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  moves.push(
    ...generateMovesInDirection(
      board,
      DirectionOperator.PLUS,
      DirectionOperator.MINUS,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  moves.push(
    ...generateMovesInDirection(
      board,
      DirectionOperator.PLUS,
      DirectionOperator.PLUS,
      distanceLimit,
      actionedTile,
      generateMovesPastBlockers
    )
  );

  return moves;
};

const generateMovesInDirection = (
  { tiles },
  rowDirection,
  colDirection,
  distanceLimit,
  { row: pieceRow, col: pieceCol, piece: actionedPiece },
  generateMovesPastBlockers = false
) => {
  const moves = [];

  for (let i = 1; i < distanceLimit; i++) {
    const tile =
      tiles[nextTile(pieceRow, i, rowDirection)]?.[
        nextTile(pieceCol, i, colDirection)
      ];

    if (tile) {
      const { row, col, piece } = tile;

      if (!generateMovesPastBlockers && piece) {
        if (piece.isCapturable(actionedPiece)) {
          moves.push({ row, col });
        }
        return moves;
      }

      moves.push({ row, col });
    } else {
      return moves;
    }
  }

  return moves;
};

const nextTile = (a, b, direction) => {
  switch (direction) {
    case DirectionOperator.PLUS:
      return a + b;
    case DirectionOperator.MINUS:
      return a - b;
    default:
      return a;
  }
};

export const hasMovedToEndOfBoard = (piece, destinationTile) =>
  (piece.allegiance === Allegiance.BLACK &&
    destinationTile.row === boardDimensions.rows - 1) ||
  (piece.allegiance === Allegiance.WHITE && destinationTile.row === 0);

export const promotePiece = (board, coords, newRank) => {
  const sourceTile = board.getTileByCoords(coords);

  sourceTile.piece = new Piece(sourceTile.piece.allegiance, newRank);
};

export const isPromotable = (board, source, destination) => {
  const sourceTile = board.getTileByCoords(source);
  const destinationTile = board.getTileByCoords(destination);

  return (
    sourceTile.piece.type === PieceType.PAWN &&
    hasMovedToEndOfBoard(sourceTile.piece, destinationTile)
  );
};
