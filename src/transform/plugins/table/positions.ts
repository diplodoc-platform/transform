import type {StateBlock} from '../../typings';
import type {Logger} from '../../log';
import type {TableAttrs, YfmTablePluginOptions} from './types';

import {parseMdAttrs} from '@diplodoc/utils';

const pipeChar = 0x7c; // |
const colonChar = 0x3a; // :
const apostropheChar = 0x60; // `
const hashChar = 0x23; // #
const backSlashChar = 0x5c; // \
const curlyBraceOpen = 123;
const curlyBraceClose = 125;
const dollarChar = 36; // $

const checkCharsOrder = (order: number[], src: string, pos: number) => {
    const currentOrder = [...order];
    const currentSrc = src.slice(pos);
    for (let i = 0; i < currentOrder.length; i++) {
        const rowSymbol = currentSrc.charCodeAt(i);
        const orderSymbol = currentOrder[i];
        if (rowSymbol !== orderSymbol) {
            return false;
        }
    }
    return true;
};

type CheckFn = (src: string, pos: number) => boolean;

const liquidVariableStartOrder = [curlyBraceOpen, curlyBraceOpen];
const isLiquidVariableStart: CheckFn = (src, pos) =>
    checkCharsOrder(liquidVariableStartOrder, src, pos);

const liquidVariableEndOrder = [curlyBraceClose, curlyBraceClose];
const isLiquidVariableEnd: CheckFn = (src, pos) =>
    checkCharsOrder(liquidVariableEndOrder, src, pos);

const codeBlockOrder = [apostropheChar, apostropheChar, apostropheChar];
const isCodeBlockOrder: CheckFn = (src, pos) => checkCharsOrder(codeBlockOrder, src, pos);

const mathBlockOrder = [dollarChar, dollarChar];
const isMathBlockOrder: CheckFn = (src, pos) => checkCharsOrder(mathBlockOrder, src, pos);

const openTableOrder = [hashChar, pipeChar];
export const isOpenTableOrder: CheckFn = (src, pos) => checkCharsOrder(openTableOrder, src, pos);

const isEscaped: CheckFn = (src, pos) => {
    const start = pos;
    pos--;
    while (src.charCodeAt(pos) === backSlashChar) {
        pos--;
    }
    return (start - pos) % 2 === 0;
};
const notEscaped: CheckFn = (src, pos) => !isEscaped(src, pos);

const rowStartOrder = [pipeChar, pipeChar];
const isRowOrder: CheckFn = (src, pos) =>
    checkCharsOrder(rowStartOrder, src, pos) && notEscaped(src, pos);

const cellStartOrder = [pipeChar];
const isCellOrder: CheckFn = (src, pos) =>
    checkCharsOrder(cellStartOrder, src, pos) && notEscaped(src, pos) && !isRowOrder(src, pos);

const closeTableOrder = [pipeChar, hashChar];
const isCloseTableOrder: CheckFn = (src, pos) => checkCharsOrder(closeTableOrder, src, pos);

type SkipInlineFn = (src: string, pos: number, max: number) => false | SkipInlineResult;
type SkipInlineResult = {
    end: number;
    steps: number;
};

const skipInlineCode: SkipInlineFn = (src, pos, max) => {
    // this function is an adaptation of original markdown-it backticks plugin
    // https://github.com/markdown-it/markdown-it/blob/master/lib/rules_inline/backticks.mjs

    if (src.charCodeAt(pos) !== apostropheChar) {
        return false;
    }
    if (pos > 0 && isEscaped(src, pos)) {
        return false;
    }

    const start = pos;

    // scan marker length
    while (pos < max && src.charCodeAt(pos) === apostropheChar) {
        pos++;
    }

    const marker = src.slice(start, pos);
    const openerLength = marker.length;

    let matchEnd = pos;
    let matchStart: number;

    while ((matchStart = src.indexOf('`', matchEnd)) !== -1) {
        matchEnd = matchStart + 1;

        // scan marker length
        while (matchEnd < max && src.charCodeAt(matchEnd) === apostropheChar) {
            matchEnd++;
        }

        const closerLength = matchEnd - matchStart;

        if (closerLength === openerLength) {
            return {
                end: matchEnd,
                steps: matchEnd - start,
            };
        }
    }

    return false;
};

