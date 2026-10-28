import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px', backgroundColor: '#ffffff' },
  '.cm-scroller': { fontFamily: 'ui-monospace, Consolas, monospace', lineHeight: '1.5' },
  '.cm-gutters': { backgroundColor: '#eef2f7', color: '#4a5666', border: 'none' },
  '&.cm-focused': { outline: '3px solid #004b93', outlineOffset: '-3px' },
});

/** Editor C/C++ com destaque de sintaxe. */
export function createEditor(parent, { doc = '', onChange } = {}) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        cpp(),
        theme,
        EditorView.contentAttributes.of({ 'aria-label': 'Editor de código Arduino' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange?.(u.state.doc.toString()); }),
      ],
    }),
  });
  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
    focus: () => view.focus(),
  };
}
