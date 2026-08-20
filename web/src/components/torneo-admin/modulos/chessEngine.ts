/**
 * Motor de Ajedrez Nativo FIDE para Mi Cancha
 * Implementación 100% autónoma en TypeScript sin dependencias externas.
 * Soporta:
 * - Movimientos legales de todas las piezas (Peón, Caballo, Alfil, Torre, Dama, Rey)
 * - Enroque corto (O-O) y largo (O-O-O)
 * - Captura al paso (En passant)
 * - Coronación de peones (Dama, Torre, Alfil, Caballo)
 * - Detección de Jaque, Jaque Mate, Tablas por Ahogado, Material Insuficiente
 * - Notación algebraica estándar (SAN)
 * - Exportación de FEN e historial PGN
 */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = string; // e.g. 'e4', 'a1', etc.

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  promotion?: PieceType;
  flags: {
    isCapture: boolean;
    isEnPassant: boolean;
    isCastlingKingside: boolean;
    isCastlingQueenside: boolean;
    isPromotion: boolean;
    isCheck: boolean;
    isCheckmate: boolean;
  };
  san: string;
}

export type BoardState = (Piece | null)[][]; // 8x8, row 0 is rank 8, row 7 is rank 1

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function squareToCoords(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - 97; // 'a' -> 0
  const rank = 8 - parseInt(sq[1], 10); // '8' -> 0, '1' -> 7
  return [rank, file];
}

export function coordsToSquare(r: number, c: number): Square {
  return `${FILES[c]}${8 - r}`;
}

export class ChessGame {
  private board: BoardState;
  private turnColor: Color;
  private castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  private enPassantSquare: Square | null;
  private halfMoves: number;
  private fullMoves: number;
  private history: Move[];
  private positionHistory: Map<string, number>;

