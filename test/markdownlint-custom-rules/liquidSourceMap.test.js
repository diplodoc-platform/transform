const liquid = require('../../lib/liquid');
const {log} = require('../utils');

const testFn = 'test.md';
const vars = {
    users: ['Alice', 'Ivan', 'Petr'],
    test: true,
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
});
