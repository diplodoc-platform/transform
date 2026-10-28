import type {MarkdownIt, MarkdownItPluginOpts, StateBlock} from '../../typings';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {Logger} from '../../log';
import type {
    DeprecationDescriptor,
    DeprecationLocation,
    DeprecationReporter,
} from '../../deprecation';
import type {TableAttrs, YfmTablePluginOptions} from './types';

import {AttrsParser} from '@diplodoc/utils';

import {getTableRowPositions, isOpenTableOrder} from './positions';

const pluginName = 'yfm_table';

const legacyAlignment: DeprecationDescriptor = {
    code: 'TABLE_CELL_ALIGN_CLASS',
    feature: 'Legacy .cell-align-* class in cell content',
    replacement:
        '::{align="..."} immediately after the cell marker; see the table alignment migration guide',
    removal: {version: '6.0.0'},
};
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
 * @param reporter - Parser-owned diagnostic scope.
 * @param location - Original cell source location.
 * @returns {void}
 */
function extractAndApplyClassFromToken(
    contentToken: Token,
    tdOpenToken: Token,
    reporter: DeprecationReporter,
    location: DeprecationLocation,
): void {
    // Regex to find class attribute in any position within brackets
    const blockRegex = /\s*\{[^}]*}$/;
    const allAttrs = contentToken.content.match(blockRegex);
    if (!allAttrs) {
        return;
    }

    const attrs = new AttrsParser().parse(allAttrs[0].trim());
    const attrsClass = attrs?.class?.join(' ');

    if (attrsClass) {
        if (attrsClass.split(' ').some((c) => c.startsWith('cell-align-'))) {
            reporter.warn(legacyAlignment, {location});
        }
        tdOpenToken.attrJoin('class', attrsClass);
        // remove the class from the token so that it's not propagated to tr or table level
        let replacedContent = allAttrs[0].replace(`.${attrsClass}`, '');
        if (replacedContent.trim() === '{}') {
            replacedContent = '';
        }
        contentToken.content = contentToken.content.replace(allAttrs[0], replacedContent);
    }
}

const VALID_ALIGN_VALUES: ReadonlySet<string> = new Set([
    'top-left',
    'top-center',
    'top-right',
    'center',
    'bottom-left',
    'bottom-right',
]);

function applyTableAttributes(
    token: Token,
    attrs: Record<string, string[]>,
    tableAttrs: TableAttrs,
    log?: Logger,
): number | null {
    const {attr: singleKeyAttrs = [], ...fullAttrs} = attrs;
    for (const [property, values] of Object.entries(fullAttrs)) {
        token.attrJoin(property, values.join(' '));
    }
    for (const attr of singleKeyAttrs) {
        token.attrJoin(attr, 'true');
    }
    token.meta = token.meta || {};
    token.meta.rawAttrs = tableAttrs;
    const headerRows = parseHeaderRows(tableAttrs, log);
    if (headerRows !== null) {
        token.meta.headerRows = headerRows;
        token.attrSet('data-header-rows', String(headerRows));
    }
    return headerRows;
}

function parseHeaderRows(rawAttrs: TableAttrs, log?: Logger): number | null {
    if (!('header-rows' in rawAttrs)) {
        return null;
    }
    const raw = rawAttrs['header-rows'];
    const trimmed = raw.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
        log?.warn(`Invalid table header-rows value: "${raw}"`);
        return null;
    }
    return parsed;
}

