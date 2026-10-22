import React, { useEffect, useRef, useState } from 'react';
import AceEditor from 'react-ace';
import ace from 'ace-builds/src-noconflict/ace';
// Core modes & features (bundled locally via ace-builds)
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-jsx';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/mode-tsx';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-scss';
import 'ace-builds/src-noconflict/mode-less';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-swift';
import 'ace-builds/src-noconflict/mode-kotlin';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-svg';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-ini';
import 'ace-builds/src-noconflict/mode-dockerfile';
import 'ace-builds/src-noconflict/mode-powershell';
import 'ace-builds/src-noconflict/mode-lua';
import 'ace-builds/src-noconflict/mode-perl';
import 'ace-builds/src-noconflict/mode-r';
import 'ace-builds/src-noconflict/mode-scala';
import 'ace-builds/src-noconflict/mode-handlebars';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github_dark';
import 'ace-builds/src-noconflict/theme-github_light_default';
import 'ace-builds/src-noconflict/theme-dracula';
import 'ace-builds/src-noconflict/theme-tomorrow_night';
import 'ace-builds/src-noconflict/theme-one_dark';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/ext-settings_menu';
import 'ace-builds/src-noconflict/keybinding-vscode';
import 'ace-builds/src-noconflict/worker-javascript';
// Snippet modules for the supported languages. Registering them at build time
// prevents ace from trying to fetch snippets/<lang>.js dynamically (404).
import 'ace-builds/src-noconflict/snippets/javascript';
import 'ace-builds/src-noconflict/snippets/jsx';
import 'ace-builds/src-noconflict/snippets/typescript';
import 'ace-builds/src-noconflict/snippets/tsx';
import 'ace-builds/src-noconflict/snippets/json';
import 'ace-builds/src-noconflict/snippets/html';
import 'ace-builds/src-noconflict/snippets/css';
import 'ace-builds/src-noconflict/snippets/scss';
import 'ace-builds/src-noconflict/snippets/less';
import 'ace-builds/src-noconflict/snippets/markdown';
import 'ace-builds/src-noconflict/snippets/python';
import 'ace-builds/src-noconflict/snippets/ruby';
import 'ace-builds/src-noconflict/snippets/golang';
import 'ace-builds/src-noconflict/snippets/rust';
import 'ace-builds/src-noconflict/snippets/java';
import 'ace-builds/src-noconflict/snippets/c_cpp';
import 'ace-builds/src-noconflict/snippets/csharp';
import 'ace-builds/src-noconflict/snippets/php';
import 'ace-builds/src-noconflict/snippets/swift';
import 'ace-builds/src-noconflict/snippets/kotlin';
import 'ace-builds/src-noconflict/snippets/sql';
import 'ace-builds/src-noconflict/snippets/sh';
import 'ace-builds/src-noconflict/snippets/yaml';
import 'ace-builds/src-noconflict/snippets/xml';
import 'ace-builds/src-noconflict/snippets/svg';
import 'ace-builds/src-noconflict/snippets/text';
import 'ace-builds/src-noconflict/snippets/ini';
import 'ace-builds/src-noconflict/snippets/dockerfile';
import 'ace-builds/src-noconflict/snippets/powershell';
import 'ace-builds/src-noconflict/snippets/lua';
import 'ace-builds/src-noconflict/snippets/perl';
import 'ace-builds/src-noconflict/snippets/r';
import 'ace-builds/src-noconflict/snippets/scala';
import 'ace-builds/src-noconflict/snippets/handlebars';

// Worker scripts are emitted as versioned assets by Vite; register them with
// ace so it doesn't try to fetch worker-*.js from an unconfigured base path.
import jsWorkerUrl from 'ace-builds/src-noconflict/worker-javascript.js?url';
import cssWorkerUrl from 'ace-builds/src-noconflict/worker-css.js?url';
import htmlWorkerUrl from 'ace-builds/src-noconflict/worker-html.js?url';
import jsonWorkerUrl from 'ace-builds/src-noconflict/worker-json.js?url';
import xmlWorkerUrl from 'ace-builds/src-noconflict/worker-xml.js?url';
import yamlWorkerUrl from 'ace-builds/src-noconflict/worker-yaml.js?url';
import phpWorkerUrl from 'ace-builds/src-noconflict/worker-php.js?url';
import luaWorkerUrl from 'ace-builds/src-noconflict/worker-lua.js?url';
ace.config.setModuleUrl('ace/mode/javascript_worker', jsWorkerUrl);
ace.config.setModuleUrl('ace/mode/css_worker', cssWorkerUrl);
ace.config.setModuleUrl('ace/mode/html_worker', htmlWorkerUrl);
ace.config.setModuleUrl('ace/mode/json_worker', jsonWorkerUrl);
ace.config.setModuleUrl('ace/mode/xml_worker', xmlWorkerUrl);
ace.config.setModuleUrl('ace/mode/yaml_worker', yamlWorkerUrl);
ace.config.setModuleUrl('ace/mode/php_worker', phpWorkerUrl);
ace.config.setModuleUrl('ace/mode/lua_worker', luaWorkerUrl);

import { useStore, useEditorStore } from '../store/store.js';
import { getFileInfo } from '../utils/languages.js';
import { getFileIcon } from '../utils/fileIcons.js';
import toast from './Toast.jsx';
import { useSettings } from './PreviewPane.jsx';
import '../styles/EditorPane.css';

