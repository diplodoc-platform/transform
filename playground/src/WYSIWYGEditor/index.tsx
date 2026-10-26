import {useEffect, useState} from 'react';
import {MarkdownEditorView, useMarkdownEditor} from '@gravity-ui/markdown-editor';
import {Toaster, ToasterComponent, ToasterProvider} from '@gravity-ui/uikit';

import {deleteQuery, persist, prefill} from 'src/utils';

function WYSIWYGEditor() {
    const [toaster] = useState(() => new Toaster());
    const [initialMarkup] = useState(() => prefill());
    const editor = useMarkdownEditor({
        preset: 'yfm',
        md: {linkify: true, html: false},
        initial: {markup: initialMarkup, toolbarVisible: true, mode: 'wysiwyg'},
    });

    useEffect(() => {
        const handleChange = () => {
            const value = editor.getValue();
            if (value) {
                persist(value);
            } else {
                deleteQuery('input');
            }
        };

        editor.on('change', handleChange);
        return () => editor.off('change', handleChange);
    }, [editor]);

    return (
        <ToasterProvider toaster={toaster}>
            <MarkdownEditorView autofocus stickyToolbar editor={editor} />
            <ToasterComponent />
        </ToasterProvider>
    );
}

export default WYSIWYGEditor;
