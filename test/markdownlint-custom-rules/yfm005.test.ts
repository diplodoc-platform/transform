import tabs from '../../src/transform/plugins/tabs';
import yfmlint from '../../src/transform/yfmlint';
import {yfm005} from '../../src/transform/yfmlint/markdownlint-custom-rule';
import {log} from '../../src/transform/log';

const tabListWithoutCloseToken = `
{% list tabs %}

- Название таба1

  Текст таба1.

  * Можно использовать списки.
  * И **другую** разметку.

- Название таба2

  Текст таба2.

`.trim();

const tabListWithCloseToken = `
{% list tabs %}

- Название таба1

  Текст таба1.

  * Можно использовать списки.
  * И **другую** разметку.

- Название таба2

  Текст таба2.

{% endlist %}
`.trim();

const lint = (input: string) => {
    yfmlint({
        input,
        pluginOptions: {log, path: 'test.md'},
        customLintRules: [yfm005],
        plugins: [tabs],
    });
};

describe('YFM005', () => {
    beforeEach(() => {
        log.clear();
    });

    it('Tab list without close token', () => {
        lint(tabListWithoutCloseToken);

        expect(log.get().error[0]).toMatch('YFM005');
    });

    it('Tab list with close token', () => {
        lint(tabListWithCloseToken);
        expect(log.isEmpty()).toBeTruthy();
    });
});
