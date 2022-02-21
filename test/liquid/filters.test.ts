import substitutions from '../../src/transform/liquid/substitutions';

describe('Filters', () => {
    test('capitalize', () => {
        expect(
            substitutions('Hello {{ user.name | capitalize }}!', {user: {name: 'alice'}}),
        ).toEqual('Hello Alice!');
    });

    test('length', () => {
        expect(
            substitutions('Users count: {{ users | length }}', {users: ['Alice', 'Mark']}),
        ).toEqual('Users count: 2');
    });

    describe('length', () => {
        test('Test1', () => {
            expect(
                substitutions('Users count: {{ users | length }}', {users: ['Alice', 'Mark']}),
            ).toEqual('Users count: 2');
        });
        test('Test2', () => {
            expect(substitutions('{{ test | length }}', {test: 'hello world'})).toEqual('11');
        });
    });

    describe('escapeMarkdown', () => {
        test('Test1', () => {
            expect(substitutions('{{ test | escapeMarkdown }}', {test: '`*_{}[]()#+-.!|'})).toEqual(
                '\\`\\*\\_\\{\\}\\[\\]\\(\\)\\#\\+\\-\\.\\!\\|',
            );
        });
    });

    describe('There is no a space after and before the filter operator. It can only be a variable.', () => {
        test('Existent filter and non-existent variable', () => {
            expect(
                substitutions('{{ test|capitalize }}', {'test|capitalize': 'Alice', test: 'mark'}),
            ).toEqual('Alice');
        });
        test('Non-existent filter and non-existent variable', () => {
            expect(
                substitutions('{{ test|testFilter }}', {'test|testFilter': 'Alice', test: 'mark'}),
            ).toEqual('Alice');
        });
        test('Non-existent filter and existent variable', () => {
            expect(substitutions('{{ test|test }}', {'test|test': 'Alice', test: 'mark'})).toEqual(
                'Alice',
            );
        });
        test('Existent filter and existent variable', () => {
            expect(
                substitutions('{{ test|capitalize }}', {'test|capitalize': 'Alice', test: 'mark'}),
            ).toEqual('Alice');
        });
    });

    describe('There is a space after and beefore filter operator. It can only be a filter.', () => {
        test('Existent filter', () => {
            expect(substitutions('{{ test | capitalize }}', {test: 'mark'})).toEqual('Mark');
        });
        test('Non-existent filter', () => {
            expect(substitutions('{{ test | testFilter }}', {test: 'Alice'})).toEqual(
                '{{ test | testFilter }}',
            );
        });
    });

    describe('There is a space after the filter operator. It can only be a filter.', () => {
        test('Existent filter', () => {
            expect(substitutions('{{ test| capitalize }}', {test: 'mark'})).toEqual('Mark');
        });
        test('Non-existent filter', () => {
            expect(substitutions('{{ test| testFilter }}', {test: 'Alice'})).toEqual(
                '{{ test| testFilter }}',
            );
        });
    });

    describe('There is a space before the filter operator. It can only be a filter.', () => {
        test('Existent filter', () => {
            expect(substitutions('{{ test |capitalize }}', {test: 'mark'})).toEqual('Mark');
        });
        test('Non-existent filter', () => {
            expect(substitutions('{{ test |testFilter }}', {test: 'Alice'})).toEqual(
                '{{ test |testFilter }}',
            );
        });
    });
});
