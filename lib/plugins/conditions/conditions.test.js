const conditions = require('./index');
const {callPlugin, paragraph} = require('../testUtils');

const callConditionsPlugin = callPlugin.bind(null, conditions);

describe('Conditions', () => {
    describe('location', () => {
        describe('Inline text', () => {
            test('Should works for if only', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user %} Inline if {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should works for if-else: positive', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should works for if-else: negative', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should works for if-elsif', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if yandex %} Inline if {% elsif user %} else {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(
                    paragraph('Prefix else Postfix'));
            });
        });

        describe('Blocks', () => {
            test('Should works for if only', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Block before if.'),
                        ...paragraph('{% if user %}'),
                        ...paragraph('Block in if'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Block after if.')
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    ...paragraph('Block before if.'),
                    ...paragraph('Block in if'),
                    ...paragraph('Block after if.')
                ]);
            });

            test('Should works for if-else: positive', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Block before if.'),
                        ...paragraph('{% if user %}'),
                        ...paragraph('Block in if'),
                        ...paragraph('{% else %}'),
                        ...paragraph('Block in else'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Block after if.')
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    ...paragraph('Block before if.'),
                    ...paragraph('Block in if'),
                    ...paragraph('Block after if.')
                ]);
            });

            test('Should works for if-else: negative', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Block before if.'),
                        ...paragraph('{% if yandex %}'),
                        ...paragraph('Block in if'),
                        ...paragraph('{% else %}'),
                        ...paragraph('Block in else'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Block after if.')
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    ...paragraph('Block before if.'),
                    ...paragraph('Block in else'),
                    ...paragraph('Block after if.')
                ]);
            });

            test('Should works for if-elsif', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Block before if.'),
                        ...paragraph('{% if yandex %}'),
                        ...paragraph('Block in if'),
                        ...paragraph('{% elsif user %}'),
                        ...paragraph('Block in else'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Block after if.')
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    ...paragraph('Block before if.'),
                    ...paragraph('Block in else'),
                    ...paragraph('Block after if.')
                ]);
            });
        });

        test('Should\'t works for code', () => {
            expect(
                callConditionsPlugin([
                    {
                        'type': 'fence',
                        'tag': 'code',
                        'children': null,
                        'content': ' Prefix {% if yandex %} Inline if {% endif %} Postfix.\n'
                    }
                ], {vars: {user: {name: 'Alice'}}})
            ).toEqual([
                {
                    'type': 'fence',
                    'tag': 'code',
                    'children': null,
                    'content': ' Prefix {% if yandex %} Inline if {% endif %} Postfix.\n'
                }
            ]);
        });
    });

    describe('Conditions', () => {
        describe('Positive', () => {
            test('Should support single value', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user %} Inline if {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support ==', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.name == \'Alice\' %} Inline if {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support !=', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.name != \'Bob\' %} Inline if {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support >=', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age >= 18 %} Inline if {% endif %} Postfix'),
                        {vars: {user: {age: 18}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support >', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age > 18 %} Inline if {% endif %} Postfix'),
                        {vars: {user: {age: 21}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support <=', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age <= 18 %} Inline if {% endif %} Postfix'),
                        {vars: {user: {age: 18}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support <', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age < 18 %} Inline if {% endif %} Postfix'),
                        {vars: {user: {age: 1}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support \'and\'', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user and user.age >= 18 %} Inline if {% endif %} Postfix'),
                        {vars: {user: {age: 18}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });

            test('Should support \'or\'', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% endif %} Postfix'),
                        {vars: {user: {age: 21}}}
                    )
                ).toEqual(paragraph('Prefix Inline if Postfix'));
            });
        });

        describe('Negaive', () => {
            test('Should support single value', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support ==', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.name == \'Alice\' %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support !=', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.name != \'Bob\' %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support >=', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {age: 1}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support >', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age > 18 %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {age: 1}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support <=', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age <= 18 %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {age: 21}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support <', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age < 18 %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {age: 21}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support \'and\'', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user and user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {age: 1}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });

            test('Should support \'or\'', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% else %} else {% endif %} Postfix'),
                        {vars: {user: {age: 20}}}
                    )
                ).toEqual(paragraph('Prefix else Postfix'));
            });
        });
    });

    describe('Nested conditions', () => {
        describe('Inline text', () => {
            test('Should support nested if\'s: positive', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if {% endif %} After nested if {% endif %} Postfix'),
                        {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual(paragraph('Prefix Before nested if nested if After nested if Postfix'));
            });

            test('Should support nested if\'s: negative', () => {
                expect(
                    callConditionsPlugin(
                        paragraph('Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if {% endif %} After nested if {% endif %} Postfix'),
                        {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual(paragraph('Prefix Before nested if  After nested if Postfix'));
            });
        });

        describe('Blocks', () => {
            test('Should support nested if\'s: positive', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Prefix'),
                        ...paragraph('{% if user %}'),
                        ...paragraph('Before nested'),
                        ...paragraph('{% if user.name == \'Alice\' %}'),
                        ...paragraph('nested if'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('After nested'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Postfix')
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    ...paragraph('Prefix'),
                    ...paragraph('Before nested'),
                    ...paragraph('nested if'),
                    ...paragraph('After nested'),
                    ...paragraph('Postfix')
                ]);
            });

            test('Should support nested if\'s: negative', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Prefix'),
                        ...paragraph('{% if user %}'),
                        ...paragraph('Before nested'),
                        ...paragraph('{% if user.name == \'Alice\' %}'),
                        ...paragraph('nested if'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('After nested'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Postfix')
                    ],
                    {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual([
                    ...paragraph('Prefix'),
                    ...paragraph('Before nested'),
                    ...paragraph('After nested'),
                    ...paragraph('Postfix')
                ]);
            });

            test('Should support inline if in block if', () => {
                expect(
                    callConditionsPlugin([
                        ...paragraph('Prefix'),
                        ...paragraph('{% if user %}'),
                        ...paragraph('Before nested if {% if user.name == \'Alice\' %} Nested if {% endif %} After nested if'),
                        ...paragraph('{% endif %}'),
                        ...paragraph('Postfix')
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    ...paragraph('Prefix'),
                    ...paragraph('Before nested if Nested if After nested if'),
                    ...paragraph('Postfix')
                ]);
            });
        });
    });

    describe('Chail else\'s', () => {
        test('Should supported in inline text', () => {
            expect(
                callConditionsPlugin(
                    paragraph('Prefix {% if yandex %} if {% elsif user.name == \'Bob\' %} Bob {% elsif user.name == \'Alice\' %} Alice {% endif %} Postfix'),
                    {vars: {user: {name: 'Alice'}}})
            ).toEqual(paragraph('Prefix Alice Postfix'));
        });

        test('Should supported in blocks', () => {
            expect(
                callConditionsPlugin([
                    ...paragraph('Prefix'),
                    ...paragraph('{% if yandex %}'),
                    ...paragraph('If'),
                    ...paragraph('{% elsif user.name == \'Bob\' %}'),
                    ...paragraph('Bob'),
                    ...paragraph('{% elsif user.name == \'Alice\' %}'),
                    ...paragraph('Alice'),
                    ...paragraph('{% endif %}'),
                    ...paragraph('Postfix')
                ],
                {vars: {user: {name: 'Alice'}}})
            ).toEqual([
                ...paragraph('Prefix'),
                ...paragraph('Alice'),
                ...paragraph('Postfix')
            ]);
        });
    });
});
