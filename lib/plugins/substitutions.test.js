const substitutions = require('./substitutions');
const {callPlugin} = require('./testUtils');

const callSubstitutionsPlugin = callPlugin.bind(null, substitutions);

describe('Substitutions', () => {
    test('Should substitute to inline text', () => {
        expect(
            callSubstitutionsPlugin([
                {
                    'type': 'paragraph_open',
                    'content': ''
                }, {
                    'type': 'inline',
                    'children': [{
                        'type': 'text',
                        'tag': '',
                        'children': null,
                        'content': 'Hello {{ user.name }}!'
                    }],
                    'content': 'Hello {{ user.name }}!'
                }, {
                    'type': 'paragraph_close',
                    'content': ''
                }],
            {vars: {user: {name: 'Alice'}}}
            )
        ).toEqual([
            {
                'type': 'paragraph_open',
                'content': ''
            }, {
                'type': 'inline',
                'children': [{
                    'type': 'text',
                    'tag': '',
                    'children': null,
                    'content': 'Hello Alice!'
                }],
                'content': 'Hello {{ user.name }}!'
            }, {
                'type': 'paragraph_close',
                'content': ''
            }
        ]);
    });

    test('Should substitute to nested text', () => {
        expect(
            callSubstitutionsPlugin(
                [
                    {
                        'type': 'paragraph_open',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'children': [
                            {
                                'type': 'text',
                                'children': null,
                                'content': 'List:'
                            },
                            {
                                'type': 'softbreak',
                                'children': null,
                                'content': ''
                            },
                            {
                                'type': 'text',
                                'children': null,
                                'content': '* Point 1.'
                            },
                            {
                                'type': 'softbreak',
                                'children': null,
                                'content': ''
                            },
                            {
                                'type': 'text',
                                'children': null,
                                'content': '* Hello {{ user.name }}!'
                            }
                        ],
                        'content': 'List:\n    * Point 1.\n    * Hello {{ user.name }}!'
                    },
                    {
                        'type': 'paragraph_close',
                        'children': null,
                        'content': ''
                    }
                ],
                {vars: {user: {name: 'Alice'}}}
            )
        ).toEqual(
            [
                {
                    'type': 'paragraph_open',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'inline',
                    'children': [
                        {
                            'type': 'text',
                            'children': null,
                            'content': 'List:'
                        },
                        {
                            'type': 'softbreak',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'text',
                            'children': null,
                            'content': '* Point 1.'
                        },
                        {
                            'type': 'softbreak',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'text',
                            'children': null,
                            'content': '* Hello Alice!'
                        }
                    ],
                    'content': 'List:\n    * Point 1.\n    * Hello {{ user.name }}!'
                },
                {
                    'type': 'paragraph_close',
                    'children': null,
                    'content': ''
                }
            ]
        );
    });

    test('Shouldn\'t substitute to code', () => {
        expect(
            callSubstitutionsPlugin(
                [
                    {
                        'type': 'fence',
                        'tag': 'code',
                        'children': null,
                        'content': ' {{ user.name }}\n'
                    }
                ],
                {vars: {user: {name: 'Alice'}}}
            )
        ).toEqual(
            [
                {
                    'type': 'fence',
                    'tag': 'code',
                    'children': null,
                    'content': ' {{ user.name }}\n'
                }
            ]
        );
    });
});