function applyCellAttrs(token: Token, rawAttrs: TableAttrs, log?: Logger): void {
    if ('align' in rawAttrs) {
        const value = rawAttrs['align'];
        if (!VALID_ALIGN_VALUES.has(value)) {
            log?.warn(`Unknown table cell align value: "${value}"`);
        }
        token.meta = token.meta || {};
        token.meta.align = value;
        token.attrSet('data-align', value);
        if (value) {
            token.attrJoin('class', `cell-align-${value}`);
        }
    }

    if ('bg' in rawAttrs) {
        const value = rawAttrs['bg'];
        token.meta = token.meta || {};
        token.meta.bg = value;
        token.attrSet('data-bg', value);
        if (value) {
            token.attrJoin('class', `cell-bg-${value}`);
        }
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

type TableContext = Partial<
    Pick<MarkdownItPluginOpts, 'path' | 'log' | 'deprecations' | 'compatibility'>
>;

/**
 * Bind the existing parser to an execution-host reporter fallback.
 * @param createReporter - Host diagnostic scope for standalone native calls.
 * @returns Original feature callback with its unchanged parsing behavior.
 */
export function createTablePlugin(createReporter: (options: TableContext) => DeprecationReporter) {
    const yfmTable = (md: MarkdownIt, opts: YfmTablePluginOptions & TableContext = {}) => {
        const reporter = opts.deprecations ?? createReporter(opts);
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

                const {rows, endOfTable, pos, tableAttrs} = getTableRowPositions(
                    state,
                    startPosition,
                    endPosition,
                    startLine,
                    opts,
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

                token.map = [startLine, endOfTable];
                const headerRows = applyTableAttributes(token, attrs, tableAttrs, opts.log);

                token = state.push('yfm_tbody_open', 'tbody', 1);
                token.map = [startLine + 1, endOfTable - 1];

                const maxRowLength = Math.max(...rows.map((row) => row.cols.length));

                // cellsMaps is a 2-D map of all td_open tokens in the table.
                // cellsMap is used to access the table cells by [row][column] coordinates
                const cellsMap: Token[][] = [];

                // contentMap is a 2-D map of the text content within cells in the table.
                // To apply spans, traverse the contentMap and modify the cells from cellsMap
                const contentMap: string[][] = [];

                for (let i = 0; i < rows.length; i++) {
                    const {
                        start: rowLineStarts,
                        end: rowLineEnds,
                        cols,
                        rawAttrs: rowRawAttrs,
                    } = rows[i];
                    cellsMap.push([]);
                    contentMap.push([]);
                    const rowLength = cols.length;

                    const isHeaderRow = headerRows !== null && i < headerRows;
                    const cellTag = isHeaderRow ? 'th' : 'td';

                    token = state.push('yfm_tr_open', 'tr', 1);
                    token.map = [rowLineStarts, rowLineEnds];
                    token.meta = token.meta || {};
                    token.meta.rawAttrs = rowRawAttrs;
                    if (isHeaderRow) {
                        token.attrSet('data-header', 'true');
                    }

                    for (let j = 0; j < cols.length; j++) {
                        const {start: begin, end, rawAttrs: cellRawAttrs} = cols[j];
                        token = state.push('yfm_td_open', cellTag, 1);
                        cellsMap[i].push(token);
                        token.map = [begin.line, end.line];
                        token.meta = token.meta || {};
                        token.meta.rawAttrs = cellRawAttrs;
                        if (isHeaderRow) {
                            token.attrSet('scope', 'col');
                        }
                        applyCellAttrs(token, cellRawAttrs, opts?.log);

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

                        token = state.push('yfm_td_close', cellTag, -1);
                        state.tokens[state.tokens.length - 1].map = [end.line, end.line + 1];

                        state.lineMax = oldLineMax;
                        state.tShift[begin.line] = oldTshift;
                        state.bMarks[begin.line] = oldBMark;
                        state.eMarks[end.line] = oldEMark;

                        const rowTokens = cellsMap[cellsMap.length - 1];
                        extractAndApplyClassFromToken(
                            contentToken,
                            rowTokens[rowTokens.length - 1],
                            reporter,
                            {
                                path:
                                    [state.env.path, opts.path].find((path) => path?.trim()) ??
                                    '<input>',
                                line: begin.line + 1,
                                column: begin.pos - state.bMarks[begin.line] + 1,
                            },
                        );
                    }

                    if (rowLength < maxRowLength) {
                        const emptyCellsCount = maxRowLength - rowLength;
                        for (let k = 0; k < emptyCellsCount; k++) {
                            token = state.push('yfm_td_open', cellTag, 1);
                            if (isHeaderRow) {
                                token.attrSet('scope', 'col');
                            }
                            token = state.push('yfm_td_close', cellTag, -1);
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
    };

    return yfmTable;
}
