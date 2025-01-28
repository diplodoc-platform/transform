import React, {useEffect, useState} from 'react';
import {cloneDeep} from 'lodash';

import {
  BasePreset,
  BehaviorPreset,
  Extension,
  MarkdownBlocksPreset,
  MarkdownMarksPreset,
} from '@doc-tools/yfm-editor';
import {YfmEditorView, useYfmEditor, wysiwygToolbarConfigs, markupToolbarConfigs} from '@doc-tools/yfm-editor/bundle';
import {Toaster} from "@gravity-ui/uikit";

import {deleteElementById, deleteQuery, persist, prefill} from 'src/utils';
import {YfmPreset} from "src/WYSIWYGEditor/yfmPreset";

function WYSIWYGEditor({}) {
  const toaster = new Toaster();
  const wToolbarConfig = cloneDeep(wysiwygToolbarConfigs.wToolbarConfig);
  const mToolbarConfig = cloneDeep(markupToolbarConfigs.mToolbarConfig);
  const wToolbarConfigWithoutColor = deleteElementById(wToolbarConfig, 'colorify')
  const mToolbarConfigWithoutColor = deleteElementById(mToolbarConfig, 'colorify')

  const [input, setInput] = useState(prefill() || '');

  if(input){
    persist(input)
  } else {
    deleteQuery('input')
  }

  const extensions = React.useMemo<Extension>(
    () => (builder) =>
      builder
        .use(BasePreset, {})
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
    initialMarkup: input,
    initialToolbarVisible: true,
    initialEditorType: 'wysiwyg',
  });

  useEffect(() => {
    editor.on('change', () => persist(editor.getValue()));
    setInput(editor.getValue())
  }, [input])

  return <YfmEditorView autofocus editor={editor} toaster={toaster} wysiwygToolbarConfig={wToolbarConfigWithoutColor} markupToolbarConfig={mToolbarConfigWithoutColor}/>;
}

export default WYSIWYGEditor;
