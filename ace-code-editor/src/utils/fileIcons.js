// Small colored badge icons for the file tree, based on extension.
import { extOf } from './languages.js';

const ICONS = {
  js:    { text: 'JS',       color: '#f7df1e', dark: true },
  jsx:   { text: 'JSX',      color: '#61dafb' },
  ts:    { text: 'TS',       color: '#3178c6' },
  tsx:   { text: 'TSX',      color: '#61dafb' },
  json:  { text: '{}',       color: '#cb890f', dark: true },
  html:  { text: '<>',       color: '#e34c26' },
  css:   { text: '#',        color: '#563d7c' },
  scss:  { text: 'S',        color: '#c6538c' },
  md:    { text: 'M↓',       color: '#519aba' },
  py:    { text: 'PY',       color: '#3572a5' },
  rb:    { text: 'R',        color: '#cc342d' },
  go:    { text: 'GO',       color: '#00add8' },
  rs:    { text: 'RS',       color: '#dea584' },
  java:  { text: 'J',        color: '#b07219', dark: true },
  sh:    { text: '$',        color: '#89e051', dark: true },
  yml:   { text: 'Y',        color: '#cb171e' },
  xml:   { text: 'X',        color: '#0060ac' },
  svg:   { text: 'SVG',      color: '#ffb13b', dark: true },
  vue:   { text: 'V',        color: '#41b883' },
  svelte:{ text: 'S',        color: '#ff3e00' },
  txt:   { text: '≡',        color: '#8b949e' },
  toml:  { text: '⚙',        color: '#9c4221' },
  docker:{ text: '🐳',       color: '#2496ed', emoji: true },
  sql:   { text: 'DB',       color: '#e38c00', dark: true },
  php:   { text: 'φ',        color: '#777bb3' },
  c:     { text: 'C',        color: '#555555' },
  cpp:   { text: 'C+',       color: '#f34b7d' },
  cs:    { text: 'C#',       color: '#178600' },
  swift: { text: 'Sw',       color: '#f05138' },
  kt:    { text: 'K',        color: '#a97bff' },
};

export function getFileIcon(filename) {
  let ext = extOf(filename);
  const base = (filename.split('/').pop() || '').toLowerCase();
  if (base.startsWith('.')) ext = 'txt'; // .gitignore, .env …
  if (base === 'package.json' || base === 'tsconfig.json') ext = 'json';
  return ICONS[ext] || ICONS.txt;
}
