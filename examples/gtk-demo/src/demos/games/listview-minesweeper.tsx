import { existsSync } from "node:fs";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkGridView, GtkHeaderBar, GtkImage, GtkLabel } from "@gtkx/react";
import { useCallback, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./listview-minesweeper.tsx?raw";

const Slot = "Slot" as const;
const GRID_SIZE = 8;
const MINE_COUNT = 10;

interface Cell {
    id: string;
    row: number;
    col: number;
    isMine: boolean;
    isRevealed: boolean;
    adjacentMines: number;
}

type GameState = "playing" | "won" | "lost";

const createEmptyCells = (): Cell[] => {
    const cells: Cell[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            cells.push({
                id: `${row}-${col}`,
                row,
                col,
                isMine: false,
                isRevealed: false,
                adjacentMines: 0,
            });
        }
    }
    return cells;
};

const placeMines = (cells: Cell[]): void => {
    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
        const index = Math.floor(Math.random() * cells.length);
        const cell = cells[index];
        if (cell && !cell.isMine) {
            cell.isMine = true;
            minesPlaced++;
        }
    }
};

const countAdjacentMines = (cells: Cell[], cell: Cell): number => {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = cell.row + dr;
            const nc = cell.col + dc;
            if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
            if (cells[nr * GRID_SIZE + nc]?.isMine) count++;
        }
    }
    return count;
};

const createBoard = (): Cell[] => {
    const cells = createEmptyCells();
    placeMines(cells);
    for (const cell of cells) {
        if (!cell.isMine) cell.adjacentMines = countAdjacentMines(cells, cell);
    }
    return cells;
};

const ListViewMinesweeperDemo = () => {
    const [board, setBoard] = useState<Cell[]>(createBoard);
    const [gameState, setGameState] = useState<GameState>("playing");
    const soundStreamRef = useRef<Gtk.MediaFile | null>(null);

    const revealCell = useCallback((index: number, currentBoard: Cell[]): Cell[] => {
        const cell = currentBoard[index];
        if (!cell || cell.isRevealed) return currentBoard;

        const newBoard = [...currentBoard];
        newBoard[index] = { ...cell, isRevealed: true };
        return newBoard;
    }, []);

    const playSound = useCallback((win: boolean) => {
        const dataDirs = (process.env.XDG_DATA_DIRS ?? "/usr/local/share:/usr/share").split(":");
        const sound = win ? "complete.oga" : "suspend-error.oga";
        const path = dataDirs
            .map((dir) => `${dir}/sounds/freedesktop/stereo/${sound}`)
            .find((candidate) => existsSync(candidate));
        if (!path) return;
        const stream = Gtk.MediaFile.newForFilename(path);
        stream.setVolume(1);
        stream.play();
        soundStreamRef.current = stream;
    }, []);

    const handleCellClick = useCallback(
        (index: number) => {
            if (gameState !== "playing") return;

            const cell = board[index];
            if (!cell || cell.isRevealed) return;

            const newBoard = revealCell(index, board);
            setBoard(newBoard);

            const clickedCell = newBoard[index];
            if (clickedCell?.isMine) {
                setGameState("lost");
                playSound(false);
                return;
            }

            const unrevealedSafeCells = newBoard.filter((c) => !c.isRevealed && !c.isMine).length;
            if (unrevealedSafeCells === 0) {
                setGameState("won");
                playSound(true);
            }
        },
        [board, gameState, revealCell, playSound],
    );

    const resetGame = useCallback(() => {
        setBoard(createBoard());
        setGameState("playing");
    }, []);

    const getCellDisplay = (cell: Cell): string => {
        if (!cell.isRevealed) return "?";
        if (cell.isMine) return "\u{1F4A3}";
        if (cell.adjacentMines === 0) return "";
        return String(cell.adjacentMines);
    };

    return (
        <>
            <Slot id="titlebar">
                <GtkHeaderBar titleWidget={gameState === "won" ? <GtkImage iconName="trophy-gold" /> : null}>
                    <GtkHeaderBar.PackStart>
                        <GtkButton label="New Game" onClicked={resetGame} />
                    </GtkHeaderBar.PackStart>
                </GtkHeaderBar>
            </Slot>
            <GtkBox halign={Gtk.Align.CENTER}>
                <GtkGridView
                    estimatedItemHeight={32}
                    minColumns={GRID_SIZE}
                    maxColumns={GRID_SIZE}
                    singleClickActivate
                    onActivate={(position) => handleCellClick(position)}
                    renderItem={(item: Cell) => (
                        <GtkLabel
                            label={getCellDisplay(item)}
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                            widthRequest={32}
                            heightRequest={32}
                        />
                    )}
                    items={board.map((cell) => ({ id: cell.id, value: cell }))}
                />
            </GtkBox>
        </>
    );
};

export const listviewMinesweeperDemo: Demo = {
    id: "listview-minesweeper",
    title: "Lists/Minesweeper",
    description:
        "Classic Minesweeper game using GridView. Click cells to reveal them. Numbers show adjacent mine count.",
    keywords: ["gridview", "minesweeper", "game", "GtkGridView", "grid", "puzzle", "mines"],
    component: ListViewMinesweeperDemo,
    sourceCode,
};
