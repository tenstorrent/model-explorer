import * as monaco from 'monaco-editor';

export function loadMonacoEditor(containerElement: HTMLElement, text = '', language: monaco.editor.IStandaloneEditorConstructionOptions['language'] = 'plaintext', theme: 'light' | 'dark' = 'light', isReadOnly = false) {
  const { width, height } = containerElement.getBoundingClientRect();
  const editorSettings: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {
    codeLens: false,
    colorDecorators: false,
    automaticLayout: true,
    dimension: { width, height },
    dragAndDrop: true,
    dropIntoEditor: { enabled: false },
    emptySelectionClipboard: false,
    inlayHints: { enabled: 'off' },
    inlineSuggest: { enabled: false },
    lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
    minimap: { renderCharacters: false },
    parameterHints: { enabled: false },
    quickSuggestions: false,
    renderFinalNewline: 'dimmed',
    renderWhitespace: 'boundary',
    scrollBeyondLastLine: false,
    useShadowDOM: true,
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
