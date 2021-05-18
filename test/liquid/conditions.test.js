const conditions = require('../../lib/liquid/conditions');

describe('Conditions', () => {
    describe('location', () => {
        test('Should works for if only', () => {
            expect(
                conditions(
                    'Prefix {% if user %} Inline if {% endif %} Postfix',
                    {vars: {user: {name: 'Alice'}}}
                ),
            ).toEqual('Prefix Inline if Postfix');
        });

        test('Should works for if-else: positive', () => {
            expect(
                conditions(
                    'Prefix {% if user %} Inline if {% else %} else {% endif %} Postfix',
                    {vars: {user: {name: 'Alice'}}},
                ),
            ).toEqual('Prefix Inline if Postfix');
        });

        test('Should works for if-else: negative', () => {
            expect(
                conditions(
                    'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix',
                    {vars: {user: {name: 'Alice'}}},
                ),
            ).toEqual('Prefix else Postfix');
        });

        test('Should works for if-elsif', () => {
            expect(
                conditions(
                    'Prefix {% if yandex %} Inline if {% elsif user %} else {% endif %} Postfix',
                    {vars: {user: {name: 'Alice'}}},
                ),
            ).toEqual(
                'Prefix else Postfix');
        });
        test('Should works for multiple if block', () => {
            expect(
                conditions(
                    'Prefix\n' +
                    '{% if test %}\n' +
                    '    How are you?\n' +
                    '{% endif %}\n' +
                    'Postfix',
                    {vars: {test: true}},
                ),
            ).toEqual(
                'Prefix\n' +
                '    How are you?\n' +
                'Postfix',
            );
        });

        test('Multiple if block with indent', () => {
            expect(
                conditions(
                    'Prefix\n' +
                    '    {% if test %}\n' +
                    '    How are you?\n' +
                    '    {% endif %}\n' +
                    'Postfix',
                    {vars: {test: true}},
                ),
            ).toEqual(
                'Prefix\n' +
                '        How are you?\n' +
                'Postfix',
            );
        });

        test('Multiple if block with indent and negative condition', () => {
            expect(
                conditions(
                    'Prefix\n' +
                    '     {% if test %}\n' +
                    '         How are you?\n' +
                    '     {% endif %}\n' +
                    'Postfix',
                    {vars: {test: false}},
                ),
            ).toEqual(
                'Prefix\n' +
                'Postfix',
            );
        });

        test('Two multiple if blocks in a row', () => {
            expect(
                conditions(
                    '{% if test %}\n' +
                    '    How are you?\n' +
                    '{% endif %}\n' +
                    '{% if test %}\n' +
                    '    How are you?\n' +
                    '{% endif %}',
                    {vars: {test: true}},
                ),
            ).toEqual(
                '    How are you?\n' +
                '    How are you?',
            );
        });

        test('Condition inside the list item content', () => {
            expect(
                conditions(
                    '1. list item 1\n\n' +
                    '    {% if true %} Test {% endif %}\n',
                    '1. list item 2\n\n' +
                    '    Test\n',
                ),
            ).toEqual(
                '1. list item 1\n\n' +
                '    Test\n',
                '1. list item 2\n\n' +
                '    Test\n',
            );
        });
    });

    describe('Conditions', () => {
        describe('Positive', () => {
            test('Should support single value', () => {
                expect(
                    conditions(
                        'Prefix {% if user %} Inline if {% endif %} Postfix',
                        {vars: {user: {name: 'Alice'}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support ==', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name == \'Alice\' %} Inline if {% endif %} Postfix',
                        {vars: {user: {name: 'Alice'}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support !=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name != \'Bob\' %} Inline if {% endif %} Postfix',
                        {vars: {user: {name: 'Alice'}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support >=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age >= 18 %} Inline if {% endif %} Postfix',
                        {vars: {user: {age: 18}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support >', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age > 18 %} Inline if {% endif %} Postfix',
                        {vars: {user: {age: 21}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support <=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age <= 18 %} Inline if {% endif %} Postfix',
                        {vars: {user: {age: 18}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support <', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 %} Inline if {% endif %} Postfix',
                        {vars: {user: {age: 1}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support \'and\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user and user.age >= 18 %} Inline if {% endif %} Postfix',
                        {vars: {user: {age: 18}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support \'or\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% endif %} Postfix',
                        {vars: {user: {age: 21}}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });
        });

        describe('Negaive', () => {
            test('Should support single value', () => {
                expect(
                    conditions(
                        'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {name: 'Alice'}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support ==', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name == \'Alice\' %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {name: 'Bob'}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support !=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name != \'Bob\' %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {name: 'Bob'}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support >=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {age: 1}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support >', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age > 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {age: 1}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support <=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age <= 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {age: 21}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support <', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {age: 21}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support \'and\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user and user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {vars: {user: {age: 1}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support \'or\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% else %} else ' +
                        '{% endif %} Postfix',
                        {vars: {user: {age: 20}}},
                    ),
                ).toEqual('Prefix else Postfix');
            });
        });
    });

    describe('Nested conditions', () => {
        describe('Inline text', () => {
            test('Should support nested if\'s: positive', () => {
                expect(
                    conditions(
                        'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if ' +
                        '{% endif %} After nested if {% endif %} Postfix',
                        {vars: {user: {name: 'Alice'}}},
                    ),
                ).toEqual('Prefix Before nested if nested if After nested if Postfix');
            });

            test('Should support nested if\'s: negative', () => {
                expect(
                    conditions(
                        'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if ' +
                        '{% endif %} After nested if {% endif %} Postfix',
                        {vars: {user: {name: 'Bob'}}},
                    ),
                ).toEqual('Prefix Before nested if  After nested if Postfix');
            });
        });
    });

    describe('Chail else\'s', () => {
        test('Should supported in inline text', () => {
            expect(
                conditions(
                    'Prefix {% if yandex %} if {% elsif user.name == \'Bob\' %} Bob ' +
                    '{% elsif user.name == \'Alice\' %} Alice {% endif %} Postfix',
                    {vars: {user: {name: 'Alice'}}},
                ),
            ).toEqual('Prefix Alice Postfix');
        });
    });
});
