import liquid from '../../src/transform/liquid';
import {log} from '../../src/transform/log';

const testFn = 'test.md';
const vars = {
    users: ['Alice', 'Ivan', 'Petr'],
    test: true,
};

const getDefaultSourceMap = (linesCount: number) => {
    return Array(linesCount)
        .fill('')
        .reduce((acc, _, index) => {
            acc[index + 1] = String(index + 1);
            return acc;
        }, {});
};

describe('Check source map after liquid', () => {
    beforeEach(() => {
        log.clear();
    });

    it('Simple check', () => {
        const input =
            /*1*/ 'Prefix\n' +
            /*2*/ '{% for user in users %}\n' +
            /*3*/ '{{user}}\n' +
            /*4*/ '{% endfor %}\n' +
            /*5*/ '{% if test %}\n' +
            /*6*/ 'How are you?\n' +
            /*7*/ '{% endif %}\n' +
            /*8*/ 'Postfix';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});
        /*
              New line                 Source line
              1    Prefix              1  Prefix
              2    Alice               3  {{user}}
              3    Ivan                -
              4    Petr                -
              5    How are you?        6  How are you?
              6    Postfix             8  Postfix
         */

        expect(sourceMap).toEqual({'1': '1', '2': '3', '5': '6', '6': '8'});
    });

    it('Should works with two conditions in a row', () => {
        const input =
            /*1*/ '{% if test %}\n' +
            /*2*/ '    How are you?\n' +
            /*3*/ '{% endif %}\n' +
            /*4*/ '{% if test %}\n' +
            /*5*/ '    How are you?\n' +
            /*6*/ '{% endif %}';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});

        expect(sourceMap).toEqual({'1': '2', '2': '5'});
    });

    it('Should works with nested conditions', () => {
        const input =
            /*1*/ 'Prefix\n' +
            /*2*/ '{% for user in users %}\n' +
            /*3*/ '{{user}}\n' +
            /*4*/ '{% endfor %}\n' +
            /*5*/ '{% if test %}\n' +
            /*6*/ '{% if lie %}\n' +
            /*7*/ 'How are you 2?\n' +
            /*8*/ '{% endif %}\n' +
            /*9*/ 'How are you?\n' +
            /*10*/ '{% endif %}\n' +
            /*11*/ 'Postfix';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});

        expect(sourceMap).toEqual({'1': '1', '2': '3', '5': '9', '6': '11'});
    });

    it('Should works with nested cycles', () => {
        const input =
            /*1*/ 'Prefix\n' +
            /*2*/ '{% for user1 in users %}\n' +
            /*3*/ '{% for user2 in users %}\n' +
            /*4*/ '{{user1}}+{{user2}}\n' +
            /*5*/ '{% endfor %}\n' +
            /*6*/ '{% endfor %}\n' +
            /*7*/ 'Postfix';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});

        expect(sourceMap).toEqual({'1': '1', '4': '5', '11': '7'});
    });

    it('Should works with fences: 2 lines', () => {
        const input =
            /*1*/ 'Prefix\n' +
            /*2*/ '```' +
            /*3*/ 'some code there\n' +
            /*4*/ 'test\n' +
            /*5*/ '```\n' +
            /*6*/ 'Postfix';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});

        expect(sourceMap).toEqual(getDefaultSourceMap(6));
    });

    it('Should works with fences: 1 line', () => {
        const input =
            /*1*/ 'Prefix\n' +
            /*2*/ '```' +
            /*3*/ 'some code there\n' +
            /*4*/ '```\n' +
            /*5*/ 'Postfix';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});

        expect(sourceMap).toEqual(getDefaultSourceMap(5));
    });

    it('Should works with fences: inline', () => {
        const input = /*1*/ 'Prefix\n' + /*2*/ '```some code there```\n' + /*3*/ 'Postfix';

        const {sourceMap} = liquid(input, vars, testFn, {withSourceMap: true});

        expect(sourceMap).toEqual(getDefaultSourceMap(3));
    });
});
