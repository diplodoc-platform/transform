import React, {useEffect, useState} from 'react';
import {cloneDeep} from 'lodash';
import {
    BasePreset,
    BehaviorPreset,
    Extension,
    MarkdownBlocksPreset,
    MarkdownMarksPreset,
} from '@doc-tools/yfm-editor';
import {
    YfmEditorView,
    markupToolbarConfigs,
    useYfmEditor,
    wysiwygToolbarConfigs,
} from '@doc-tools/yfm-editor/bundle';
import {Toaster} from '@gravity-ui/uikit';

import {deleteElementById, deleteQuery, persist, prefill} from '../utils';

import {YfmPreset} from './yfmPreset';

function WYSIWYGEditor() {
    const toaster = new Toaster();
    const wToolbarConfig = cloneDeep(wysiwygToolbarConfigs.wToolbarConfig);
    const mToolbarConfig = cloneDeep(markupToolbarConfigs.mToolbarConfig);
    const wToolbarConfigWithoutColor = deleteElementById(wToolbarConfig, 'colorify');
    const mToolbarConfigWithoutColor = deleteElementById(mToolbarConfig, 'colorify');

    const [input, setInput] = useState(prefill() || '');

    if (input) {
        // @ts-expect-error
        persist(input);
    } else {
        deleteQuery('input');
    }

    const extensions = React.useMemo<Extension>(
        () => (builder) =>
            builder
                .use(BasePreset, {})
                // @ts-expect-error
                .use(BehaviorPreset, {})
                .use(MarkdownBlocksPreset, {image: false, heading: false})
                .use(MarkdownMarksPreset, {})
                .use(YfmPreset, {}),
        [],
    );

    const editor = useYfmEditor({
        linkify: true,
        allowHTML: false,
        extensions,
        // @ts-expect-error
        initialMarkup: input,
        initialToolbarVisible: true,
        initialEditorType: 'wysiwyg',
    });

    useEffect(() => {
        editor.on('change', () => persist(editor.getValue()));
        setInput(editor.getValue());
    }, [input]);

    return (
        // @ts-expect-error
        <YfmEditorView
            autofocus
            editor={editor}
            toaster={toaster}
            wysiwygToolbarConfig={wToolbarConfigWithoutColor}
            markupToolbarConfig={mToolbarConfigWithoutColor}
        />
    );
}

export default WYSIWYGEditor;