  constructor(fen?: string) {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.turnColor = 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantSquare = null;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = [];
    this.positionHistory = new Map();

    this.loadFen(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  public reset() {
    this.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  public getBoard(): BoardState {
    return this.board.map(row => [...row]);
  }

  public getTurn(): Color {
    return this.turnColor;
  }

  public getHistory(): Move[] {
    return [...this.history];
  }

  public getPiece(sq: Square): Piece | null {
    const [r, c] = squareToCoords(sq);
    return this.board[r]?.[c] || null;
  }

  public loadFen(fen: string) {
    const parts = fen.trim().split(/\s+/);
    const pos = parts[0];
    const turn = parts[1] || 'w';
    const castling = parts[2] || '-';
    const ep = parts[3] || '-';
    const half = parseInt(parts[4] || '0', 10);
    const full = parseInt(parts[5] || '1', 10);

    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    const rows = pos.split('/');
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const char of rows[r]) {
        if (/[1-8]/.test(char)) {
          c += parseInt(char, 10);
        } else {
          const color: Color = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase() as PieceType;
          this.board[r][c] = { type, color };
          c++;
        }
      }
    }

    this.turnColor = turn === 'b' ? 'b' : 'w';
    this.castling = {
      wK: castling.includes('K'),
      wQ: castling.includes('Q'),
      bK: castling.includes('k'),
      bQ: castling.includes('q'),
    };
    this.enPassantSquare = ep !== '-' ? ep : null;
    this.halfMoves = half;
    this.fullMoves = full;
    this.history = [];
    this.positionHistory = new Map();
    this.positionHistory.set(this.getFenPositionKey(), 1);
  }

  public getFen(): string {
    const rows: string[] = [];
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) {
            rowStr += empty;
            empty = 0;
          }
          rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type;
        }
      }
      if (empty > 0) rowStr += empty;
      rows.push(rowStr);
    }

    let castStr = '';
    if (this.castling.wK) castStr += 'K';
    if (this.castling.wQ) castStr += 'Q';
    if (this.castling.bK) castStr += 'k';
    if (this.castling.bQ) castStr += 'q';
    if (!castStr) castStr = '-';

    return `${rows.join('/')} ${this.turnColor} ${castStr} ${this.enPassantSquare || '-'} ${this.halfMoves} ${this.fullMoves}`;
  }

  private getFenPositionKey(): string {
    return this.getFen().split(' ').slice(0, 4).join(' ');
  }

  public inCheck(color?: Color): boolean {
    const targetColor = color || this.turnColor;
    const kingSq = this.findKing(targetColor);
    if (!kingSq) return false;
    return this.isSquareAttacked(kingSq, targetColor === 'w' ? 'b' : 'w');
  }

  private findKing(color: Color): [number, number] | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return [r, c];
        }
      }
    }
    return null;
  }

  public isSquareAttacked(targetCoord: [number, number], byColor: Color): boolean {
    const [tr, tc] = targetCoord;

    // Peones atacantes
    const pawnDir = byColor === 'w' ? 1 : -1; // Peón blanco ataca hacia r-1, negro hacia r+1
    const pR = tr + pawnDir;
    if (pR >= 0 && pR < 8) {
      if (tc - 1 >= 0) {
        const p = this.board[pR][tc - 1];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
      if (tc + 1 < 8) {
        const p = this.board[pR][tc + 1];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
    }

    // Caballos
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
      const nr = tr + dr, nc = tc + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = this.board[nr][nc];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }

    // Alfiles y Damas (diagonales)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let r = tr + dr, c = tc + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        r += dr; c += dc;
      }
    }

    // Torres y Damas (ortogonales)
    const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of orthoDirs) {
      let r = tr + dr, c = tc + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        r += dr; c += dc;
      }
    }

    // Rey
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = tr + dr, nc = tc + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = this.board[nr][nc];
          if (p && p.color === byColor && p.type === 'k') return true;
        }
      }
    }

    return false;
  }

  public getLegalMoves(fromSq?: Square): { from: Square; to: Square; promotion?: PieceType }[] {
    const rawMoves: { from: Square; to: Square; promotion?: PieceType }[] = [];
    const color = this.turnColor;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p.color !== color) continue;
        const sq = coordsToSquare(r, c);
        if (fromSq && sq !== fromSq) continue;

        this.generatePseudoMoves(r, c, p, rawMoves);
      }
    }

    // Filtrar movimientos que dejan en jaque al rey propio
    return rawMoves.filter(m => this.isMoveSafe(m.from, m.to, m.promotion));
  }

  private generatePseudoMoves(
    r: number,
    c: number,
    piece: Piece,
    out: { from: Square; to: Square; promotion?: PieceType }[]
  ) {
    const from = coordsToSquare(r, c);
    const color = piece.color;
    const enemyColor: Color = color === 'w' ? 'b' : 'w';

    if (piece.type === 'p') {
      const fwd = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      const promRank = color === 'w' ? 0 : 7;

      // 1 paso adelante
      const nextR = r + fwd;
      if (nextR >= 0 && nextR < 8 && !this.board[nextR][c]) {
        if (nextR === promRank) {
          ['q', 'r', 'b', 'n'].forEach(pr => out.push({ from, to: coordsToSquare(nextR, c), promotion: pr as PieceType }));
        } else {
          out.push({ from, to: coordsToSquare(nextR, c) });
          // 2 pasos desde inicio
          if (r === startRank) {
            const doubleR = r + 2 * fwd;
            if (!this.board[doubleR][c]) {
              out.push({ from, to: coordsToSquare(doubleR, c) });
            }
          }
        }
      }

      // Capturas diagonales
      for (const dc of [-1, 1]) {
        const capC = c + dc;
        if (capC >= 0 && capC < 8 && nextR >= 0 && nextR < 8) {
          const target = this.board[nextR][capC];
          const toSq = coordsToSquare(nextR, capC);
          if (target && target.color === enemyColor) {
            if (nextR === promRank) {
              ['q', 'r', 'b', 'n'].forEach(pr => out.push({ from, to: toSq, promotion: pr as PieceType }));
            } else {
              out.push({ from, to: toSq });
            }
          } else if (this.enPassantSquare === toSq) {
            out.push({ from, to: toSq });
          }
        }
      }
    } else if (piece.type === 'n') {
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightMoves) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = this.board[nr][nc];
          if (!target || target.color === enemyColor) {
            out.push({ from, to: coordsToSquare(nr, nc) });
          }
        }
      }
    } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs: [number, number][] = [];
      if (piece.type === 'b' || piece.type === 'q') {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (piece.type === 'r' || piece.type === 'q') {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }

      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = this.board[nr][nc];
          if (!target) {
            out.push({ from, to: coordsToSquare(nr, nc) });
          } else {
            if (target.color === enemyColor) {
              out.push({ from, to: coordsToSquare(nr, nc) });
            }
            break;
          }
          nr += dr; nc += dc;
        }
      }
    } else if (piece.type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.board[nr][nc];
            if (!target || target.color === enemyColor) {
              out.push({ from, to: coordsToSquare(nr, nc) });
            }
          }
        }
      }

      // Enroques
      if (!this.inCheck(color)) {
        if (color === 'w' && r === 7 && c === 4) {
          // O-O
          if (this.castling.wK && !this.board[7][5] && !this.board[7][6]) {
            if (!this.isSquareAttacked([7, 5], 'b') && !this.isSquareAttacked([7, 6], 'b')) {
              out.push({ from, to: 'g1' });
            }
          }
          // O-O-O
          if (this.castling.wQ && !this.board[7][3] && !this.board[7][2] && !this.board[7][1]) {
            if (!this.isSquareAttacked([7, 3], 'b') && !this.isSquareAttacked([7, 2], 'b')) {
              out.push({ from, to: 'c1' });
            }
          }
        } else if (color === 'b' && r === 0 && c === 4) {
          // O-O
          if (this.castling.bK && !this.board[0][5] && !this.board[0][6]) {
            if (!this.isSquareAttacked([0, 5], 'w') && !this.isSquareAttacked([0, 6], 'w')) {
              out.push({ from, to: 'g8' });
            }
          }
          // O-O-O
          if (this.castling.bQ && !this.board[0][3] && !this.board[0][2] && !this.board[0][1]) {
            if (!this.isSquareAttacked([0, 3], 'w') && !this.isSquareAttacked([0, 2], 'w')) {
              out.push({ from, to: 'c8' });
            }
          }
        }
      }
    }
  }

  private isMoveSafe(from: Square, to: Square, promotion?: PieceType): boolean {
    const [fr, fc] = squareToCoords(from);
    const [tr, tc] = squareToCoords(to);
    const piece = this.board[fr][fc];
    if (!piece) return false;

    // Guardar estado
    const savedDest = this.board[tr][tc];
    const isEnPassant = piece.type === 'p' && to === this.enPassantSquare;
    let epCaptured: Piece | null = null;
    let epR = 0, epC = 0;

    if (isEnPassant) {
      epR = fr;
      epC = tc;
      epCaptured = this.board[epR][epC];
      this.board[epR][epC] = null;
    }

    // Ejecutar temporalmente
    this.board[tr][tc] = promotion ? { type: promotion, color: piece.color } : piece;
    this.board[fr][fc] = null;

    const safe = !this.inCheck(piece.color);

    // Restaurar
    this.board[fr][fc] = piece;
    this.board[tr][tc] = savedDest;
    if (isEnPassant) {
      this.board[epR][epC] = epCaptured;
    }

    return safe;
  }

  public makeMove(from: Square, to: Square, promotion: PieceType = 'q'): Move | null {
    const legalMoves = this.getLegalMoves(from);
    const found = legalMoves.find(m => m.to === to && (!m.promotion || m.promotion === promotion));
    if (!found) return null;

    const [fr, fc] = squareToCoords(from);
    const [tr, tc] = squareToCoords(to);
    const piece = this.board[fr][fc]!;
    const color = piece.color;
    const destPiece = this.board[tr][tc];

    const isCapture = !!destPiece || (piece.type === 'p' && to === this.enPassantSquare);
    const isEnPassant = piece.type === 'p' && to === this.enPassantSquare;
    const isCastlingK = piece.type === 'k' && (to === 'g1' || to === 'g8') && Math.abs(fc - tc) === 2;
    const isCastlingQ = piece.type === 'k' && (to === 'c1' || to === 'c8') && Math.abs(fc - tc) === 2;
    const isPromotion = piece.type === 'p' && (tr === 0 || tr === 7);

    // Ejecutar captura al paso
    if (isEnPassant) {
      this.board[fr][tc] = null;
    }

    // Ejecutar enroque
    if (isCastlingK) {
      if (color === 'w') {
        this.board[7][5] = this.board[7][7];
        this.board[7][7] = null;
      } else {
        this.board[0][5] = this.board[0][7];
        this.board[0][7] = null;
      }
    } else if (isCastlingQ) {
      if (color === 'w') {
        this.board[7][3] = this.board[7][0];
        this.board[7][0] = null;
      } else {
        this.board[0][3] = this.board[0][0];
        this.board[0][0] = null;
      }
    }

    // Mover pieza
    this.board[tr][tc] = isPromotion ? { type: promotion, color } : piece;
    this.board[fr][fc] = null;

    // Actualizar derechos de enroque
    if (piece.type === 'k') {
      if (color === 'w') { this.castling.wK = false; this.castling.wQ = false; }
      else { this.castling.bK = false; this.castling.bQ = false; }
    } else if (piece.type === 'r') {
      if (from === 'h1') this.castling.wK = false;
      if (from === 'a1') this.castling.wQ = false;
      if (from === 'h8') this.castling.bK = false;
      if (from === 'a8') this.castling.bQ = false;
    }
    if (destPiece && destPiece.type === 'r') {
      if (to === 'h1') this.castling.wK = false;
      if (to === 'a1') this.castling.wQ = false;
      if (to === 'h8') this.castling.bK = false;
      if (to === 'a8') this.castling.bQ = false;
    }

    // En passant square para el próximo turno
    if (piece.type === 'p' && Math.abs(fr - tr) === 2) {
      this.enPassantSquare = coordsToSquare((fr + tr) / 2, fc);
    } else {
      this.enPassantSquare = null;
    }

    // Relojes de 50 jugadas
    if (piece.type === 'p' || isCapture) {
      this.halfMoves = 0;
    } else {
      this.halfMoves++;
    }
    if (color === 'b') this.fullMoves++;

    // Cambiar turno
    this.turnColor = color === 'w' ? 'b' : 'w';

    // Chequeos y Mates
    const oppCheck = this.inCheck(this.turnColor);
    const oppLegalMoves = this.getLegalMoves();
    const isCheckmate = oppCheck && oppLegalMoves.length === 0;

    // Generar SAN
    let san = '';
    if (isCastlingK) san = 'O-O';
    else if (isCastlingQ) san = 'O-O-O';
    else {
      if (piece.type !== 'p') san += piece.type.toUpperCase();
      if (isCapture) {
        if (piece.type === 'p') san += from[0];
        san += 'x';
      }
      san += to;
      if (isPromotion) san += `=${promotion.toUpperCase()}`;
    }
    if (isCheckmate) san += '#';
    else if (oppCheck) san += '+';

    const moveObj: Move = {
      from,
      to,
      piece: piece.type,
      color,
      captured: destPiece ? destPiece.type : (isEnPassant ? 'p' : undefined),
      promotion: isPromotion ? promotion : undefined,
      flags: {
        isCapture,
        isEnPassant,
        isCastlingKingside: isCastlingK,
        isCastlingQueenside: isCastlingQ,
        isPromotion,
        isCheck: oppCheck,
        isCheckmate,
      },
      san,
    };

    this.history.push(moveObj);

    // Guardar posición para triple repetición
    const key = this.getFenPositionKey();
    const count = (this.positionHistory.get(key) || 0) + 1;
    this.positionHistory.set(key, count);

    return moveObj;
  }

  public isGameOver(): {
    over: boolean;
    result?: '1-0' | '0-1' | '0.5-0.5';
    reason?: string;
    winnerColor?: Color;
  } {
    const legalMoves = this.getLegalMoves();
    const check = this.inCheck(this.turnColor);

    if (legalMoves.length === 0) {
      if (check) {
        const winner = this.turnColor === 'w' ? 'b' : 'w';
        return {
          over: true,
          result: winner === 'w' ? '1-0' : '0-1',
          reason: `Jaque Mate (Ganan ${winner === 'w' ? 'Blancas' : 'Negras'})`,
          winnerColor: winner,
        };
      } else {
        return {
          over: true,
          result: '0.5-0.5',
          reason: 'Tablas por Rey Ahogado (Stalemate)',
        };
      }
    }

    // Regla de 50 jugadas
    if (this.halfMoves >= 100) {
      return {
        over: true,
        result: '0.5-0.5',
        reason: 'Tablas por Regla de los 50 movimientos',
      };
    }

    // Triple repetición
    const currentKey = this.getFenPositionKey();
    if ((this.positionHistory.get(currentKey) || 0) >= 3) {
      return {
        over: true,
        result: '0.5-0.5',
        reason: 'Tablas por Triple Repetición de Posición',
      };
    }

    // Material insuficiente
    if (this.isInsufficientMaterial()) {
      return {
        over: true,
        result: '0.5-0.5',
        reason: 'Tablas por Material Insuficiente',
      };
    }

    return { over: false };
  }

  private isInsufficientMaterial(): boolean {
    const pieces: { type: PieceType; color: Color; r: number; c: number }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) pieces.push({ ...p, r, c });
      }
    }

    // Rey vs Rey
    if (pieces.length === 2) return true;

    // Rey + Caballo/Alfil vs Rey
    if (pieces.length === 3) {
      const nonKing = pieces.find(p => p.type !== 'k');
      if (nonKing && (nonKing.type === 'b' || nonKing.type === 'n')) return true;
    }

    // Rey + Alfil vs Rey + Alfil (mismo color de casilla)
    if (pieces.length === 4) {
      const bishops = pieces.filter(p => p.type === 'b');
      if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
        const sqColor1 = (bishops[0].r + bishops[0].c) % 2;
        const sqColor2 = (bishops[1].r + bishops[1].c) % 2;
        if (sqColor1 === sqColor2) return true;
      }
    }

    return false;
  }
}
