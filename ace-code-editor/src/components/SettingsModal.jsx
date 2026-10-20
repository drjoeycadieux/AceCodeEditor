import React from 'react';
import { useEditorStore } from '../store/store.js';

const THEMES = [
  ['one_dark', 'One Dark'],
  ['monokai', 'Monokai'],
  ['github_dark', 'GitHub Dark'],
  ['github_light_default', 'GitHub Light'],
  ['dracula', 'Dracula'],
  ['tomorrow_night', 'Tomorrow Night'],
  ['solarized_dark', 'Solarized Dark'],
  ['xcode', 'Xcode (light)'],
];

export default function SettingsModal() {
  const open = useEditorStore((s) => s.settingsOpen);
  const setOpen = useEditorStore((s) => s.toggleSettings);
  const settings = useEditorStore((s) => s.settings);
  const setSetting = useEditorStore((s) => s.setSetting);
  if (!open) return null;

  const val = (k, d) => settings[k] ?? d;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="modal" style={{ width: 460 }}>
        <div className="modal-header">
          Settings
          <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Editor theme</label>
            <select value={val('theme', 'one_dark')} onChange={(e) => setSetting('theme', e.target.value)}>
              {THEMES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Font size: {val('fontSize', 14)}px</label>
            <input type="range" min="10" max="24" value={val('fontSize', 14)}
              onChange={(e) => setSetting('fontSize', +e.target.value)} />
          </div>

          <div className="field">
            <label>Tab size</label>
            <select value={val('tabSize', 2)} onChange={(e) => setSetting('tabSize', +e.target.value)}>
              {[2, 4, 8].map((n) => <option key={n} value={n}>{n} spaces</option>)}
            </select>
          </div>

          <Check k="useSpaces" d={true} label="Use spaces for indentation" />
          <Check k="wrapEnabled" label="Soft wrap long lines" />
          <Check k="autoUpdatePreview" d={true} label="Auto-update preview while typing" />
          <Check k="liveAutocomplete" d={true} label="Live autocomplete & snippets" />
          <Check k="showPrintMargin" label="Show print margin ruler" />

          <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
            Settings are saved in your browser automatically. The file explorer, tabs and
            projects are persisted to localStorage as well.
          </p>
        </div>
      </div>
    </div>
  );

  function Check({ k, d = false, label }) {
    return (
      <label className="setting-check">
        <input
          type="checkbox"
          checked={Boolean(val(k, d))}
          onChange={(e) => setSetting(k, e.target.checked)}
        />
        {label}
      </label>
    );
  }
}
