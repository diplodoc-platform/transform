const substitutions = require('../../lib/liquid/substitutions');

describe('Functions', () => {
    describe('slice', () => {
        test('Test 1', () => {
            expect(
                substitutions('Hello M{{ user.name.slice(1) }}!', {vars: {user: {name: 'Pasha'}}}),
            ).toEqual('Hello Masha!');
        });
        test('Test 2', () => {
            expect(
                substitutions('Hello M{{ user.name.slice(1, 2) }}sha!', {vars: {user: {name: 'Pasha'}}}),
            ).toEqual('Hello Masha!');
        });
        test('Test 3', () => {
            expect(
                substitutions('Hello M{{ user.name.slice(1, 2) }}sha!'),
            ).toEqual('Hello M{{ user.name.slice(1, 2) }}sha!');
        });
    });
});
