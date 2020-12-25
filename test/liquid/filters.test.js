

const substitutions = require('../../lib/liquid/substitutions');

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
            expect(
                substitutions('{{ test | length }}', {test: 'hello world'}),
            ).toEqual('11');
        });
    });

    describe('escapeMarkdown', () => {
        test('Test1', () => {
            expect(
                substitutions('{{ test | escapeMarkdown }}', {test: '`*_{}[]()#+-.!|'}),
            ).toEqual('\\`\\*\\_\\{\\}\\[\\]\\(\\)\\#\\+\\-\\.\\!\\|');
        });
    });
});
