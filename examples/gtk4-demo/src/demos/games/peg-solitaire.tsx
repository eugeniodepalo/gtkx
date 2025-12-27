import * as Gtk from "@gtkx/ffi/gtk";
import { GridChild, GtkBox, GtkButton, GtkFrame, GtkGrid, GtkLabel } from "@gtkx/react";
import { useCallback, useState } from "react";
import type { Demo } from "../types.js";

// Board layout: -1 = invalid, 0 = empty, 1 = peg
// English board (cross shape)
const INITIAL_BOARD: number[][] = [
    [-1, -1, 1, 1, 1, -1, -1],
    [-1, -1, 1, 1, 1, -1, -1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 1, 1, 1], // Center is empty
    [1, 1, 1, 1, 1, 1, 1],
    [-1, -1, 1, 1, 1, -1, -1],
    [-1, -1, 1, 1, 1, -1, -1],
];

const BOARD_SIZE = 7;

type Position = { row: number; col: number };
type Board = number[][];

const copyBoard = (board: Board): Board => {
    return board.map((row) => [...row]);
};

const countPegs = (board: Board): number => {
    let count = 0;
    for (const row of board) {
        for (const cell of row) {
            if (cell === 1) count++;
        }
    }
    return count;
};

// Check if a jump is valid
const isValidJump = (board: Board, from: Position, to: Position): Position | null => {
    // Must be jumping exactly 2 squares in one direction
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;

    if (!((Math.abs(rowDiff) === 2 && colDiff === 0) || (Math.abs(colDiff) === 2 && rowDiff === 0))) {
        return null;
    }

    // Check bounds
    if (to.row < 0 || to.row >= BOARD_SIZE || to.col < 0 || to.col >= BOARD_SIZE) {
        return null;
    }

    // Target must be empty
    if (board[to.row][to.col] !== 0) {
        return null;
    }

    // There must be a peg in between
    const midRow = from.row + rowDiff / 2;
    const midCol = from.col + colDiff / 2;

    if (board[midRow][midCol] !== 1) {
        return null;
    }

    return { row: midRow, col: midCol };
};

// Get all valid moves for a peg
const getValidMoves = (board: Board, from: Position): Position[] => {
    const moves: Position[] = [];
    const directions = [
        { row: -2, col: 0 },
        { row: 2, col: 0 },
        { row: 0, col: -2 },
        { row: 0, col: 2 },
    ];

    for (const dir of directions) {
        const to = { row: from.row + dir.row, col: from.col + dir.col };
        if (isValidJump(board, from, to)) {
            moves.push(to);
        }
    }

    return moves;
};

