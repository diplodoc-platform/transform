import conditions from '../../src/transform/liquid/conditions';

describe('Conditions', () => {
    describe('location', () => {
        test('Should works for if only', () => {
            expect(
                conditions(
                    'Prefix{% if user %} Inline if {% endif %}Postfix',
                    {user: {name: 'Alice'}},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix Inline if Postfix');
        });

        test('should not render text if condition is false', () => {
            expect(
                conditions('Prefix{% if foo %} Inline if{% endif %} Postfix', {foo: false}, '', {
                    sourceMap: {},
                }),
            ).toEqual('Prefix Postfix');
        });

        test('Should works for if-else: positive', () => {
            expect(
                conditions(
                    'Prefix{% if user %} Inline if {% else %} else {% endif %}Postfix',
                    {user: {name: 'Alice'}},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix Inline if Postfix');
        });

        test('Should works for if-else: negative', () => {
            expect(
                conditions(
                    'Prefix{% if yandex %} Inline if {% else %} else {% endif %}Postfix',
                    {user: {name: 'Alice'}},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix else Postfix');
        });

        test('Should works for if-elsif', () => {
            expect(
                conditions(
                    'Prefix{% if yandex %} Inline if {% elsif user %} else {% endif %}Postfix',
                    {user: {name: 'Alice'}},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix else Postfix');
        });
        test('Should works for multiple if block', () => {
            expect(
                conditions(
                    'Prefix\n' +
                        '{% if test %}\n' +
                        `${' '.repeat(4)}How are you?\n` +
                        '{% endif %}\n' +
                        'Postfix',
                    {test: true},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix\n' + `${' '.repeat(4)}How are you?\n` + 'Postfix');
        });

        test('Multiple if block with indent', () => {
            expect(
                conditions(
                    'Prefix\n' +
                        `${' '.repeat(4)}{% if test %}\n` +
                        `${' '.repeat(4)}How are you?\n` +
                        `${' '.repeat(4)}{% endif %}\n` +
                        'Postfix',
                    {test: true},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix\n' + `${' '.repeat(8)}How are you?\n` + 'Postfix');
        });

        test('Multiple if block with indent and negative condition', () => {
            expect(
                conditions(
                    'Prefix\n' +
                        `${' '.repeat(4)}{% if test %}\n` +
                        `${' '.repeat(8)}How are you?\n` +
                        `${' '.repeat(4)}{% endif %}\n` +
                        'Postfix',
                    {test: false},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix\n' + 'Postfix');
        });

        test('Two multiple if blocks in a row', () => {
            expect(
                conditions(
                    '{% if test %}\n' +
                        `${' '.repeat(4)}How are you?\n` +
                        '{% endif %}\n' +
                        '{% if test %}\n' +
                        `${' '.repeat(4)}How are you?\n` +
                        '{% endif %}',
                    {test: true},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual(`${' '.repeat(4)}How are you?\n` + `${' '.repeat(4)}How are you?`);
        });

        test('Condition inside the list item content', () => {
            expect(
                conditions(
                    '1. list item 1\n\n' + `${' '.repeat(4)}{% if true %}Test{% endif %}\n`,
                    {},
                    '',
                    {
                        sourceMap: {},
                    },
                ),
            ).toEqual('1. list item 1\n\n' + `${' '.repeat(4)}Test\n`);
        });
    });

    describe('Conditions', () => {
        describe('Positive', () => {
            test('Should support single value', () => {
                expect(
                    conditions(
                        'Prefix{% if user %} Inline if {% endif %}Postfix',
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support ==', () => {
                expect(
                    conditions(
                        "Prefix{% if user.name == 'Alice' %} Inline if {% endif %}Postfix",
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support !=', () => {
                expect(
                    conditions(
                        "Prefix{% if user.name != 'Bob' %} Inline if {% endif %}Postfix",
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support >=', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age >= 18 %} Inline if {% endif %}Postfix',
                        {user: {age: 18}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support >', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age > 18 %} Inline if {% endif %}Postfix',
                        {user: {age: 21}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support <=', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age <= 18 %} Inline if {% endif %}Postfix',
                        {user: {age: 18}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test('Should support <', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age < 18 %} Inline if {% endif %}Postfix',
                        {user: {age: 1}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test("Should support 'and'", () => {
                expect(
                    conditions(
                        'Prefix{% if user and user.age >= 18 %} Inline if {% endif %}Postfix',
                        {user: {age: 18}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });

            test("Should support 'or'", () => {
                expect(
                    conditions(
                        'Prefix{% if user.age < 18 or user.age >= 21 %} Inline if {% endif %}Postfix',
                        {user: {age: 21}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Inline if Postfix');
            });
        });

        describe('Negaive', () => {
            test('Should support single value', () => {
                expect(
                    conditions(
                        'Prefix{% if yandex %} Inline if {% else %} else {% endif %}Postfix',
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support ==', () => {
                expect(
                    conditions(
                        "Prefix{% if user.name == 'Alice' %} Inline if {% else %} else {% endif %}Postfix",
                        {user: {name: 'Bob'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support !=', () => {
                expect(
                    conditions(
                        "Prefix{% if user.name != 'Bob' %} Inline if {% else %} else {% endif %}Postfix",
                        {user: {name: 'Bob'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support >=', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age >= 18 %} Inline if {% else %} else {% endif %}Postfix',
                        {user: {age: 1}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support >', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age > 18 %} Inline if {% else %} else {% endif %}Postfix',
                        {user: {age: 1}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support <=', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age <= 18 %} Inline if {% else %} else {% endif %}Postfix',
                        {user: {age: 21}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test('Should support <', () => {
                expect(
                    conditions(
                        'Prefix{% if user.age < 18 %} Inline if {% else %} else {% endif %}Postfix',
                        {user: {age: 21}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test("Should support 'and'", () => {
                expect(
                    conditions(
                        'Prefix{% if user and user.age >= 18 %} Inline if {% else %} else {% endif %}Postfix',
                        {user: {age: 1}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });

            test("Should support 'or'", () => {
                expect(
                    conditions(
                        'Prefix{% if user.age < 18 or user.age >= 21 %} Inline if {% else %} else ' +
                            '{% endif %}Postfix',
                        {user: {age: 20}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix else Postfix');
            });
        });
    });

    describe('Nested conditions', () => {
        describe('Inline text', () => {
            test("Should support nested if's: positive", () => {
                expect(
                    conditions(
                        "Prefix{% if user %} Before nested if{% if user.name == 'Alice' %} nested if " +
                            '{% endif %}After nested if {% endif %}Postfix',
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Before nested if nested if After nested if Postfix');
            });

            test("Should support nested if's: negative", () => {
                expect(
                    conditions(
                        "Prefix{% if user %} Before nested if {% if user.name == 'Alice' %} nested if " +
                            '{% endif %} After nested if {% endif %}Postfix',
                        {user: {name: 'Bob'}},
                        '',
                        {sourceMap: {}},
                    ),
                ).toEqual('Prefix Before nested if  After nested if Postfix');
            });
        });
    });

    describe("Chail else's", () => {
        test('Should supported in inline text', () => {
            expect(
                conditions(
                    "Prefix{% if yandex %} if {% elsif user.name == 'Bob' %} Bob " +
                        "{% elsif user.name == 'Alice' %} Alice {% endif %}Postfix",
                    {user: {name: 'Alice'}},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix Alice Postfix');
        });
        test('Should supported in inline text', () => {
            expect(
                conditions(
                    "Prefix{% if yandex %} if {% elsif user.name == 'Bob' %} Bob " +
                        "{% elsif user.name == 'Alice' %} Alice {% endif %}Postfix",
                    {user: {name: 'Bob'}},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual('Prefix Bob Postfix');
        });
    });
});
