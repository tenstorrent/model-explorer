import * as monaco from 'monaco-editor';

export function loadMonacoEditor(containerElement: HTMLElement, text = '', language: monaco.editor.IStandaloneEditorConstructionOptions['language'] = 'plaintext', theme: 'light' | 'dark' = 'light', isReadOnly = false) {
  const { width, height } = containerElement.getBoundingClientRect();
  const editorSettings: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {
    codeLens: false,
    colorDecorators: false,
    automaticLayout: false,
    dimension: { width, height },
    dragAndDrop: true,
    dropIntoEditor: { enabled: false },
    emptySelectionClipboard: false,
    fontSize: 14,
    fontFamily: 'Cascadia Code PL, Cascadia Mono PL, Cascadia Code, Cascadia Mono, Consolas, Fira Code, Menlo, Monaco, Segoe UI Emoji, Apple Color Emoji, NotoColorEmoji, Android Emoji, EmojiSymbols, Segoe UI Symbol, Segoe UI Unicode, monospace',
    inlayHints: { enabled: 'off' },
    inlineSuggest: { enabled: false },
    lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
    minimap: { renderCharacters: false },
    parameterHints: { enabled: false },
    quickSuggestions: false,
    renderFinalNewline: 'dimmed',
    renderWhitespace: 'boundary',
    scrollBeyondLastLine: false,
    suggestFontSize: 12,
    suggestLineHeight: 1,
    useShadowDOM: false,
    wordBasedSuggestions: 'off',
    wordWrap: 'on',
    wrappingIndent: 'same',
    language,
    theme: theme === 'light' ? 'vs' : 'vs-dark',
    value: text,
    readOnly: isReadOnly
  }

  const editor = monaco.editor.create(containerElement, editorSettings);

  return editor;
}
