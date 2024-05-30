import {isSingleVariable} from '../../src/transform/liquid/lexical';

describe('Lexical functions', () => {
    describe('isSingleVariable', () => {
        test('Valid single variable without surrounding text', () => {
            expect(isSingleVariable('{{variable}}')).toEqual(true);
        });

        test('Two variables should return false', () => {
            expect(isSingleVariable('{{variable1}} {{variable2}}')).toEqual(false);
        });

        test('Text before variable should return false', () => {
            expect(isSingleVariable('some text {{variable}}')).toEqual(false);
        });

        test('Text after variable should return false', () => {
            expect(isSingleVariable('{{variable}} some text')).toEqual(false);
        });

        test('Valid single variable with filter', () => {
            expect(isSingleVariable('{{ variable | filter }}')).toEqual(true);
        });

        test('Single variable with leading and trailing space should return false', () => {
            expect(isSingleVariable(' {{variable}} ')).toEqual(false);
        });

        test('Single variable with multiple leading and trailing spaces should return false', () => {
            expect(isSingleVariable('  {{variable}}  ')).toEqual(false);
        });

        test('Single variable with tabs and newlines should return false', () => {
            expect(isSingleVariable('\t{{variable}} \n')).toEqual(false);
        });

        test('Empty string should return false', () => {
            expect(isSingleVariable('')).toEqual(false);
        });

        test('Text without variables should return false', () => {
            expect(isSingleVariable('just some text')).toEqual(false);
        });

        test('Single curly braces should return false', () => {
            expect(isSingleVariable('{variable}')).toEqual(false);
        });

        test('Unmatched curly braces should return false', () => {
            expect(isSingleVariable('{{variable}')).toEqual(false);
        });
    });
});
