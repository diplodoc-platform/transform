import StateBlock from 'markdown-it/lib/rules_block/state_block';
import {MarkdownItPluginCb} from '../typings';

const pluginName = 'yfm_table';
const pipeChar = 0x7c; // |
const apostropheChar = 0x60; // `
const hashChar = 0x23; // #
const backSlashChar = 0x5c; // \

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

const codeBlockOrder = [apostropheChar, apostropheChar, apostropheChar];
const isCodeBlockOrder: CheckFn = (src, pos) => checkCharsOrder(codeBlockOrder, src, pos);

const openTableOrder = [hashChar, pipeChar];
const isOpenTableOrder: CheckFn = (src, pos) => checkCharsOrder(openTableOrder, src, pos);

const notEscaped: CheckFn = (src, pos) => src.charCodeAt(pos - 1) !== backSlashChar;

const rowStartOrder = [pipeChar, pipeChar];
const isRowOrder: CheckFn = (src, pos) =>
    checkCharsOrder(rowStartOrder, src, pos) && notEscaped(src, pos);

const cellStartOrder = [pipeChar];
const isCellOrder: CheckFn = (src, pos) =>
    checkCharsOrder(cellStartOrder, src, pos) && notEscaped(src, pos) && !isRowOrder(src, pos);

const closeTableOrder = [pipeChar, hashChar];
const isCloseTableOrder: CheckFn = (src, pos) => checkCharsOrder(closeTableOrder, src, pos);

type Stats = {line: number; pos: number};

class StateIterator {
    pos: number;
    line: number;

    private state: StateBlock;
    private lineEnds: number;

    constructor(state: StateBlock, pos: number, line: number) {
        this.state = state;
        this.line = line;
        this.pos = pos;
        this.lineEnds = this.state.eMarks[this.line];
    }

    stats(): Stats {
        return {
            line: this.line,
            pos: this.pos,
        };
    }

    get symbol() {
        return this.state.src[this.pos];
    }

    next(steps = 1) {
        for (let i = 0; i < steps; i++) {
            this.pos++;

            if (this.pos > this.lineEnds) {
                this.line++;
                this.pos = this.state.bMarks[this.line] + this.state.tShift[this.line];
                this.lineEnds = this.state.eMarks[this.line];
            }
        }
    }
}

function getTableRows(
    state: StateBlock,
    startPosition: number,
    endPosition: number,
    startLine: number,
) {
    let endOfTable = null;
    let tableLevel = 0;
    let currentRow: [Stats, Stats][] = [];
    let colStart: Stats | null = null;
    let rowStart: number | null = null;

    const iter = new StateIterator(state, startPosition + openTableOrder.length, startLine);

    const rows: [number, number, typeof currentRow][] = [];

    let isInsideCode = false;
    let isInsideTable = false;
    const rowMap = new Map();

    const addRow = () => {
        if (colStart) {
            currentRow.push([colStart, iter.stats()]);
        }
        if (currentRow.length && rowStart) {
            rows.push([rowStart, iter.line, currentRow]);
        }
        currentRow = [];
        colStart = null;
        rowStart = null;
    };

    while (iter.pos <= endPosition) {
        if (iter.symbol === undefined) {
            break;
        }

        if (isCodeBlockOrder(state.src, iter.pos)) {
            isInsideCode = !isInsideCode;
            iter.next(codeBlockOrder.length);
        }

        if (isInsideCode) {
            iter.next();
            continue;
        }

        if (isOpenTableOrder(state.src, iter.pos)) {
            isInsideTable = true;
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
                isInsideTable = false;
                tableLevel--;
                iter.next(closeTableOrder.length);
                continue;
            }
        }

        if (isInsideTable) {
            iter.next();
            continue;
        }

        if (isRowOrder(state.src, iter.pos)) {
            const insideRow = rowMap.get(tableLevel);
            if (insideRow) {
                addRow();
                iter.next(rowStartOrder.length);
            } else {
                iter.next(rowStartOrder.length);
                rowStart = iter.line;
                colStart = iter.stats();
            }

            rowMap.set(tableLevel, !insideRow);

            continue;
        }

        if (isCellOrder(state.src, iter.pos)) {
            if (colStart) {
                currentRow.push([colStart, iter.stats()]);
            }
            iter.next(cellStartOrder.length);
            colStart = iter.stats();
            continue;
        }

        iter.next();
    }
    return {rows, endOfTable};
}

const yfmTable: MarkdownItPluginCb = (md) => {
    md.block.ruler.before(
        'code',
        pluginName,
        (state: StateBlock, startLine: number, endLine: number, silent: boolean) => {
            let token;
            const startPosition = state.bMarks[startLine] + state.tShift[startLine];
            const endPosition = state.eMarks[endLine];

            // #| minimum 2 symbols
            if (endPosition - startPosition < 2) {
                return false;
            }

            if (!isOpenTableOrder(state.src, startPosition)) {
                return false;
            }

            if (silent) {
                return true;
            }

            const {rows, endOfTable} = getTableRows(state, startPosition, endPosition, startLine);

            if (!endOfTable) {
                token = state.push('__yfm_lint', '', 0);
                token.hidden = true;
                token.map = [startLine, endLine];
                token.attrSet('YFM004', 'true');
                return false;
            }

            const oldParentLineMax = state.lineMax;

            state.lineMax = endOfTable;
            state.line = startLine;

            token = state.push('yfm_table_open', 'table', 1);
            token.map = [startLine, endOfTable];

            token = state.push('yfm_tbody_open', 'tbody', 1);
            token.map = [startLine + 1, endOfTable - 1];

            const maxRowLength = Math.max(...rows.map(([, , cols]) => cols.length));

            for (let i = 0; i < rows.length; i++) {
                const [rowLineStarts, rowLineEnds, cols] = rows[i];

                const rowLength = cols.length;

                token = state.push('yfm_tr_open', 'tr', 1);
                token.map = [rowLineStarts, rowLineEnds];

                for (let j = 0; j < cols.length; j++) {
                    const [begin, end] = cols[j];
                    token = state.push('yfm_td_open', 'td', 1);
                    token.map = [begin.line, end.line];

                    const oldTshift = state.tShift[begin.line];
                    const oldEMark = state.eMarks[end.line];
                    const oldBMark = state.bMarks[begin.line];
                    const oldLineMax = state.lineMax;

                    state.tShift[begin.line] = 0;
                    state.bMarks[begin.line] = begin.pos;
                    state.eMarks[end.line] = end.pos;
                    state.lineMax = end.line + 1;

                    state.md.block.tokenize(state, begin.line, end.line + 1);

                    state.lineMax = oldLineMax;
                    state.tShift[begin.line] = oldTshift;
                    state.bMarks[begin.line] = oldBMark;
                    state.eMarks[end.line] = oldEMark;

                    token = state.push('yfm_td_close', 'td', -1);
                }

                if (rowLength < maxRowLength) {
                    const emptyCellsCount = maxRowLength - rowLength;
                    for (let k = 0; k < emptyCellsCount; k++) {
                        token = state.push('yfm_td_open', 'td', 1);
                        token = state.push('yfm_td_close', 'td', -1);
                    }
                }

                token = state.push('yfm_tr_close', 'tr', -1);
            }

            token = state.push('yfm_tbody_close', 'tbody', -1);

            token = state.push('yfm_table_close', 'table', -1);

            state.lineMax = oldParentLineMax;
            state.line = endOfTable;

            return true;
        },
    );
};

export = yfmTable;
