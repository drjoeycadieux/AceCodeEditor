import React, { useMemo, useState } from 'react';
import { useStore, useEditorStore } from '../store/store.js';
import { getFileIcon } from '../utils/fileIcons.js';
import toast from './Toast.jsx';
import '../styles/FileTree.css';

// Build a nested tree structure from flat paths
export function buildTree(files) {
  const root = { name: '', path: '', type: 'dir', children: {} };
  for (const f of files) {
    const parts = f.path.split('/');
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const nodePath = parts.slice(0, i + 1).join('/');
      if (!node.children[part]) {
        node.children[part] = {
          name: part, path: nodePath,
          type: isFile ? 'file' : 'dir',
          children: {},
        };
      }
      node = node.children[part];
    });
  }
  return root;
}

function sortNodes(nodes) {
  return Object.values(nodes).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function InlinePrompt({ initial = '', placeholder, onDone }) {
  const [val, setVal] = useState(initial);
  return (
    <input
      autoFocus
      className="inline-input"
      value={val}
      placeholder={placeholder}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onDone(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(val.trim() || null);
        if (e.key === 'Escape') onDone(null);
        e.stopPropagation();
      }}
    />
  );
}

function TreeNode({ node, depth, expanded, toggle, actions, renaming, setRenaming, creating, setCreating }) {
  const openFile = useEditorStore((s) => s.openFile);
  const activePath = useEditorStore((s) => s.activePath);
  const isDir = node.type === 'dir';
  const isOpen = expanded.has(node.path);

  return (
    <>
      <div
        className={`tree-row ${activePath === node.path ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isDir ? toggle(node.path) : openFile(node.path))}
        onDoubleClick={() => isDir && setCreating(node.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          actions.open(node, e.clientX, e.clientY);
        }}
        title={node.path}
      >
        {isDir ? (
          <span className="twisty">{isOpen ? '▾' : '▸'}</span>
        ) : (
          <span className="file-icon" style={{
            background: getFileIcon(node.path).color,
            color: getFileIcon(node.path).dark ? '#0d1117' : '#fff',
            fontSize: getFileIcon(node.path).emoji ? 12 : 9,
          }}>{getFileIcon(node.path).text}</span>
        )}
        {renaming === node.path ? (
          <InlinePrompt
            initial={node.name}
            onDone={(v) => {
              setRenaming(null);
              if (v && v !== node.name) {
                const parentDir = node.path.includes('/')
                  ? node.path.slice(0, node.path.lastIndexOf('/'))
                  : '';
                const newPath = parentDir ? `${parentDir}/${v}` : v;
                if (isDir) {
                  // rename dir: move all children
                  const files = useStore.getState().activeProject()?.files || [];
                  files.filter((f) => f.path.startsWith(node.path + '/'))
                    .forEach((f) => useStore.getState().renameFile(f.path, newPath + f.path.slice(node.path.length)));
                } else {
                  useStore.getState().renameFile(node.path, newPath);
                }
                toast('Renamed', 'success');
              }
            }}
          />
        ) : (
          <span className="tree-label">{node.name}</span>
        )}
      </div>

      {isDir && isOpen && sortNodes(node.children).map((child) => (
        <TreeNode
          key={child.path} node={child} depth={depth + 1}
          expanded={expanded} toggle={toggle} actions={actions}
          renaming={renaming} setRenaming={setRenaming}
          creating={creating} setCreating={setCreating}
        />
      ))}

      {isDir && isOpen && creating === node.path && (
        <div style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
          <InlinePrompt
            placeholder="new-file.js"
            onDone={(v) => {
              setCreating(null);
              if (v) {
                const path = node.path ? `${node.path}/${v}` : v;
                useStore.getState().createFile(path);
                useEditorStore.getState().openFile(path);
                toast(`Created ${path}`, 'success');
              }
            }}
          />
        </div>
      )}
    </>
  );
}

export default function FileTree() {
  const files = useStore((s) => (s.activeProject() || {}).files || []);
  const [expanded, setExpanded] = useState(() => new Set(['src']));
  const [renaming, setRenaming] = useState(null);
  const [creating, setCreating] = useState(null);
  const [menu, setMenu] = useState(null); // {x,y,node}

  const tree = useMemo(() => buildTree(files), [files]);
  const toggle = (p) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });

  const actions = {
    open(node, x, y) { setMenu({ x, y, node }); },
  };

  const doAction = (act) => {
    if (!menu) return;
    const { node } = menu;
    const st = useStore.getState();
    switch (act) {
      case 'rename': setRenaming(node.path); break;
      case 'delete':
        if (confirm(`Delete ${node.path}?`)) {
          if (node.type === 'dir') {
            files.filter((f) => f.path.startsWith(node.path + '/')).forEach((f) => st.deleteFile(f.path));
          } else st.deleteFile(node.path);
          toast('Deleted', 'success');
        }
        break;
      case 'duplicate': st.duplicateFile(node.path); toast('Duplicated', 'success'); break;
      case 'download': {
        const f = files.find((x) => x.path === node.path);
        if (f) {
          const blob = new Blob([f.content], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = node.name;
          a.click();
        }
        break;
      }
      case 'newfile': setCreating(node.type === 'dir' ? node.path : ''); break;
      default: break;
    }
    setMenu(null);
  };

  const rootFiles = files.filter((f) => !f.path.includes('/'));

  return (
    <div className="filetree">
      <div className="ft-header">
        <span>Explorer</span>
        <div className="row">
          <button className="icon-btn" title="New file"
            onClick={() => setCreating('__root__')}>＋</button>
        </div>
      </div>

      {sortNodes(tree.children).map((child) => (
        <TreeNode
          key={child.path} node={child} depth={0}
          expanded={expanded} toggle={toggle} actions={actions}
          renaming={renaming} setRenaming={setRenaming}
          creating={creating} setCreating={setCreating}
        />
      ))}

      {creating === '__root__' && (
        <div style={{ paddingLeft: 8 }}>
          <InlinePrompt
            placeholder="filename.ext"
            onDone={(v) => {
              setCreating(null);
              if (v) {
                useStore.getState().createFile(v);
                useEditorStore.getState().openFile(v);
                toast(`Created ${v}`, 'success');
              }
            }}
          />
        </div>
      )}

      {files.length === 0 && <div className="empty-hint">No files yet.<br />Click ＋ to create one.</div>}

      {menu && (
        <>
          <div className="ctx-backdrop" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div className="ctx-menu" style={{ left: menu.x, top: menu.y }}>
            {menu.node.type === 'dir' && (
              <button onClick={() => doAction('newfile')}>New file here</button>
            )}
            <button onClick={() => doAction('rename')}>Rename</button>
            {menu.node.type === 'file' && (
              <>
                <button onClick={() => doAction('duplicate')}>Duplicate</button>
                <button onClick={() => doAction('download')}>Download</button>
              </>
            )}
            <button className="danger" onClick={() => doAction('delete')}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
