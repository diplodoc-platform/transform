import type {PageContent} from '@gravity-ui/page-constructor';

import {useCallback, useState} from 'react';
import {Editor} from '@gravity-ui/page-constructor/editor';
import {contentTransformer} from '@gravity-ui/page-constructor/server';
import {ErrorBoundary} from 'react-error-boundary';

import {memoizeLast} from 'src/PageConstructorEditor/utils';
import {deleteQuery, persist, prefill} from 'src/utils';

const contentTransformerMemoized = memoizeLast(contentTransformer);

function PageConstructorEditor() {
    const [input, setInput] = useState<PageContent>(() => {
        const content = JSON.parse(prefill() || '{"blocks":[]}');
        if (!Array.isArray(content.blocks)) {
            throw new Error('Page constructor content must contain a blocks array');
        }
        return content;
    });
    const lang = 'ru';
    const onChange = (content: PageContent) => {
        setInput(content);
        if (content) {
            persist(JSON.stringify(content));
        } else {
            deleteQuery('input');
        }
    };

    const transformContent = useCallback(
        (content: PageContent) => ({
            ...content,
            ...contentTransformerMemoized({content, options: {lang}}),
        }),
        [lang],
    );

    return (
        <Editor
            content={input}
            onChange={onChange}
            transformContent={transformContent}
            deviceEmulationSettings={{applyHostStyles: true}}
        />
    );
}

function SafePageConstructorEditor() {
    return (
        <ErrorBoundary
            fallback={
                <p>
                    Something went wrong. You may have entered the wrong PC config format, it must
                    start with "blocks" array.{' '}
                    <a
                        href={
                            '?mode=PC&input=%257B%2522blocks%2522%3A%255B%255D%2C%2522animated%2522%3Afalse%257D'
                        }
                    >
                        Refresh the page.
                    </a>
                </p>
            }
        >
            <PageConstructorEditor />
        </ErrorBoundary>
    );
}

export default SafePageConstructorEditor;
