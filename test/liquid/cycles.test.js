

const liquid = require('../../lib/liquid');
const vars = {
    users: ['Alice', 'Ivan', 'Petr'],
    users2: ['alice', 'ivan', 'petr'],
    needCapitalize: true,
    user: 'Alex',
    user2: 'Alex',
};

describe('Cycles', () => {
    describe('location', () => {
        test('Inline for block', () => {
            expect(
                liquid(
                    'Prefix {% for user in users %} {{user}} {% endfor %} Postfix',
                    vars,
                ),
            ).toEqual('Prefix Alice Ivan Petr Postfix');
        });

        test('Nested inline for block', () => {
            expect(
                liquid(
                    'Prefix {% for user1 in users %} {% for user2 in users %} {{user1}}+{{user2}} {% endfor %} {% endfor %} Postfix',
                    vars,
                ),
            ).toEqual('Prefix Alice+Alice Alice+Ivan Alice+Petr Ivan+Alice Ivan+Ivan Ivan+Petr Petr+Alice Petr+Ivan Petr+Petr Postfix');
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
                ),
            ).toEqual(
                'Prefix\n' +
                'Alice\n' +
                'Ivan\n' +
                'Petr\n' +
                'Postfix',
            );
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

        test('Multiline nested for block with indent', () => {
            expect(
                liquid(
                    'Prefix\n' +
                    '{% for user1 in users %}\n' +
                    '    {% for user2 in users %}\n' +
                    '{{user1}}+{{user2}}\n' +
                    '    {% endfor %}\n' +
                    '{% endfor %}\n' +
                    'Postfix',
                    vars,
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
                    'Prefix {% for user in users2 %} {% if needCapitalize %} {{user | capitalize}}+{{user2}} {% else %} {{user}} {% endif %} {% endfor %} Postfix',
                    vars,
                ),
            ).toEqual('Prefix Alice+Alex Ivan+Alex Petr+Alex Postfix');
        });
    });
});
