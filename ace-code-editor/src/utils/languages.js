// Maps file extensions / names to Ace editor modes and Prettier parsers.

const EXT_MAP = {
  js:  { mode: 'javascript', label: 'JavaScript', icon: 'js',     prettier: 'babel' },
  jsx: { mode: 'jsx',        label: 'JSX',        icon: 'jsx',    prettier: 'babel' },
  mjs: { mode: 'javascript', label: 'JavaScript', icon: 'js',     prettier: 'babel' },
  cjs: { mode: 'javascript', label: 'JavaScript', icon: 'js',     prettier: 'babel' },
  ts:  { mode: 'typescript', label: 'TypeScript', icon: 'ts',     prettier: 'typescript' },
  tsx: { mode: 'tsx',        label: 'TSX',        icon: 'tsx',    prettier: 'typescript' },
  json:{ mode: 'json',       label: 'JSON',       icon: 'json',   prettier: 'json' },
  html:{ mode: 'html',       label: 'HTML',       icon: 'html',   prettier: 'html' },
  htm: { mode: 'html',       label: 'HTML',       icon: 'html',   prettier: 'html' },
  css: { mode: 'css',        label: 'CSS',        icon: 'css',    prettier: 'css' },
  scss:{ mode: 'scss',       label: 'SCSS',       icon: 'scss',   prettier: 'scss' },
  less:{ mode: 'less',       label: 'Less',       icon: 'css',    prettier: 'less' },
  md:  { mode: 'markdown',   label: 'Markdown',   icon: 'md',     prettier: 'markdown' },
  markdown: { mode: 'markdown', label: 'Markdown', icon: 'md',    prettier: 'markdown' },
  py:  { mode: 'python',     label: 'Python',     icon: 'py',     prettier: null },
  rb:  { mode: 'ruby',       label: 'Ruby',       icon: 'rb',     prettier: null },
  go:  { mode: 'golang',     label: 'Go',         icon: 'go',     prettier: null },
  rs:  { mode: 'rust',       label: 'Rust',       icon: 'rs',     prettier: null },
  java:{ mode: 'java',       label: 'Java',       icon: 'java',   prettier: null },
  c:   { mode: 'c_cpp',      label: 'C',          icon: 'c',      prettier: null },
  cpp: { mode: 'c_cpp',      label: 'C++',        icon: 'cpp',    prettier: null },
  h:   { mode: 'c_cpp',      label: 'Header',     icon: 'c',      prettier: null },
  cs:  { mode: 'csharp',     label: 'C#',         icon: 'cs',     prettier: null },
  php: { mode: 'php',        label: 'PHP',        icon: 'php',    prettier: null },
  swift:{ mode: 'swift',     label: 'Swift',      icon: 'swift',  prettier: null },
  kt:  { mode: 'kotlin',     label: 'Kotlin',     icon: 'kt',     prettier: null },
  sql: { mode: 'sql',        label: 'SQL',        icon: 'sql',    prettier: 'sql' },
  sh:  { mode: 'sh',         label: 'Shell',      icon: 'sh',     prettier: null },
  bash:{ mode: 'sh',         label: 'Bash',       icon: 'sh',     prettier: null },
  zsh: { mode: 'sh',         label: 'Shell',      icon: 'sh',     prettier: null },
  yml: { mode: 'yaml',       label: 'YAML',       icon: 'yml',    prettier: 'yaml' },
  yaml:{ mode: 'yaml',       label: 'YAML',       icon: 'yml',    prettier: 'yaml' },
  xml: { mode: 'xml',        label: 'XML',        icon: 'xml',    prettier: 'html' },
  svg: { mode: 'svg',        label: 'SVG',        icon: 'svg',    prettier: 'html' },
  vue: { mode: 'html',       label: 'Vue',        icon: 'vue',    prettier: 'vue' },
  svelte: { mode: 'html',    label: 'Svelte',     icon: 'svelte', prettier: null },
  txt: { mode: 'text',       label: 'Text',       icon: 'txt',    prettier: null },
  env: { mode: 'text',       label: 'Env',        icon: 'txt',    prettier: null },
  gitignore: { mode: 'text', label: 'gitignore',  icon: 'txt',    prettier: null },
  toml: { mode: 'ini',       label: 'TOML',       icon: 'toml',   prettier: null },
  ini: { mode: 'ini',        label: 'INI',        icon: 'toml',   prettier: null },
  dockerfile: { mode: 'dockerfile', label: 'Docker', icon: 'docker', prettier: null },
};

export function extOf(filename = '') {
  const base = filename.split('/').pop().toLowerCase();
  if (base === 'dockerfile') return 'dockerfile';
  if (base === '.env') return 'env';
  if (base === '.gitignore' || base === '.eslintrc' || base === '.prettierrc') return 'txt';
  const parts = base.split('.');
  return parts.length > 1 ? parts.pop() : '';
}

export function getFileInfo(filename = '') {
  const ext = extOf(filename);
  const info = EXT_MAP[ext] || { mode: 'text', label: ext.toUpperCase() || 'File', icon: 'txt', prettier: null };
  return { extension: ext, ...info };
}

export const ALL_MODES = [...new Set(Object.values(EXT_MAP).map((v) => v.mode))].sort();
