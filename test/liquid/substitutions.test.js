const substitutions = require('../../lib/liquid/substitutions');

describe('Substitutions', () => {
    test('Should substitute to inline text', () => {
        expect(
            substitutions('Hello {{ user.name }}!', {vars: {user: {name: 'Alice'}}}),
        ).toEqual('Hello Alice!');
    });
    test('Should not substitute variables start with dot', () => {
        expect(
            substitutions('Hello {{ .name }}'),
        ).toEqual('Hello {{ .name }}');
    });
});
