const substitutions = require('../../lib/liquid/substitutions');

describe('Filters', () => {
    test('capitalize', () => {
        expect(
            substitutions('Hello {{ user.name | capitalize }}!', {vars: {user: {name: 'alice'}}}),
        ).toEqual('Hello Alice!');
    });

    test('length', () => {
        expect(
            substitutions('Users count: {{ users | length }}', {vars: {users: ['Alice', 'Mark']}}),
        ).toEqual('Users count: 2');
    });

    describe('length', () => {
        test('Test1', () => {
            expect(
                substitutions('Users count: {{ users | length }}', {vars: {users: ['Alice', 'Mark']}}),
            ).toEqual('Users count: 2');
        });
        test('Test2', () => {
            expect(
                substitutions('{{ test | length }}', {vars: {test: 'hello world'}}),
            ).toEqual('11');
        });
    });

    describe('escapeMarkdown', () => {
        test('Test1', () => {
            expect(
                substitutions('{{ test | escapeMarkdown }}', {vars: {test: '`*_{}[]()#+-.!|'}}),
            ).toEqual('\\`\\*\\_\\{\\}\\[\\]\\(\\)\\#\\+\\-\\.\\!\\|');
        });
    });

    describe('There is no a space after and before the filter operator. It can only be a variable.', () => {
        test('Existent filter and non-existent variable', () => {
            expect(
                substitutions('{{ test|capitalize }}', {vars:  {'test|capitalize': 'Alice', test: 'mark'}}),
            ).toEqual('Alice');
        });
        test('Non-existent filter and non-existent variable', () => {
            expect(
                substitutions('{{ test|testFilter }}', {vars: {'test|testFilter': 'Alice', test: 'mark'}}),
            ).toEqual('Alice');
        });
        test('Non-existent filter and existent variable', () => {
            expect(
                substitutions('{{ test|test }}', {vars: {'test|test': 'Alice', test: 'mark'}}),
            ).toEqual('Alice');
        });
        test('Existent filter and existent variable', () => {
            expect(
                substitutions('{{ test|capitalize }}', {vars: {'test|capitalize': 'Alice', test: 'mark'}}),
            ).toEqual('Alice');
        });
    });

    describe('There is a space after and beefore filter operator. It can only be a filter.', () => {
        test('Existent filter', () => {
            expect(
                substitutions('{{ test | capitalize }}', {vars: {test: 'mark'}}),
            ).toEqual('Mark');
        });
        test('Non-existent filter', () => {
            expect(
                substitutions('{{ test | testFilter }}', {vars: {test: 'Alice'}}),
            ).toEqual('{{ test | testFilter }}');
        });
    });

    describe('There is a space after the filter operator. It can only be a filter.', () => {
        test('Existent filter', () => {
            expect(
                substitutions('{{ test| capitalize }}', {vars: {test: 'mark'}}),
            ).toEqual('Mark');
        });
        test('Non-existent filter', () => {
            expect(
                substitutions('{{ test| testFilter }}', {vars: {test: 'Alice'}}),
            ).toEqual('{{ test| testFilter }}');
        });
    });

    describe('There is a space before the filter operator. It can only be a filter.', () => {
        test('Existent filter', () => {
            expect(
                substitutions('{{ test |capitalize }}', {vars: {test: 'mark'}}),
            ).toEqual('Mark');
        });
        test('Non-existent filter', () => {
            expect(
                substitutions('{{ test |testFilter }}', {vars: {test: 'Alice'}}),
            ).toEqual('{{ test |testFilter }}');
        });
    });
});
