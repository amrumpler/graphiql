import { useEffect, useRef } from 'react';

import { useExecutionContext } from '../execution';
import {
  commonKeys,
  DEFAULT_EDITOR_THEME,
  DEFAULT_KEY_MAP,
  importCodeMirror,
} from './common';
import { useEditorContext } from './context';
import {
  useChangeHandler,
  useKeyMap,
  useMergeQuery,
  usePrettifyEditors,
  useSynchronizeOption,
} from './hooks';
import { WriteableEditorProps } from './types';

export type UseHeaderEditorArgs = WriteableEditorProps & {
  /**
   * Invoked when the contents of the headers editor change.
   * @param value The new contents of the editor.
   */
  onEdit?(value: string): void;
};

export function useHeaderEditor(
  {
    editorTheme = DEFAULT_EDITOR_THEME,
    keyMap = DEFAULT_KEY_MAP,
    onEdit,
    readOnly = false,
  }: UseHeaderEditorArgs = {},
  caller?: Function,
) {
  const {
    initialHeaders,
    headerEditor,
    setHeaderEditor,
    shouldPersistHeaders,
  } = useEditorContext({
    nonNull: true,
    caller: caller || useHeaderEditor,
  });
  const executionContext = useExecutionContext();
  const merge = useMergeQuery({ caller: caller || useHeaderEditor });
  const prettify = usePrettifyEditors({ caller: caller || useHeaderEditor });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    void importCodeMirror([
      // @ts-expect-error
      import('codemirror/mode/javascript/javascript'),
    ]).then(CodeMirror => {
      // Don't continue if the effect has already been cleaned up
      if (!isActive) {
        return;
      }

      const container = ref.current;
      if (!container) {
        return;
      }

      const newEditor = CodeMirror(container, {
        value: initialHeaders,
        lineNumbers: true,
        tabSize: 2,
        mode: { name: 'javascript', json: true },
        theme: editorTheme,
        autoCloseBrackets: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        readOnly: readOnly ? 'nocursor' : false,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        extraKeys: commonKeys,
      });

      newEditor.addKeyMap({
        'Cmd-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
        'Ctrl-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
        'Alt-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
        'Shift-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
      });

      newEditor.on('keyup', (editorInstance, event) => {
        const { keyCode, key, shiftKey } = event;
        const isLetter = keyCode >= 65 && keyCode <= 90;
        const isNumber = keyCode >= 48 && keyCode <= 57;
        if (isLetter || (!shiftKey && isNumber) || key === '_' || key === '"') {
          editorInstance.execCommand('autocomplete');
        }
      });

      setHeaderEditor(newEditor);
    });

    return () => {
      isActive = false;
    };
  }, [editorTheme, initialHeaders, readOnly, setHeaderEditor]);

  useSynchronizeOption(headerEditor, 'keyMap', keyMap);

  useChangeHandler(
    headerEditor,
    onEdit,
    shouldPersistHeaders ? STORAGE_KEY : null,
    'headers',
    useHeaderEditor,
  );

  useKeyMap(headerEditor, ['Cmd-Enter', 'Ctrl-Enter'], executionContext?.run);
  useKeyMap(headerEditor, ['Shift-Ctrl-P'], prettify);
  useKeyMap(headerEditor, ['Shift-Ctrl-M'], merge);

  return ref;
}

export const STORAGE_KEY = 'headers';
