import type {editor as EditorTypes} from 'monaco-editor';

import {useRef} from 'react';
import {Card} from '@gravity-ui/uikit';
import Editor from '@monaco-editor/react';

export type InputAreaProps = {
  handleInputChange: (input?: string) => void;
  input: string;
};

export function InputArea(props: InputAreaProps) {
  const monacoRef = useRef<EditorTypes.IStandaloneCodeEditor | null>(null);

  const {input, handleInputChange} = props;

  const editorOptions = {minimap: {enabled: false}, lineNumbers: 'off' as const};

  const lines = monacoRef?.current?.getModel()?.getLineCount() ?? 10;
  const height = `${lines * 16}px`;

  const handleOnMount = (editor) => {
    monacoRef.current = editor;
  };

  return (
    <div className="input">
      <Card size="m" className="area__card area-card__editor">
        <Editor
          height={height}
          defaultLanguage="markdown"
          defaultValue={input}
          onChange={handleInputChange}
          options={editorOptions}
          onMount={handleOnMount}
        />
      </Card>
    </div>
  );
}
