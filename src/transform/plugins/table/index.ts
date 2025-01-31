import StateBlock from 'markdown-it/lib/rules_block/state_block';
import Token from 'markdown-it/lib/token';

import {MarkdownItPluginCb} from '../typings';

import {AttrsParser} from './attrs';

const pluginName = 'yfm_table';
const pipeChar = 0x7c; // |
const apostropheChar = 0x60; // `
const hashChar = 0x23; // #
const backSlashChar = 0x5c; // \
const curlyBraceOpen = 123;
const curlyBraceClose = 125;

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

interface RowPositions {
    rows: [number, number, [Stats, Stats][]][];
    endOfTable: number | null;
    pos: number;
}

function getTableRowPositions(
    state: StateBlock,
    startPosition: number,
    endPosition: number,
    startLine: number,
): RowPositions {
    let endOfTable = null;
    let tableLevel = 0;
    let currentRow: [Stats, Stats][] = [];
    let colStart: Stats | null = null;
    let rowStart: number | null = null;

    const iter = new StateIterator(state, startPosition + openTableOrder.length, startLine);

    const rows: [number, number, typeof currentRow][] = [];

    let isInsideCode = false;
    let isInsideTable = false;
    let isInsideLiquidVariable = false;
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

    const {pos} = iter;

    return {rows, endOfTable, pos};
}

function extractAttributes(state: StateBlock, pos: number): Record<string, string[]> {
    const attrsStringStart = state.skipSpaces(pos);
    const attrsString = state.src.slice(attrsStringStart);

    const attrsParser = new AttrsParser();

    return attrsParser.parse(attrsString);
}

/**
 * Extracts the class attribute from the given content token and applies it to the tdOpenToken.
 * Preserves other attributes.
 *
 * @param {Token} contentToken - Search the content of this token for the class.
 * @param {Token} tdOpenToken - Parent td_open token. Extracted class is applied to this token.
 * @returns {void}
 */
function extractAndApplyClassFromToken(contentToken: Token, tdOpenToken: Token): void {
    // Regex to find class attribute in any position within brackets
    const blockRegex = /\s*\{[^}]*}$/;
    const allAttrs = contentToken.content.match(blockRegex);
    if (!allAttrs) {
        return;
    }

    const attrs = new AttrsParser().parse(allAttrs[0].trim());
    const attrsClass = attrs?.class?.join(' ');

    if (attrsClass) {
        tdOpenToken.attrSet('class', attrsClass);
        // remove the class from the token so that it's not propagated to tr or table level
        let replacedContent = allAttrs[0].replace(`.${attrsClass}`, '');
        if (replacedContent.trim() === '{}') {
            replacedContent = '';
        }
        contentToken.content = contentToken.content.replace(allAttrs[0], replacedContent);
    }
}

const COLSPAN_SYMBOL = '>';
const ROWSPAN_SYMBOL = '^';

/**
 * Traverses through the content map, applying row/colspan attributes and marking the special cells for deletion.
 * Upon encountering a symbol denoting a row span or a column span, proceed backwards in row or column
 * until text cell is found. Upon finding the text cell, store the colspan or rowspan value.
 * During the backward traversal, if the same symbol is encountered, increment the value of rowspan/colspan.
 * Colspan symbol is ignored for the first column. Rowspan symbol is ignored for the first row
 *
 * @param contentMap string[][]
 * @param tokenMap Token[][]
 * @return {void}
 */
const applySpans = (contentMap: string[][], tokenMap: Token[][]): void => {
    for (let i = 0; i < contentMap.length; i++) {
        for (let j = 0; j < contentMap[0].length; j++) {
            if (contentMap[i][j] === COLSPAN_SYMBOL) {
                // skip the first column
                if (j === 0) {
                    continue;
                }
                tokenMap[i][j].meta = {markForDeletion: true};
                let colspanFactor = 2;
                // traverse columns backwards
                for (let col = j - 1; col >= 0; col--) {
                    if (contentMap[i][col] === COLSPAN_SYMBOL) {
                        colspanFactor++;
                        tokenMap[i][col].meta = {markForDeletion: true};
                    } else if (contentMap[i][col] === ROWSPAN_SYMBOL) {
                        // Do nothing, this should be applied on the row that's being extended
                        break;
                    } else {
                        tokenMap[i][col].attrSet('colspan', colspanFactor.toString());
                        break;
                    }
                }
            }

            if (contentMap[i][j] === ROWSPAN_SYMBOL) {
                // skip the first row
                if (i === 0) {
                    continue;
                }
                tokenMap[i][j].meta = {markForDeletion: true};
                let rowSpanFactor = 2;
                // traverse rows upward
                for (let row = i - 1; row >= 0; row--) {
                    if (contentMap[row][j] === ROWSPAN_SYMBOL) {
                        rowSpanFactor++;
                        tokenMap[row][j].meta = {markForDeletion: true};
                    } else if (contentMap[row][j] === COLSPAN_SYMBOL) {
                        break;
                    } else {
                        tokenMap[row][j].attrSet('rowspan', rowSpanFactor.toString());
                        break;
                    }
                }
            }
        }
    }
};

