const substitutions = require('../../lib/liquid/substitutions');

describe('Functions', () => {
    describe('slice', () => {
        test('Test 1', () => {
            expect(
                substitutions('Hello M{{ user.name.slice(1) }}!', {user: {name: 'Pasha'}}),
            ).toEqual('Hello Masha!');
        });
        test('Test 2', () => {
            expect(
                substitutions('Hello M{{ user.name.slice(1, 2) }}sha!', {user: {name: 'Pasha'}}),
            ).toEqual('Hello Masha!');
        });
    });
});
