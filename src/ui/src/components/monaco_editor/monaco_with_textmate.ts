import { loadWASM } from 'onigasm';
import { Registry } from 'monaco-textmate';
import { wireTmGrammars } from 'monaco-editor-textmate';
import * as monaco from 'monaco-editor';

export async function loadMonacoEditor(containerElement: HTMLElement, text = '', language: monaco.editor.IStandaloneEditorConstructionOptions['language'] = 'plaintext', theme: 'light' | 'dark' = 'light') {
  await loadWASM(`path/to/onigasm.wasm`);

  const registry = new Registry({
    getGrammarDefinition: async (_scopeName) => {
      return {
        format: 'json',
        // TODO: load grammar
        content: await (await fetch(`static/grammars/mlir-grammar.json`)).text()
      };
    }
  });

  const grammars = new Map();
  grammars.set('mlir', 'source.mlir');

  // TODO: load themes
  // monaco's built-in themes aren't powereful enough to handle TM tokens
  // https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
  monaco.editor.defineTheme('vs-code-light-theme-converted', {
    // ... use `monaco-vscode-textmate-theme-converter` to convert vs code theme and pass the parsed object here
  });

  monaco.editor.defineTheme('vs-code-dark-theme-converted', {
    // ... use `monaco-vscode-textmate-theme-converter` to convert vs code theme and pass the parsed object here
  });

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
    theme: theme === 'light' ? 'vs-code-dark-theme-converted' : 'vs-code-light-theme-converted',
    value: text,
  }

  const editor = monaco.editor.create(containerElement, editorSettings);

  await wireTmGrammars(monaco, registry, grammars, editor);
}
