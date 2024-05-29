import {bold} from 'chalk';
import {NoValue, evalExp} from './evaluation';
import {tagLine} from './lexical';
import {log} from '../log';
import {SourceMapApi, createSourceMapApi, getLineNumber} from './sourceMap';

interface SourceMap {
    start: number;
    end: number;
    rawStart: string;
    rawEnd: string;
}

function resourcemap(source: string, ifTag: SourceMap, ifCon: SourceMap | null, api: SourceMapApi) {
    const [sourseStartLine, sourceEndLine] = [
        getLineNumber(source, ifTag.start + 1),
        getLineNumber(source, ifTag.end - 1),
    ];

    if (sourseStartLine === sourceEndLine || ifTag === ifCon) {
        return;
    }

    const linesTotal = source.split('\n').length;
    const {getSourceMapValue, moveLines, removeLines} = api;

    let offsetRestLines;
    if (ifCon) {
        const [resultStartLine, resultEndLine] = [
            getLineNumber(source, ifCon.start),
            getLineNumber(source, ifCon.end),
        ];

        // Move condition's content to the top
        const offsetContentLines = sourseStartLine - resultStartLine;
        moveLines({
            start: resultStartLine,
            end: resultEndLine,
            offset: offsetContentLines,
            withReplace: true,
        });

        // Remove the rest lines of the condition block
        removeLines({start: sourseStartLine, end: resultStartLine - 1});
        removeLines({start: resultEndLine + 1, end: sourceEndLine});

        // Calculate an offset of the rest lines
        offsetRestLines = getSourceMapValue(resultEndLine) - sourceEndLine;
    } else {
        // Remove the whole condition block
        removeLines({start: sourseStartLine, end: sourceEndLine});

        // Calculate offset of the rest lines
        offsetRestLines = sourseStartLine - sourceEndLine - 1;
    }

    // Offset the rest lines
    moveLines({start: sourceEndLine + 1, end: linesTotal, offset: offsetRestLines});
}

type IfCondition = SourceMap & {
    expr: string;
};

function headLinebreak(raw: string) {
    const match = raw.match(/^([^{]+){.*/);

    return match ? match[1] : '';
}

function tailLinebreak(raw: string) {
    const match = raw.match(/.*}(\s*\n)$/);

    return match ? match[1] : '';
}

function trimResult(content: string, ifTag: IfTag, ifCon: IfCondition | null) {
    if (!ifCon) {
        const head = headLinebreak(ifTag.rawStart);
        const tail = tailLinebreak(ifTag.rawEnd);
        return ifTag.isBlock ? '\n' : head + tail;
    }

    content = content.substring(ifCon.start, ifCon.end);

    const head = ifTag.isBlock ? headLinebreak(ifCon.rawStart) : headLinebreak(ifTag.rawStart);
    if (head) {
        content = (ifTag.isBlock ? '\n' : head) + content;
    }

    const tail = ifTag.isBlock ? tailLinebreak(ifCon.rawEnd) : tailLinebreak(ifTag.rawEnd);
    if (tail) {
        content = content + (ifTag.isBlock ? '\n' : tail);
    }

    return content;
}

class IfTag implements SourceMap {
    private conditions: IfCondition[] = [];

    get start() {
        if (!this.conditions.length) {
            return -1;
        }

        const first = this.conditions[0];

        return first.start - first.rawStart.length;
    }

    get end() {
        if (!this.conditions.length) {
            return -1;
        }

        const last = this.conditions[this.conditions.length - 1];

        return last.end + last.rawEnd.length;
    }

    get rawStart() {
        if (!this.conditions.length) {
            return '';
        }

        const first = this.conditions[0];

        return first.rawStart;
    }

    get rawEnd() {
        if (!this.conditions.length) {
            return '';
        }

        const last = this.conditions[this.conditions.length - 1];

        return last.rawEnd;
    }

    get isBlock() {
        const first = this.conditions[0];
        const last = this.conditions[this.conditions.length - 1];

        return tailLinebreak(first.rawStart) && headLinebreak(last.rawEnd);
    }

    *[Symbol.iterator](): Generator<IfCondition> {
        for (const condition of this.conditions) {
            yield condition;
        }
    }

    openCondition(raw: string, expr: string, start: number) {
        this.closeCondition(raw, start);
        this.conditions.push({
            rawStart: raw,
            start: start + raw.length,
            expr,
        } as IfCondition);

        return start + raw.length - tailLinebreak(raw).length;
    }

    closeCondition(raw: string, end: number) {
        const condition = this.conditions[this.conditions.length - 1];
        if (condition) {
            condition.rawEnd = raw;
            condition.end = end;
        }
    }
}

function inlineConditions(
    content: string,
    ifTag: IfTag,
    vars: Record<string, unknown>,
    strict: boolean,
) {
    let ifCon = null;

    for (const condition of ifTag) {
        const value = evalExp(condition.expr, vars, strict);

        if (condition.expr && value === NoValue) {
            return {
                result: content,
                // Fix offset for next matches.
                // There can be some significant linebreak and spaces.
                lastIndex: ifTag.end - tailLinebreak(ifTag.rawEnd).length,
                ifCon: ifTag,
            };
        }

        if (!condition.expr || value) {
            ifCon = condition;
            break;
        }
    }

    const start = content.slice(0, ifTag.start);
    const end = content.slice(ifTag.end);
    const result = trimResult(content, ifTag, ifCon);

    return {
        result: start + result + end,
        lastIndex: start.length + result.length,
        ifCon,
    };
}

export = function conditions(
    input: string,
    vars: Record<string, unknown>,
    path?: string,
    settings?: {
        sourceMap: Record<number, number>;
        strict?: boolean;
    },
) {
    const sourceMap = settings?.sourceMap || {};
    const strict = settings?.strict || false;
    const tagStack: IfTag[] = [];

    // Consumes all between curly braces
    // and all closest upon to first linebreak before and after braces.
    const R_LIQUID = /((?:\n[\t ]*)?{%-?([\s\S]*?)-?%}(?:[\t ]*\n)?)/g;

    let match;
    while ((match = R_LIQUID.exec(input)) !== null) {
        if (!match[1]) {
            continue;
        }

        const tagMatch = match[2].trim().match(tagLine);
        if (!tagMatch) {
            continue;
        }

        const [type, args] = tagMatch.slice(1);

        switch (type) {
            case 'if': {
                const tag = new IfTag();

                R_LIQUID.lastIndex = tag.openCondition(match[1], args, match.index);

                tagStack.push(tag);
                break;
            }
            case 'elsif':
            case 'else': {
                const tag = tagStack[tagStack.length - 1] as IfTag;

                R_LIQUID.lastIndex = tag.openCondition(match[1], args, match.index);

                break;
            }
            case 'endif': {
                const ifTag = tagStack.pop();

                if (!ifTag) {
                    // TODO(3y3): make lint rule
                    log.error(
                        `If block must be opened before close${path ? ` in ${bold(path)}` : ''}`,
                    );
                    break;
                }

                ifTag.closeCondition(match[1], match.index);

                const {result, lastIndex, ifCon} = inlineConditions(input, ifTag, vars, strict);

                resourcemap(input, ifTag, ifCon, createSourceMapApi(sourceMap));

                R_LIQUID.lastIndex = lastIndex;
                input = result;

                break;
            }
        }
    }

    if (tagStack.length !== 0) {
        log.error(`Condition block must be closed${path ? ` in ${bold(path)}` : ''}`);
    }

    return input;
};
