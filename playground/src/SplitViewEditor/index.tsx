import {useCallback, useEffect, useState} from 'react';

import {useTabs} from '../useTabs';
import {deleteQuery, persist, prefill} from '../utils';

import {generateHTML, generateMD, generateTokens} from './generators';
import './index.scss';
import {InputArea} from './input-area';
import {OutputArea} from './output-area';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).MonacoEnvironment = {
    getWorker: (_: unknown, label: string) => {
        if (label === 'json') {
            return new Worker(
                new URL('monaco-editor/esm/vs/language/json/json.worker?worker', 'monaco-worker'),
            );
        }
        return new Worker(
            new URL('monaco-editor/esm/vs/editor/editor.worker?worker', 'monaco-worker'),
        );
    },
};

export type PlaygroundProperties = {
    content?: string;
    persistRestore?: boolean;
};

function SplitViewEditor(props: PlaygroundProperties) {
    const content = props?.persistRestore ? prefill() : props?.content;
    const [input, setInput] = useState(content || '');
    const [generated, setGenerated] = useState(input);

    const generate = useCallback(
        (active: string) => {
            if (active === 'markdown') {
                // @ts-expect-error
                setGenerated(generateMD(input));
            } else if (active === 'html') {
                // @ts-expect-error
                setGenerated(generateHTML(input));
            } else if (active === 'tokens') {
                // @ts-expect-error
                setGenerated(generateTokens(input));
            } else if (active === 'preview') {
                // @ts-expect-error
                setGenerated(generateHTML(input));
            } else {
                setGenerated(input);
            }
        },
        [input],
    );

    const [outputItems, outputActive, handleSetOutputAreaTabActive] = useTabs({
        items: [
            {id: 'preview', title: 'html preview'},
            {id: 'html', title: 'html'},
            {id: 'markdown', title: 'markdown'},
            {id: 'tokens', title: 'tokens'},
        ],
        initial: 'preview',
        onSetActive: generate,
    });

    const handleInputChange = (input?: string) => {
        setInput(input || '');
    };

    useEffect(() => {
        generate(outputActive);

        if (props?.persistRestore && input) {
            // @ts-expect-error
            persist(input);
        } else {
            deleteQuery('input');
        }
    }, [input]);

    return (
        <div className="split-view">
            {/* @ts-expect-error */}
            <InputArea handleInputChange={handleInputChange} input={input} />
            <OutputArea
                handleSelectTab={handleSetOutputAreaTabActive}
                tabItems={outputItems}
                tabActive={outputActive}
                /* @ts-expect-error */
                output={generated}
            />
        </div>
    );
}

export default SplitViewEditor;