/**
 * Removes td_open and matching td_close tokens and the content within them
 *
 * @param {number} tableStart - The index of the start of the table in the state tokens array.
 * @param {Token[]} tokens - The array of tokens from state.
 * @returns {void}
 */
const clearTokens = (tableStart: number, tokens: Token[]): void => {
    // use splices array to avoid modifying the tokens array during iteration
    const splices: number[][] = [];
    for (let i = tableStart; i < tokens.length; i++) {
        if (tokens[i].meta?.markForDeletion) {
            // Use unshift instead of push so that the splices indexes are in reverse order.
            // Reverse order guarantees that we don't mess up the indexes while removing the items.
            splices.unshift([i]);
            const level = tokens[i].level;
            // find matching td_close with the same level
            for (let j = i + 1; j < tokens.length; j++) {
                if (tokens[j].type === 'yfm_td_close' && tokens[j].level === level) {
                    splices[0].push(j);
                    break;
                }
            }
        }
    }
    splices.forEach(([start, end]) => {
        // check that we have both start and end defined
        // it's possible we didn't find td_close index
        if (start && end) {
            tokens.splice(start, end - start + 1);
        }
    });
};

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

            const {rows, endOfTable, pos} = getTableRowPositions(
                state,
                startPosition,
                endPosition,
                startLine,
            );

            const attrs = extractAttributes(state, pos);

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

            const tableStart = state.tokens.length;
            token = state.push('yfm_table_open', 'table', 1);

            const {attr: singleKeyAttrs = [], ...fullAttrs} = attrs;
            for (const [property, values] of Object.entries(fullAttrs)) {
                token.attrJoin(property, values.join(' '));
            }

            for (const attr of singleKeyAttrs) {
                token.attrJoin(attr, 'true');
            }

            token.map = [startLine, endOfTable];

            token = state.push('yfm_tbody_open', 'tbody', 1);
            token.map = [startLine + 1, endOfTable - 1];

            const maxRowLength = Math.max(...rows.map(([, , cols]) => cols.length));

            // cellsMaps is a 2-D map of all td_open tokens in the table.
            // cellsMap is used to access the table cells by [row][column] coordinates
            const cellsMap: Token[][] = [];

            // contentMap is a 2-D map of the text content within cells in the table.
            // To apply spans, traverse the contentMap and modify the cells from cellsMap
            const contentMap: string[][] = [];

            for (let i = 0; i < rows.length; i++) {
                const [rowLineStarts, rowLineEnds, cols] = rows[i];
                cellsMap.push([]);
                contentMap.push([]);
                const rowLength = cols.length;

                token = state.push('yfm_tr_open', 'tr', 1);
                token.map = [rowLineStarts, rowLineEnds];

                for (let j = 0; j < cols.length; j++) {
                    const [begin, end] = cols[j];
                    token = state.push('yfm_td_open', 'td', 1);
                    cellsMap[i].push(token);
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
                    const contentToken = state.tokens[state.tokens.length - 2];

                    // In case of ">" within a cell without whitespace it gets consumed as a blockquote.
                    // To handle that, check markup as well
                    const content = contentToken.content.trim() || contentToken.markup.trim();
                    contentMap[i].push(content);

                    token = state.push('yfm_td_close', 'td', -1);
                    state.tokens[state.tokens.length - 1].map = [end.line, end.line + 1];

                    state.lineMax = oldLineMax;
                    state.tShift[begin.line] = oldTshift;
                    state.bMarks[begin.line] = oldBMark;
                    state.eMarks[end.line] = oldEMark;

                    const rowTokens = cellsMap[cellsMap.length - 1];
                    extractAndApplyClassFromToken(contentToken, rowTokens[rowTokens.length - 1]);
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

            applySpans(contentMap, cellsMap);
            clearTokens(tableStart, state.tokens);

            token = state.push('yfm_tbody_close', 'tbody', -1);

            token = state.push('yfm_table_close', 'table', -1);
            state.tokens[state.tokens.length - 1].map = [endOfTable, endOfTable + 1];

            state.lineMax = oldParentLineMax;
            state.line = endOfTable;

            return true;
        },
    );

    md.renderer.rules['yfm_table_open'] = (tokens, idx, _opts, _env, self) => {
        const token = tokens[idx];

        const containerClassName = 'yfm-table-container';

        return [
            `<div class="${containerClassName}">`,
            `<${token.tag}${self.renderAttrs(token)}>\n`,
        ].join('\n');
    };

    md.renderer.rules['yfm_table_close'] = (tokens, idx) => {
        const token = tokens[idx];

        return [`</${token.tag}>`, '</div>\n'].join('\n');
    };
};

export = yfmTable;
