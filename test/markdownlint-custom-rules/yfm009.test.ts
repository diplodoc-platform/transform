import {LogLevels, log} from '../../src/transform/log';
import term from '../../src/transform/plugins/term';
import yfmlint from '../../src/transform/yfmlint';
import {yfm009} from '../../src/transform/yfmlint/markdownlint-custom-rule';

const withIncludes = `\
[*widget-popup1]: {% include [ ](./_includes/widget.md) %}

[*button-popup2]: {% include [ ](./_includes/button) %}

[*button-popup3]: {% include [ ](./_includes/button) %}`.trim();

const plainText = `\
[*widget-popup1]: hello world

hi i am text

[*widget-popup2]: it's will fail`.trim();

const appendText = (text: string) => {
    return `${text}\n\nhi i am text after`;
};

const prependText = (text: string) => {
    return `hi i am text before\n\n${text}`;
};

const random = () => Math.floor(Math.random() * 1e8);

const lint = (input: string) => {
    yfmlint({
        input,
        pluginOptions: {log, path: `${random()}.md`},
        lintConfig: {
            'log-levels': {
                YFM009: LogLevels.ERROR,
            },
        },
        customLintRules: [yfm009],
        plugins: [term],
    });
};

describe('YFM009', () => {
    beforeEach(() => {
        log.clear();
    });

    it('not accepts text between terms', () => {
        lint(plainText);
        expect(log.get().error[0]).toMatch('YFM009');
    });

    it('not accepts includes with text after', () => {
        lint(appendText(withIncludes));
        expect(log.get().error[0]).toMatch('YFM009');
    });

    it('accepts includes', () => {
        lint(withIncludes);
        expect(log.isEmpty()).toBeTruthy();
    });

    it('accepts includes with text before', () => {
        lint(prependText(withIncludes));
        expect(log.isEmpty()).toBeTruthy();
    });
});
