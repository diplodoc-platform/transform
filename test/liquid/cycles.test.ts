import dedent from 'ts-dedent';

import liquidSnippet from '../../src/transform/liquid';

const commentsByPage = [
    {
        linkUrl: 'https://example.com',
        comments: ['First comment', 'Second comment'],
    },
    {
        linkUrl: 'https://example2.com',
        comments: ['Third comment', 'Fourth comment'],
    },
];
const vars = {
    users: ['Alice', 'Ivan', 'Petr'],
    users2: ['alice', 'ivan', 'petr'],
    needCapitalize: true,
    user: 'Alex',
    user2: 'Alex',
    projects: [
        {projectName: 'First project', commentsByPage},
        {projectName: 'Second project', commentsByPage},
    ],
};

describe('Cycles', () => {
    describe('location', () => {
        test('Inline for block', () => {
            expect(
                liquidSnippet(
                    'Prefix {% for user in users %} {{user}} {% endfor %} Postfix',
                    vars,
                    '',
                ),
            ).toEqual('Prefix Alice Ivan Petr Postfix');
        });

        test('Nested inline for block', () => {
            expect(
                liquidSnippet(
                    'Prefix {% for user1 in users %} {% for user2 in users %} {{user1}}+{{user2}} {% endfor %} {% endfor %} Postfix',
                    vars,
                    '',
                ),
            ).toEqual(
                'Prefix Alice+Alice Alice+Ivan Alice+Petr Ivan+Alice Ivan+Ivan Ivan+Petr Petr+Alice Petr+Ivan Petr+Petr Postfix',
            );
        });

        test('Multiline for block', () => {
            expect(
                liquidSnippet(
                    dedent`
                    Prefix
                    {% for user in users %}
                    {{user}}
                    {% endfor %}
                    Postfix
                `,
                    vars,
                    '',
                ),
            ).toEqual(dedent`
                Prefix
                Alice
                Ivan
                Petr
                Postfix
            `);
        });

        test('Multiline for block2', () => {
            const input = dedent`
                Prefix

                {% for project in projects %}

                ## {{project.projectName}}
                {% for item in project.commentsByPage %}

                [{{item.linkUrl}}]({{item.linkUrl}})
                {% for item2 in item.comments %}
                * {{item2}}
                {% endfor %}

                {% endfor %}
                {% endfor %}

                Postfix
            `;
            const result = dedent`
                Prefix


                ## First project

                [https://example.com](https://example.com)
                * First comment
                * Second comment

                [https://example2.com](https://example2.com)
                * Third comment
                * Fourth comment

                ## Second project

                [https://example.com](https://example.com)
                * First comment
                * Second comment

                [https://example2.com](https://example2.com)
                * Third comment
                * Fourth comment

                Postfix
            `;
            expect(liquidSnippet(input, vars, '')).toEqual(result);
        });

        test('Multiline nested for block without indent', () => {
            expect(
                liquidSnippet(
                    dedent`
                    Prefix
                    {% for user1 in users %}
                    {% for user2 in users %}
                    {{user1}}+{{user2}}
                    {% endfor %}
                    {% endfor %}
                    Postfix
                `,
                    vars,
                    '',
                ),
            ).toEqual(dedent`
                Prefix
                Alice+Alice
                Alice+Ivan
                Alice+Petr
                Ivan+Alice
                Ivan+Ivan
                Ivan+Petr
                Petr+Alice
                Petr+Ivan
                Petr+Petr
                Postfix
            `);
        });
    });

    describe('with conditions, filters, substitutions', () => {
        test('Test 1', () => {
            expect(
                liquidSnippet(
                    'Prefix {% for user in users2 %}{% if needCapitalize %} {{user | capitalize}}+{{user2}} {% else %} {{user}} {% endif %}{% endfor %} Postfix',
                    vars,
                    '',
                ),
            ).toEqual('Prefix Alice+Alex Ivan+Alex Petr+Alex Postfix');
        });
    });

    describe('loop object', () => {
        test('loop.last with not', () => {
            expect(
                liquidSnippet(
                    `
{% for user in users %}
    {{user}}{% if not loop.last %},{% endif %}
{% endfor %}
`.replace(/\n|\r|\s{2}/g, ''),
                    vars,
                    '',
                ),
            ).toEqual('Alice,Ivan,Petr');
        });

        test('loop.first', () => {
            expect(
                liquidSnippet(
                    `
{% for user in users %}
    {% if loop.first %}{{user}}{% endif %}
{% endfor %}
`.replace(/\n|\r|\s{2}/g, ''),
                    vars,
                    '',
                ),
            ).toEqual('Alice');
        });

        test('loop.order and loop.length', () => {
            expect(
                liquidSnippet(
                    '{% for user in users %}{{loop.order}}/{{loop.length}}:{{user}}{% if not loop.last %};{% endif %}{% endfor %}',
                    vars,
                    '',
                ),
            ).toEqual('1/3:Alice;2/3:Ivan;3/3:Petr');
        });

        test('loop.index is 0-based', () => {
            expect(
                liquidSnippet(
                    `
{% for user in users %}
    {{loop.index}}:{{user}}|
{% endfor %}
`.replace(/\n|\r|\s{2}/g, ''),
                    vars,
                    '',
                ),
            ).toEqual('0:Alice|1:Ivan|2:Petr|');
        });

        test('loop.index in condition', () => {
            expect(
                liquidSnippet(
                    `
{% for user in users %}
    {% if loop.index == 2 %}{{user}}{% endif %}
{% endfor %}
`.replace(/\n|\r|\s{2}/g, ''),
                    vars,
                    '',
                ),
            ).toEqual('Petr');
        });

        test('nested loops have own loop object', () => {
            expect(
                liquidSnippet(
                    `
{% for u1 in users %}
    [
        {% for u2 in users %}
            {{u2}}{% if not loop.last %},{% endif %}
        {% endfor %}
    ]{% if not loop.last %};{% endif %}
{% endfor %}
`.replace(/\n|\r|\s{2}/g, ''),
                    vars,
                    '',
                ),
            ).toEqual('[Alice,Ivan,Petr];[Alice,Ivan,Petr];[Alice,Ivan,Petr]');
        });
    });

    describe('with code blocks', () => {
        test('code block before cycle block', () => {
            expect(
                liquidSnippet(
                    '```\nCode block\n```\n\n {% for user in users %} {{user}} {% endfor %}',
                    vars,
                    '',
                ),
            ).toEqual('```\nCode block\n```\n\n Alice Ivan Petr');
        });

        test('cycle block in code block', () => {
            expect(
                liquidSnippet('```\n{% for user in users %} {{user}} {% endfor %}\n```', vars, '', {
                    conditionsInCode: true,
                }),
            ).toEqual('```\nAlice Ivan Petr\n```');
        });
    });
});
