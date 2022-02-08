import liquid from '../../src/transform/liquid';

describe('Substitutions', () => {
    test('Should substitute to inline text', () => {
        expect(liquid('Hello {{ user.name }}!', {user: {name: 'Alice'}})).toEqual('Hello Alice!');
    });
    test('Should not substitute variables start with dot', () => {
        expect(liquid('Hello {{ .name }}', {})).toEqual('Hello {{ .name }}');
    });
    test('Should not substitute variables wrapped not_var', () => {
        expect(liquid('Hello not_var{{ user.name }}!', {user: {name: 'Alice'}})).toEqual(
            'Hello {{ user.name }}!',
        );
    });
    test('Keep not_var syntax', () => {
        expect(
            liquid('Hello not_var{{ user.name }}!', {user: {name: 'Alice'}}, '', {
                keepNotVar: true,
            }),
        ).toEqual('Hello not_var{{ user.name }}!');
    });
});
