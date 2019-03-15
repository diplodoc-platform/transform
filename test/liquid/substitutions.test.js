'use strict';

const substitutions = require('../../lib/liquid/substitutions');

describe('Substitutions', () => {
    test('Should substitute to inline text', () => {
        expect(
            substitutions('Hello {{ user.name }}!', {user: {name: 'Alice'}})
        ).toEqual('Hello Alice!');
    });
});
