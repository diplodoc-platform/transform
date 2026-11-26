import {sync} from 'markdownlint';
import {describe, expect, test, vi} from 'vitest';

import {log} from '../src/transform/log';
import yfmlint from '../src/transform/yfmlint';

// Mock markdownlint to assert that the whole linting pipeline is skipped
// for files with the `markdownlint-disable-file` comment.
vi.mock('markdownlint', () => ({
    sync: vi.fn(() => ({})),
}));

const mockedSync = vi.mocked(sync);

const lint = (input: string, path: string) => {
    yfmlint({
        input,
        pluginOptions: {log, path},
    });
};

describe('yfmlint', () => {
    beforeEach(() => {
        log.clear();
        mockedSync.mockClear();
    });

    test('should not run markdownlint for files with markdownlint-disable-file comment', () => {
        lint(
            [
                '<!-- markdownlint-disable-file -->',
                '',
                '# Heading',
                '',
                'Text with violations',
            ].join('\n'),
            'disabled.md',
        );

        expect(mockedSync).not.toHaveBeenCalled();
    });

    test('should not run markdownlint when the comment is preceded by whitespace only', () => {
        lint(
            ['\r\n', '  \t', '<!--markdownlint-disable-file-->', '# Heading'].join('\n'),
            'disabled-whitespace.md',
        );

        expect(mockedSync).not.toHaveBeenCalled();
    });

    test('should not run markdownlint for a comment in upper case', () => {
        lint('<!-- MARKDOWNLINT-DISABLE-FILE -->\n# Heading\n', 'disabled-uppercase.md');

        expect(mockedSync).not.toHaveBeenCalled();
    });

    test('should run markdownlint for regular files', () => {
        lint('# Heading\n\nSome text\n', 'regular.md');

        expect(mockedSync).toHaveBeenCalledTimes(1);
    });

    test('should run markdownlint when the comment is not on the first meaningful line', () => {
        lint('# Heading\n\n<!-- markdownlint-disable-file -->\n', 'disabled-not-first.md');

        expect(mockedSync).toHaveBeenCalledTimes(1);
    });

    test('should run markdownlint when the comment disables specific rules only', () => {
        lint('<!-- markdownlint-disable-file MD013 -->\n# Heading\n', 'disabled-single-rule.md');

        expect(mockedSync).toHaveBeenCalledTimes(1);
    });
});
