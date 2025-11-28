// @ts-ignore - This has to be imported from a CDN because angular doesn't handle the npm import
import { init } from "https://esm.sh/modern-monaco";
import type * as monaco from 'monaco-editor';
import type { InitOptions } from 'modern-monaco';

import mlirGrammar from './mlir-grammar.json';

export const editorSettings: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {
    codeLens: false,
    colorDecorators: false,
    automaticLayout: true,
    dragAndDrop: true,
    dropIntoEditor: { enabled: false },
    emptySelectionClipboard: false,
    fontSize: 14,
    fontFamily: 'Cascadia Code PL, Cascadia Mono PL, Cascadia Code, Cascadia Mono, Consolas, Fira Code, Menlo, Monaco, Segoe UI Emoji, Apple Color Emoji, NotoColorEmoji, Android Emoji, EmojiSymbols, Segoe UI Symbol, Segoe UI Unicode, monospace',
    inlayHints: { enabled: 'off' },
    inlineSuggest: { enabled: false },
    lightbulb: { enabled: 'off' as monaco.editor.ShowLightbulbIconMode },
    minimap: { renderCharacters: false },
    parameterHints: { enabled: false },
    quickSuggestions: false,
    renderFinalNewline: 'dimmed',
    renderWhitespace: 'boundary',
    scrollBeyondLastLine: false,
    suggestFontSize: 12,
    suggestLineHeight: 1,
    useShadowDOM: true,
    wordBasedSuggestions: 'off',
    wordWrap: 'on',
    wrappingIndent: 'same',
  }

export async function loadMonacoEditor(containerElement: HTMLElement, text = '', language: monaco.editor.IStandaloneEditorConstructionOptions['language'] = 'plaintext', theme: 'light' | 'dark' = 'light', isReadOnly = false) {
  const { width, height } = containerElement.getBoundingClientRect();
  const initOptions: InitOptions = {
    theme: theme === 'light' ? 'light-plus' : 'dark-plus',
    langs: [mlirGrammar],
  };
  debugger;
  const monaco = await init(initOptions);

  const editor = monaco.editor.create(containerElement, {
    ...editorSettings,
    dimension: { width, height },
    language,
    theme: theme === 'light' ? 'light-plus' : 'dark-plus',
    value: text,
    readOnly: isReadOnly
  });

  return editor as monaco.editor.IStandaloneCodeEditor;
}
