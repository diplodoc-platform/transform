/**
 * Simple plugin for multiline table
 * Reference syntax - https://docs.asciidoctor.org/asciidoc/latest/tables/build-a-basic-table/
 * Current supported syntax:
 * |=== - open/close table
 * \n| - cell start
 * \n\n| - row start
 */

const pluginName = 'asciidoc_table';
const pipeChar = 0x7c; // |
const equalChar = 0x3d; // =
const newLineChar = 0x0a; // \n
const apostropheChar = 0x60; // `
const tableToken = '!===';

const isPipeChar = (char) => char === pipeChar;
const isNewLineChar = (char) => char === newLineChar;
const isEqualChar = (char) => char === equalChar;
const isApostropheChar = (char) => char === apostropheChar;

function checkCharSequence(sequence, src, pos) {
    return sequence.every((condition, index) => {
        return condition(src.charCodeAt(pos + index));
    });
}

function isCodeBlock(src, pos) {
    return checkCharSequence(
        [isApostropheChar, isApostropheChar, isApostropheChar],
        src,
        pos,
    );
}

function isTableToken(src, pos) {
    return checkCharSequence(
        [isPipeChar, isEqualChar, isEqualChar, isEqualChar],
        src,
        pos,
    );
}

function isCloseTableToken(src, pos) {
    return checkCharSequence(
        [isNewLineChar, isPipeChar, isEqualChar, isEqualChar, isEqualChar],
        src,
        pos,
    );
}

function isCellToken(src, pos) {
    return checkCharSequence([isNewLineChar, isPipeChar], src, pos);
}

function isRowToken(src, pos) {
    return checkCharSequence(
        [isNewLineChar, isNewLineChar, isPipeChar],
        src,
        pos,
    );
}

class StateIterator {
    constructor(state, pos, line) {
        this.state = state;
        this.char = this.state.src.charCodeAt(pos);
        this.line = line;
        this.pos = pos;
        this.lineEnds = this.state.eMarks[this.line];
    }

    stats() {
        return {
            line: this.line,
            pos: this.pos,
        };
    }

    get symbol() {
        return this.state.src[this.pos];
    }

    next() {
        this.pos++;
        this.char = this.state.src.charCodeAt(this.pos);

        if (this.pos > this.lineEnds) {
            this.line++;
            this.pos =
                this.state.bMarks[this.line] + this.state.tShift[this.line];
            this.lineEnds = this.state.eMarks[this.line];
            this.char = this.state.src.charCodeAt(this.pos);
        }
    }
}

function getTableRows(state, startPosition, endPosition, startLine) {
    let endOfTable = null;
    const rows = [];
    let currentRow = [];
    const iter = new StateIterator(
        state,
        startPosition + tableToken.length,
        startLine,
    );
    let colStart = null;
    let rowStart = null;
    let isInsideCode = false;

    while (iter.pos <= endPosition) {
        if (iter.symbol === undefined) {
            break;
        }

        if (isCodeBlock(state.src, iter.pos + 1)) {
            isInsideCode = !isInsideCode;
            iter.next();
            iter.next();
            iter.next();
        }

        if (isInsideCode) {
            iter.next();
            continue;
        }

        if (isTableToken(state.src, iter.pos)) {
            iter.next();
            if (colStart) {
                currentRow.push([colStart, iter.stats()]);
            }
            if (currentRow.length) {
                rows.push([rowStart, iter.line, currentRow]);
            }
            endOfTable = iter.line + 1;
            break;
        }

        if (isCloseTableToken(state.src, iter.pos + 1)) {
            iter.next();
            if (colStart) {
                currentRow.push([colStart, iter.stats()]);
            }
            if (currentRow.length) {
                rows.push([rowStart, iter.line, currentRow]);
            }
            endOfTable = iter.line + 2;
            break;
        }

        if (isRowToken(state.src, iter.pos)) {
            if (colStart) {
                currentRow.push([colStart, iter.stats()]);
            }
            if (currentRow.length) {
                rows.push([rowStart, iter.line, currentRow]);
            }
            currentRow = [];
            iter.next();
            continue;
        }

        if (isCellToken(state.src, iter.pos)) {
            iter.next();
            iter.next();
            colStart = iter.stats();
            if (!currentRow.length) {
                rowStart = iter.line;
            }
            continue;
        }

        if (isCellToken(state.src, iter.pos + 1)) {
            iter.next();
            if (colStart) {
                currentRow.push([colStart, iter.stats()]);
            }
            iter.next();
            iter.next();
            colStart = iter.stats();
            if (!currentRow.length) {
                rowStart = iter.line;
            }
            continue;
        }

        iter.next();
    }
    return {rows, endOfTable};
}

function tableRule(state, startLine, endLine, silent) {
    let token;
    const startPosition = state.bMarks[startLine] + state.tShift[startLine];
    const endPosition = state.eMarks[endLine];

    // |=== minimum 4 symbols
    if (endPosition - startPosition < 4) {
        return false;
    }

    if (!isTableToken(state.src, startPosition)) {
        return false;
    }

    if (silent) {
        return true;
    }

    const {rows, endOfTable} = getTableRows(
        state,
        startPosition,
        endPosition,
        startLine,
    );

    if (!endOfTable) {
        token = state.push('table_open', 'table', 1);
        token.map = [startLine, endLine];
        token.attrSet('YFM004', true);
        return false;
    }

    const oldParentType = state.parentType;
    const oldParentLineMax = state.lineMax;

    state.parentType = pluginName;
    state.lineMax = endOfTable;
    state.line = startLine;

    const tableOpenMap = [startLine, endOfTable];
    const tbodyMap = [startLine + 1, endOfTable - 1];

    token = state.push('table_open', 'table', 1);
    token.map = tableOpenMap;

    token = state.push('tbody_open', 'tbody', 1);
    token.map = tbodyMap;

    for (let i = 0; i < rows.length; i++) {
        const [rowLineStarts, rowLineEnds, cols] = rows[i];

        token = state.push('tr_open', 'tr', 1);
        token.map = [rowLineStarts, rowLineEnds];

        for (let j = 0; j < cols.length; j++) {
            const [begin, end] = cols[j];

            token = state.push('td_open', 'td', 1);
            token.map = [begin.line, end.line];

            if (begin.line === end.line) {
                // One line cell
                token = state.push('inline', '', 0);
                token.content = state.src.substring(begin.pos, end.pos).trim();
                token.children = [];
            } else {
                // Multiline cell
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
            }

            token = state.push('td_close', 'td', -1);
        }

        token = state.push('tr_close', 'tr', -1);
    }

    token = state.push('tbody_close', 'tbody', -1);

    token = state.push('table_close', 'table', -1);

    state.parentType = oldParentType;
    state.lineMax = oldParentLineMax;
    state.line = endOfTable;

    return true;
}

module.exports = function wikiTable(md) {
    md.block.ruler.before('code', pluginName, tableRule);
};
