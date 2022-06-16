import liquid from '../../src/transform/liquid';

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
                liquid('Prefix {% for user in users %} {{user}} {% endfor %} Postfix', vars, ''),
            ).toEqual('Prefix Alice Ivan Petr Postfix');
        });

        test('Nested inline for block', () => {
            expect(
                liquid(
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
                liquid(
                    'Prefix\n' +
                        '{% for user in users %}\n' +
                        '{{user}}\n' +
                        '{% endfor %}\n' +
                        'Postfix',
                    vars,
                    '',
                ),
            ).toEqual('Prefix\n' + 'Alice\n' + 'Ivan\n' + 'Petr\n' + 'Postfix');
        });

        test('Multiline for block2', () => {
            const input = `
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
`.trim();
            const result = `           
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
                `.trim();
            expect(liquid(input, vars, '')).toEqual(result);
        });

        test('Multiline nested for block without indent', () => {
            expect(
                liquid(
                    'Prefix\n' +
                        '{% for user1 in users %}\n' +
                        '{% for user2 in users %}\n' +
                        '{{user1}}+{{user2}}\n' +
                        '{% endfor %}\n' +
                        '{% endfor %}\n' +
                        'Postfix',
                    vars,
                    '',
                ),
            ).toEqual(
                'Prefix\n' +
                    'Alice+Alice\n' +
                    'Alice+Ivan\n' +
                    'Alice+Petr\n' +
                    'Ivan+Alice\n' +
                    'Ivan+Ivan\n' +
                    'Ivan+Petr\n' +
                    'Petr+Alice\n' +
                    'Petr+Ivan\n' +
                    'Petr+Petr\n' +
                    'Postfix',
            );
        });
    });

    describe('with conditions, filters, substitutions', () => {
        test('Test 1', () => {
            expect(
                liquid(
                    'Prefix {% for user in users2 %}{% if needCapitalize %} {{user | capitalize}}+{{user2}} {% else %} {{user}} {% endif %}{% endfor %} Postfix',
                    vars,
                    '',
                ),
            ).toEqual('Prefix Alice+Alex Ivan+Alex Petr+Alex Postfix');
        });
    });
});
