import conditions from '../../src/transform/liquid/conditions';

const getPadX = (string: string) => {
    const match = /^(\s+)/.exec(string);
    const pad = (match && match[1]) || '';

    return pad.length || 0;
};

export function trim(string: string | TemplateStringsArray): string {
    const strings = ([] as string[]).concat(string as string) as string[];
    let lines: string[] = ([] as string[]).concat(...strings.map((string) => string.split('\n')));

    let pad: number;
    if (lines[0].trim() === '') {
        pad = getPadX(lines[1]);
        lines = lines.slice(1);
    } else {
        pad = getPadX(lines[0]);
    }

    lines = lines.map((line) => line.slice(pad));

    return lines.join('\n').trim();
}

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
                    `
                    Prefix
                    {% if test %}
                        How are you?
                    {% endif %}
                    Postfix
                `,
                    {test: true},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual(`
                    Prefix
                        How are you?
                    Postfix
                `);
        });

        test('Multiple if block with indent', () => {
            expect(
                conditions(
                    `
                    Prefix
                        {% if test %}
                        How are you?
                        {% endif %}
                    Postfix
                `,
                    {test: true},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual(`
                    Prefix
                        How are you?
                    Postfix
                `);
        });

        test('Multiple if block with indent and negative condition', () => {
            expect(
                conditions(
                    `
                    Prefix
                    {% if test %}
                        How are you?
                    {% endif %}
                    Postfix
                `,
                    {test: false},
                    '',
                    {sourceMap: {}},
                ),
            ).toEqual(`
                    Prefix
                    Postfix
                `);
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

        test('Condition inside the note block (at start)', () => {
            expect(
                conditions(
                    trim`
                    {% note alert %}

                    {% if locale == 'ru' %}You can't use the public geofence names.{% endif %}Test

                    {% endnote %}
                `,
                    {},
                    '',
                    {
                        sourceMap: {},
                    },
                ),
            ).toEqual(trim`
                {% note alert %}

                Test

                {% endnote %}
            `);
        });

        test('Condition inside the note block (at end)', () => {
            expect(
                conditions(
                    trim`
                    {% note alert %}

                    Test{% if locale == 'ru' %}You can't use the public geofence names.{% endif %}

                    {% endnote %}
                `,
                    {},
                    '',
                    {
                        sourceMap: {},
                    },
                ),
            ).toEqual(trim`
                {% note alert %}

                Test

                {% endnote %}
            `);
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

        describe('Strict', () => {
            test('Should handle strict if check', () => {
                expect(
                    conditions(
                        'Prefix{% if name != "test" %} Inline if {% endif %}Postfix',
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}, strict: true},
                    ),
                ).toEqual('Prefix{% if name != "test" %} Inline if {% endif %}Postfix');
            });

            test('Should handle strict elseif', () => {
                expect(
                    conditions(
                        `
                            Prefix
                            {% if user.name == "Test" %}
                            Test
                            {% elsif user.lastname == "Markovna" %}
                            Markovna
                            {% endif %}
                            Postfix
                        `,
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}, strict: true},
                    ),
                ).toEqual(`
                            Prefix
                            {% if user.name == "Test" %}
                            Test
                            {% elsif user.lastname == "Markovna" %}
                            Markovna
                            {% endif %}
                            Postfix
                        `);
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

            test('Should handle nested strict if', () => {
                expect(
                    conditions(
                        `
                            Prefix
                            {% if user.name == "Alice" %}
                            Alice
                                {% if user.lastname == "Markovna" %}
                            Ok
                                {% endif %}
                            {% elsif user.name == "Bob" %}
                                {% if user.lastname == "Markovich" %}
                            Ok
                                {% endif %}
                            {% else %}
                            Bad
                            {% endif %}
                            Postfix
                        `,
                        {user: {name: 'Alice'}},
                        '',
                        {sourceMap: {}, strict: true},
                    ),
                ).toEqual(`
                            Prefix
                            Alice
                                {% if user.lastname == "Markovna" %}
                            Ok
                                {% endif %}
                            Postfix
                        `);
            });

            test('Condition inside the cut block with multiple linebreaks', () => {
                expect(
                    conditions(
                        trim`
                    {% cut "Title" %}

                    {% if locale == 'ru' %}

                    a

                    {% endif %}

                    {% endcut %}
                `,
                        {locale: 'ru'},
                        '',
                        {
                            sourceMap: {},
                        },
                    ),
                ).toEqual(trim`
                    {% cut "Title" %}


                    a


                    {% endcut %}
            `);
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