export default function EditorPane() {
  const files = useStore((s) => (s.activeProject() || {}).files || []);
  const updateFileContent = useStore((s) => s.updateFileContent);
  const openTabs = useEditorStore((s) => s.openTabs);
  const activePath = useEditorStore((s) => s.activePath);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const setCursor = useEditorStore((s) => s.setCursor);
  const settings = useSettings();
  const editorRef = useRef(null);
  const [markdownPreview, setMarkdownPreview] = useState(false);

  // keep tabs in sync when files are deleted/renamed
  useEffect(() => {
    const paths = new Set(files.map((f) => f.path));
    const st = useEditorStore.getState();
    st.openTabs.filter((t) => !paths.has(t)).forEach((t) => st.closeTab(t));
    if (st.activePath && !paths.has(st.activePath)) st.setActiveTab(null);
  }, [files]);

  const file = files.find((f) => f.path === activePath);
  const info = file ? getFileInfo(file.path) : null;

  const onChange = (val) => {
    if (!activePath) return;
    updateFileContent(activePath, val);
  };

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.on('changeStatus', (st) => {
      setCursor({ row: st.cursor.row + 1, col: st.cursor.column + 1 });
    });
    // Ctrl+S -> save (persist is automatic, but give feedback)
    editor.commands.addCommand({
      name: 'save-ack', bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
      exec: () => toast('Saved ✓', 'success', 1500),
    });
  };

  return (
    <div className="editor-pane">
      <div className="tabs">
        {openTabs.map((p) => {
          const icon = getFileIcon(p);
          return (
            <div
              key={p}
              className={`tab ${p === activePath ? 'active' : ''}`}
              onClick={() => setActiveTab(p)}
              title={p}
            >
              <span className="tab-icon" style={{ background: icon.color, color: icon.dark ? '#000' : '#fff' }}>
                {icon.text}
              </span>
              <span className="tab-name">{p.split('/').pop()}</span>
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); closeTab(p); }}
              >×</button>
            </div>
          );
        })}
        {openTabs.length === 0 && <span className="tabs-hint">Open a file from Explorer</span>}
      </div>

      {file ? (
        <>
          {info.mode === 'markdown' && (
            <div className="md-toggle row" style={{ padding: '2px 10px' }}>
              <button className={`btn small ${!markdownPreview ? 'blue' : ''}`} onClick={() => setMarkdownPreview(false)}>Source</button>
              <button className={`btn small ${markdownPreview ? 'blue' : ''}`} onClick={async () => {
                setMarkdownPreview(true);
              }}>Preview</button>
            </div>
          )}
          {markdownPreview && info.mode === 'markdown' ? (
            <MarkdownView content={file.content} />
          ) : (
            <AceEditor
              mode={info.mode}
              theme={settings.theme}
              name="ace-main-editor"
              value={file.content}
              onChange={onChange}
              onMount={onMount}
              width="100%"
              height="100%"
              fontSize={settings.fontSize}
              setOptions={{
                tabSize: settings.tabSize,
                useSoftTabs: settings.useSpaces,
                wrap: settings.wrapEnabled,
                showPrintMargin: settings.showPrintMargin,
                enableLiveAutocompletion: settings.liveAutocomplete,
                enableBasicAutocompletion: true,
                enableSnippets: true,
                highlightActiveLine: true,
                brushSize: 1,
                kbdHandler: undefined,
              }}
              commands={[]}
              editorProps={{ $blockScrolling: true }}
              setAnnotations={[]}
            />
          )}
        </>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
}

function MarkdownView({ content }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    import('marked').then(({ marked }) => setHtml(marked.parse(content || '')));
  }, [content]);
  return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function WelcomeScreen() {
  const createProject = useStore((s) => s.createProject);
  const toggleGithub = useEditorStore((s) => s.toggleGithub);
  const toggleCommandPalette = useEditorStore((s) => s.toggleCommandPalette);
  return (
    <div className="welcome">
      <div className="welcome-logo">⌘</div>
      <h1>Ace Code Editor</h1>
      <p className="dim">In-browser code editor & sandbox with GitHub sync.</p>
      <div className="welcome-actions">
        <button className="btn blue" onClick={toggleCommandPalette}>Open Command Palette <span className="kbd">Ctrl K</span></button>
        <button className="btn" onClick={() => toggleGithub(true)}>Clone a GitHub repo</button>
        <button className="btn" onClick={() => createProject('New Project')}>Create new project</button>
      </div>
      <table className="shortcuts">
        <tbody>
          <tr><td><span className="kbd">Ctrl K</span></td><td>Command palette</td></tr>
          <tr><td><span className="kbd">Ctrl P</span></td><td>Quick open file</td></tr>
          <tr><td><span className="kbd">Ctrl F</span></td><td>Find in file</td></tr>
          <tr><td><span className="kbd">Ctrl /</span></td><td>Toggle comment</td></tr>
          <tr><td><span className="kbd">Ctrl D</span></td><td>Select word / add next occurrence</td></tr>
          <tr><td><span className="kbd">Alt ↑/↓</span></td><td>Move line up/down</td></tr>
          <tr><td><span className="kbd">Ctrl Shift K</span></td><td>Delete line</td></tr>
          <tr><td><span className="kbd">Ctrl B</span></td><td>Toggle sidebar</td></tr>
          <tr><td><span className="kbd">Ctrl Enter</span></td><td>Run / refresh preview</td></tr>
        </tbody>
      </table>
    </div>
  );
}
