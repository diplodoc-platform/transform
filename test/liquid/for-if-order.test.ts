import dedent from 'ts-dedent';

import {liquidSnippet} from '../../src/transform/liquid';
import {log} from '../../src/transform/log';

describe('Cycles with conditions', () => {
    beforeEach(() => {
        log.clear();
    });

    test('for loop inside if should not run when condition is false', () => {
        const input = dedent`
            {% if test.testarray %}
            {% for testval in test.testarray %}
            - {{ testval }}
            {% endfor %}
            {% endif %}
        `;
        const result = liquidSnippet(input, {test: {t: 1}}, 'test.md');
        expect(result.trim()).toEqual('');
        expect(log.get().error.length).toBe(0);
    });
});
