const conditions = require('../../lib/liquid/conditions');

describe('Conditions', () => {
    describe('location', () => {
        test('Should works for if only', () => {
            expect(
                conditions(
                    'Prefix {% if user %} Inline if {% endif %} Postfix',
                    {user: {name: 'Alice'}},
                ),
            ).toEqual('Prefix Inline if Postfix');
        });

        test('Should works for if-else: positive', () => {
            expect(
                conditions(
                    'Prefix {% if user %} Inline if {% else %} else {% endif %} Postfix',
                    {user: {name: 'Alice'}},
                ),
            ).toEqual('Prefix Inline if Postfix');
        });

        test('Should works for if-else: negative', () => {
            expect(
                conditions(
                    'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix',
                    {user: {name: 'Alice'}},
                ),
            ).toEqual('Prefix else Postfix');
        });

        test('Should works for if-elsif', () => {
            expect(
                conditions(
                    'Prefix {% if yandex %} Inline if {% elsif user %} else {% endif %} Postfix',
                    {user: {name: 'Alice'}},
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
                    '{%- endif %}\n' +
                    'Postfix',
                    {test: true},
                ),
            ).toEqual(
                'Prefix\nHow are you?\nPostfix');
        });
    });

    describe('Conditions', () => {
        describe('Positive', () => {
            test('Should support single value', () => {
                expect(
                    conditions(
                        'Prefix {% if user %} Inline if {% endif %} Postfix',
                        {user: {name: 'Alice'}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support ==', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name == \'Alice\' %} Inline if {% endif %} Postfix',
                        {user: {name: 'Alice'}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support !=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name != \'Bob\' %} Inline if {% endif %} Postfix',
                        {user: {name: 'Alice'}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support >=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age >= 18 %} Inline if {% endif %} Postfix',
                        {user: {age: 18}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support >', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age > 18 %} Inline if {% endif %} Postfix',
                        {user: {age: 21}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support <=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age <= 18 %} Inline if {% endif %} Postfix',
                        {user: {age: 18}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support <', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 %} Inline if {% endif %} Postfix',
                        {user: {age: 1}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support \'and\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user and user.age >= 18 %} Inline if {% endif %} Postfix',
                        {user: {age: 18}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support \'or\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% endif %} Postfix',
                        {user: {age: 21}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });
        });

        describe('Negaive', () => {
            test('Should support single value', () => {
                expect(
                    conditions(
                        'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {name: 'Alice'}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support ==', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name == \'Alice\' %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {name: 'Bob'}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support !=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.name != \'Bob\' %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {name: 'Bob'}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support >=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {age: 1}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support >', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age > 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {age: 1}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support <=', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age <= 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {age: 21}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support <', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {age: 21}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support \'and\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user and user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix',
                        {user: {age: 1}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support \'or\'', () => {
                expect(
                    conditions(
                        'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% else %} else ' +
                        '{% endif %} Postfix',
                        {user: {age: 20}},
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
                        {user: {name: 'Alice'}},
                    ),
                ).toEqual('Prefix Before nested if nested if After nested if Postfix');
            });

            test('Should support nested if\'s: negative', () => {
                expect(
                    conditions(
                        'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if ' +
                        '{% endif %} After nested if {% endif %} Postfix',
                        {user: {name: 'Bob'}},
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
                    {user: {name: 'Alice'}},
                ),
            ).toEqual('Prefix Alice Postfix');
        });
    });
});