const skipInlineMath: SkipInlineFn = (src, pos, max) => {
    // this function is an adaptation of latex-extension plugin
    // https://github.com/diplodoc-platform/latex-extension/blob/master/src/plugin/transform.ts

    if (src.charCodeAt(pos) !== dollarChar) {
        return false;
    }
    if (pos > 0 && !notEscaped(src, pos)) {
        return false;
    }

    {
        const nextChar = pos + 1 <= max ? src.charCodeAt(pos + 1) : -1;
        if (nextChar === 0x20 /* " " */ || nextChar === 0x09 /* \t */) {
            return false;
        }
        if (nextChar === dollarChar) {
            return {
                end: pos + 2,
                steps: 2,
            };
        }
    }

    const start = pos + 1;
    let match = start;
    // eslint-disable-next-line no-cond-assign
    while ((match = src.indexOf('$', match))) {
        if (match === -1 || match > max) {
            return false;
        }
        if (isEscaped(src, match)) {
            match++;
            continue;
        }

        const prevChar = src.charCodeAt(match - 1);
        const nextChar = match + 1 <= max ? src.charCodeAt(match + 1) : -1;
        if (
            prevChar === 0x20 /* " " */ ||
            prevChar === 0x09 /* \t */ ||
            (nextChar >= 0x30 /* "0" */ && nextChar <= 0x39) /* "9" */
        ) {
            return false;
        }

        return {
            end: match + 1,
            steps: match + 1 - start,
        };
    }

    return false;
};

export type Stats = {line: number; pos: number};

class StateIterator {
    private _pos: number;
    private _line: number;
    private _lineEnds: number;

    private state: StateBlock;

    get pos() {
        return this._pos;
    }

    get line() {
        return this._line;
    }

    get lineEnds() {
        return this._lineEnds;
    }

    constructor(state: StateBlock, pos: number, line: number) {
        this.state = state;
        this._line = line;
        this._pos = pos;
        this._lineEnds = this.state.eMarks[this._line];
    }

    stats(): Stats {
        return {
            line: this._line,
            pos: this._pos,
        };
    }

    get symbol() {
        return this.state.src[this._pos];
    }

    next(steps = 1) {
        for (let i = 0; i < steps; i++) {
            this._pos++;

            if (this._pos > this._lineEnds) {
                this._line++;
                this._pos = this.state.bMarks[this._line] + this.state.tShift[this._line];
                this._lineEnds = this.state.eMarks[this._line];
            }
        }
    }
}

export type CellData = {start: Stats; end: Stats; markerEnd: Stats; rawAttrs: TableAttrs};
type RowData = {start: number; end: number; cols: CellData[]; rawAttrs: TableAttrs};

export interface RowPositions {
    nested: boolean;
    unclosedCells: CellData[];
    rows: RowData[];
    endOfTable: number | null;
    pos: number;
    tableAttrs: TableAttrs;
}

/**
 * Parses table options from lines between #| and the first || or |#.
 *
 * Option line format: `|:{key="value" key2="value2"}`
 * Multiple option lines are supported; results are merged.
 * @param state - Current block parser state.
 * @param iter - Source iterator immediately after the table opener.
 * @returns The table's attributes, without changing document content.
 */
