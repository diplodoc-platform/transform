import substitutions from '../../src/transform/liquid/substitutions';

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
        test('Test 3', () => {
            expect(substitutions('Hello M{{ user.name.slice(1, 2) }}sha!', {})).toEqual(
                'Hello M{{ user.name.slice(1, 2) }}sha!',
            );
        });
    });
});