// Check if any moves are possible
const hasValidMoves = (board: Board): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === 1) {
                if (getValidMoves(board, { row, col }).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
};

const PegSolitaireDemo = () => {
    const [board, setBoard] = useState<Board>(() => copyBoard(INITIAL_BOARD));
    const [selected, setSelected] = useState<Position | null>(null);
    const [moves, setMoves] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    const pegCount = countPegs(board);
    const isWin = pegCount === 1 && board[3][3] === 1; // Win if only center peg remains

    const handleCellClick = useCallback(
        (row: number, col: number) => {
            if (gameOver) return;

            const cell = board[row][col];

            // If clicking on a peg
            if (cell === 1) {
                // Select it if it has valid moves
                const validMoves = getValidMoves(board, { row, col });
                if (validMoves.length > 0) {
                    setSelected({ row, col });
                } else if (selected && selected.row === row && selected.col === col) {
                    // Deselect if clicking selected peg
                    setSelected(null);
                }
                return;
            }

            // If clicking on empty space and have a selected peg
            if (cell === 0 && selected) {
                const jumped = isValidJump(board, selected, { row, col });
                if (jumped) {
                    const newBoard = copyBoard(board);
                    newBoard[selected.row][selected.col] = 0; // Remove peg from start
                    newBoard[jumped.row][jumped.col] = 0; // Remove jumped peg
                    newBoard[row][col] = 1; // Place peg at destination

                    setBoard(newBoard);
                    setSelected(null);
                    setMoves((m) => m + 1);

                    // Check for game over
                    if (!hasValidMoves(newBoard)) {
                        setGameOver(true);
                    }
                }
            }
        },
        [board, selected, gameOver],
    );

    const handleNewGame = useCallback(() => {
        setBoard(copyBoard(INITIAL_BOARD));
        setSelected(null);
        setMoves(0);
        setGameOver(false);
    }, []);

    const validMoves = selected ? getValidMoves(board, selected) : [];
    const isValidTarget = (row: number, col: number) => validMoves.some((m) => m.row === row && m.col === col);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Peg Solitaire" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="The classic peg solitaire game! Jump pegs over each other to remove them. The goal is to end with only one peg remaining in the center."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Game Status */}
            <GtkFrame label="Game Status">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkLabel label="Moves" cssClasses={["dim-label"]} />
                        <GtkLabel label={String(moves)} cssClasses={["title-1"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkLabel label="Pegs Left" cssClasses={["dim-label"]} />
                        <GtkLabel label={String(pegCount)} cssClasses={["title-1"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkLabel label="Status" cssClasses={["dim-label"]} />
                        <GtkLabel
                            label={isWin ? "YOU WIN!" : gameOver ? "Game Over" : "Playing"}
                            cssClasses={isWin ? ["title-2", "success"] : gameOver ? ["title-2", "error"] : ["title-2"]}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Game Board */}
            <GtkFrame label="Game Board">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    marginTop={16}
                    marginBottom={16}
                    marginStart={16}
                    marginEnd={16}
                    halign={Gtk.Align.CENTER}
                >
                    <GtkGrid rowSpacing={4} columnSpacing={4}>
                        {board.map((row, rowIndex) =>
                            row.map((cell, colIndex) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: Grid cells have stable positions
                                <GridChild key={`cell-${rowIndex}-${colIndex}`} column={colIndex} row={rowIndex}>
                                    {cell === -1 ? (
                                        <GtkBox
                                            orientation={Gtk.Orientation.VERTICAL}
                                            spacing={0}
                                            widthRequest={40}
                                            heightRequest={40}
                                        />
                                    ) : cell === 1 ? (
                                        <GtkButton
                                            widthRequest={40}
                                            heightRequest={40}
                                            cssClasses={[
                                                "circular",
                                                selected?.row === rowIndex && selected?.col === colIndex
                                                    ? "suggested-action"
                                                    : "raised",
                                            ]}
                                            onClicked={() => handleCellClick(rowIndex, colIndex)}
                                        />
                                    ) : (
                                        <GtkButton
                                            widthRequest={40}
                                            heightRequest={40}
                                            cssClasses={[
                                                "circular",
                                                isValidTarget(rowIndex, colIndex) ? "suggested-action" : "flat",
                                            ]}
                                            onClicked={() => handleCellClick(rowIndex, colIndex)}
                                            sensitive={isValidTarget(rowIndex, colIndex)}
                                        />
                                    )}
                                </GridChild>
                            )),
                        )}
                    </GtkGrid>
                </GtkBox>
            </GtkFrame>

            {/* Controls */}
            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                <GtkButton label="New Game" onClicked={handleNewGame} cssClasses={["suggested-action"]} />
                {selected && <GtkButton label="Deselect" onClicked={() => setSelected(null)} />}
            </GtkBox>

            {/* Win/Lose Message */}
            {gameOver && (
                <GtkFrame>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={8}
                        marginTop={16}
                        marginBottom={16}
                        marginStart={16}
                        marginEnd={16}
                        halign={Gtk.Align.CENTER}
                    >
                        {isWin ? (
                            <>
                                <GtkLabel label="Congratulations!" cssClasses={["title-1"]} />
                                <GtkLabel
                                    label={`Perfect game! You finished with 1 peg in ${moves} moves.`}
                                    cssClasses={["dim-label"]}
                                />
                            </>
                        ) : (
                            <>
                                <GtkLabel label="Game Over" cssClasses={["title-1"]} />
                                <GtkLabel
                                    label={`No more valid moves. ${pegCount} pegs remaining.`}
                                    cssClasses={["dim-label"]}
                                />
                                <GtkLabel label="Try to leave only 1 peg in the center!" cssClasses={["dim-label"]} />
                            </>
                        )}
                    </GtkBox>
                </GtkFrame>
            )}

            {/* Instructions */}
            <GtkFrame label="How to Play">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="1. Click a peg to select it (pegs with valid moves highlight)"
                        halign={Gtk.Align.START}
                    />
                    <GtkLabel label="2. Jump over an adjacent peg into an empty hole" halign={Gtk.Align.START} />
                    <GtkLabel label="3. The jumped peg is removed from the board" halign={Gtk.Align.START} />
                    <GtkLabel label="4. Continue until only one peg remains" halign={Gtk.Align.START} />
                    <GtkLabel
                        label="5. Perfect game: finish with 1 peg in the center!"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GridChild, GtkBox, GtkButton, GtkGrid } from "@gtkx/react";

// Board: -1 = invalid, 0 = empty, 1 = peg
const INITIAL_BOARD = [
  [-1, -1, 1, 1, 1, -1, -1],
  [-1, -1, 1, 1, 1, -1, -1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1], // Center empty
  [1, 1, 1, 1, 1, 1, 1],
  [-1, -1, 1, 1, 1, -1, -1],
  [-1, -1, 1, 1, 1, -1, -1],
];

const PegSolitaireDemo = () => {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [selected, setSelected] = useState(null);

  const handleCellClick = (row, col) => {
    // Game logic here...
  };

  return (
    <GtkGrid rowSpacing={4} columnSpacing={4}>
      {board.map((row, r) =>
        row.map((cell, c) => (
          <GridChild key={\`\${r}-\${c}\`} column={c} row={r}>
            {cell === 1 ? (
              <GtkButton
                widthRequest={40}
                heightRequest={40}
                cssClasses={["circular", "raised"]}
                onClicked={() => handleCellClick(r, c)}
              />
            ) : cell === 0 ? (
              <GtkButton
                widthRequest={40}
                heightRequest={40}
                cssClasses={["circular", "flat"]}
                onClicked={() => handleCellClick(r, c)}
              />
            ) : (
              <GtkBox
                orientation={Gtk.Orientation.VERTICAL}
                spacing={0}
                widthRequest={40}
                heightRequest={40}
              />
            )}
          </GridChild>
        ))
      )}
    </GtkGrid>
  );
};`;

export const pegSolitaireDemo: Demo = {
    id: "peg-solitaire",
    title: "Peg Solitaire",
    description: "Classic peg solitaire board game",
    keywords: ["game", "puzzle", "solitaire", "peg", "board game", "interactive"],
    component: PegSolitaireDemo,
    sourceCode,
};