function parseTableAttrs(state: StateBlock, iter: StateIterator): TableAttrs {
    const options: TableAttrs = {};
    const {src} = state;
    const utils = state.md.utils;

    let parsing = true;

    while (parsing) {
        const lineEnd = iter.lineEnds;

        // Skip leading whitespace to find first non-space char
        let first = iter.pos;
        while (first < lineEnd && utils.isSpace(src.charCodeAt(first))) {
            first++;
        }

        // Skip empty lines
        if (first >= lineEnd) {
            iter.next(lineEnd - iter.pos + 1);
            continue;
        }

        // Stop if we hit row start || or table close |#
        if (isRowOrder(src, first) || isCloseTableOrder(src, first)) {
            parsing = false;
            continue;
        }

        // Option line must start with |:
        if (src.charCodeAt(first) !== pipeChar || src.charCodeAt(first + 1) !== colonChar) {
            parsing = false;
            continue;
        }

        const result = parseMdAttrs(state.md, src, first + 2, lineEnd);
        if (!result) {
            parsing = false;
            continue;
        }

        for (const [key, values] of Object.entries(result.attrs)) {
            options[key] = values[values.length - 1];
        }

        iter.next(lineEnd - iter.pos + 1);
    }

    return options;
}

// eslint-disable-next-line complexity
export function getTableRowPositions(
    state: StateBlock,
    startPosition: number,
    endPosition: number,
    startLine: number,
    opts: YfmTablePluginOptions & {log?: Logger} = {},
): RowPositions {
    let endOfTable = null;
    let nested = false;
    let markerEnd: Stats = {pos: startPosition, line: startLine};
    let tableLevel = 0;
    let currentRow: CellData[] = [];
    let colStart: Stats | null = null;
    let pendingCellAttrs: TableAttrs = {};
    let rowStart: number | null = null;
    let currentRowAttrs: TableAttrs = {};

    const iter = new StateIterator(state, startPosition + openTableOrder.length, startLine);

    const tableAttrs = parseTableAttrs(state, iter);

    const rows: RowData[] = [];

    let isInsideCode = false;
    let isInsideMath = false;
    let isInsideLiquidVariable = false;
    const rowMap = new Map();

    const addRow = () => {
        if (colStart) {
            currentRow.push({
                start: colStart,
                end: iter.stats(),
                markerEnd,
                rawAttrs: pendingCellAttrs,
            });
            pendingCellAttrs = {};
        }
        if (currentRow.length && rowStart) {
            rows.push({
                start: rowStart,
                end: iter.line,
                cols: currentRow,
                rawAttrs: currentRowAttrs,
            });
        }
        currentRow = [];
        colStart = null;
        rowStart = null;
        currentRowAttrs = {};
    };

    while (iter.pos <= endPosition) {
        if (iter.symbol === undefined) {
            break;
        }

        if (opts.table_ignoreSplittersInBlockCode !== false) {
            if (!isInsideMath && isCodeBlockOrder(state.src, iter.pos)) {
                isInsideCode = !isInsideCode;
                iter.next(codeBlockOrder.length);
            }
        }

        if (opts.table_ignoreSplittersInBlockMath) {
            if (!isInsideCode && isMathBlockOrder(state.src, iter.pos)) {
                isInsideMath = !isInsideMath;
                iter.next(mathBlockOrder.length);
            }
        }

        if (isInsideCode || isInsideMath) {
            iter.next();
            continue;
        }

        if (!isInsideLiquidVariable && isLiquidVariableStart(state.src, iter.pos)) {
            isInsideLiquidVariable = true;
            iter.next(liquidVariableStartOrder.length);
        }

        if (isInsideLiquidVariable && isLiquidVariableEnd(state.src, iter.pos)) {
            isInsideLiquidVariable = false;
            iter.next(liquidVariableEndOrder.length);
        }

        if (isInsideLiquidVariable) {
            iter.next();
            continue;
        }

        if (opts.table_ignoreSplittersInInlineCode !== false) {
            const result = skipInlineCode(state.src, iter.pos, iter.lineEnds);
            if (result !== false) {
                iter.next(result.steps);
                continue;
            }
        }

        if (opts.table_ignoreSplittersInInlineMath) {
            const result = skipInlineMath(state.src, iter.pos, iter.lineEnds);
            if (result !== false) {
                iter.next(result.steps);
                continue;
            }
        }

        if (isOpenTableOrder(state.src, iter.pos)) {
            nested = true;
            tableLevel++;
            iter.next(openTableOrder.length);
            continue;
        }

        if (isCloseTableOrder(state.src, iter.pos)) {
            if (tableLevel === 0) {
                addRow();
                iter.next(closeTableOrder.length);
                endOfTable = iter.line + 2;
                break;
            } else {
                tableLevel--;
                iter.next(closeTableOrder.length);
                continue;
            }
        }

        {
            const isInsideTable = tableLevel > 0;
            if (isInsideTable) {
                iter.next();
                continue;
            }
        }

        if (isRowOrder(state.src, iter.pos)) {
            const insideRow = rowMap.get(tableLevel);
            if (insideRow) {
                addRow();
                iter.next(rowStartOrder.length);
            } else {
                iter.next(rowStartOrder.length);
                rowStart = iter.line;

                const hasRowAttrs =
                    iter.pos <= iter.lineEnds &&
                    state.src.charCodeAt(iter.pos) === colonChar &&
                    state.src.charCodeAt(iter.pos + 1) === curlyBraceOpen;
                if (hasRowAttrs) {
                    currentRowAttrs = parseInlineAttrs(state, iter, 1);
                } else {
                    currentRowAttrs = {};
                }

                // skip spaces/tabs on same line only if row attrs were present, then check for first-cell attrs ::{...}
                if (hasRowAttrs) {
                    while (
                        iter.pos <= iter.lineEnds &&
                        state.md.utils.isSpace(state.src.charCodeAt(iter.pos))
                    ) {
                        iter.next(1);
                    }
                }
                markerEnd = iter.stats();
                if (
                    iter.pos <= iter.lineEnds &&
                    state.src.charCodeAt(iter.pos) === colonChar &&
                    state.src.charCodeAt(iter.pos + 1) === colonChar
                ) {
                    pendingCellAttrs = parseInlineAttrs(state, iter, 2);
                } else {
                    pendingCellAttrs = {};
                }

                colStart = iter.stats();
            }

            rowMap.set(tableLevel, !insideRow);

            continue;
        }

        if (isCellOrder(state.src, iter.pos)) {
            if (colStart) {
                currentRow.push({
                    start: colStart,
                    end: iter.stats(),
                    markerEnd,
                    rawAttrs: pendingCellAttrs,
                });
                pendingCellAttrs = {};
            }
            iter.next(cellStartOrder.length);
            markerEnd = iter.stats();
            // check for cell attrs ::{...} immediately after | (no spaces allowed)
            if (
                iter.pos <= iter.lineEnds &&
                state.src.charCodeAt(iter.pos) === colonChar &&
                state.src.charCodeAt(iter.pos + 1) === colonChar
            ) {
                pendingCellAttrs = parseInlineAttrs(state, iter, 2);
            } else {
                pendingCellAttrs = {};
            }
            colStart = iter.stats();
            continue;
        }

        iter.next();
    }

    const {pos} = iter;

    // Diagnostic-only source spans; unfinished cells never become rendered rows.
    const unclosedCells = endOfTable === null ? [...currentRow] : [];
    if (endOfTable === null && colStart) {
        unclosedCells.push({
            start: colStart,
            end: {
                pos: Math.min(endPosition, state.src.length),
                line: Math.min(iter.line, state.lineMax - 1),
            },
            markerEnd,
            rawAttrs: pendingCellAttrs,
        });
    }
    return {rows, endOfTable, pos, tableAttrs, nested, unclosedCells};
}

function parseInlineAttrs(state: StateBlock, iter: StateIterator, prefixLen: number): TableAttrs {
    const result: TableAttrs = {};
    const parsed = parseMdAttrs(state.md, state.src, iter.pos + prefixLen, iter.lineEnds);
    if (!parsed) {
        return result;
    }
    for (const [key, values] of Object.entries(parsed.attrs)) {
        result[key] = values[0];
    }
    iter.next(parsed.pos - iter.pos);
    return result;
}
