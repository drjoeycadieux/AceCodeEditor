import React from 'react';
import ReactDOM from 'react-dom';

const container = document.createElement('div');
container.className = 'toast-container';
document.body.appendChild(container);
const root = ReactDOM.createRoot(container);

let toasts = [];
let idc = 0;

function render() {
  root.render(
    toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)
  );
}

export function toast(msg, type = 'info', ms = 3200) {
  const id = ++idc;
  toasts = [...toasts, { id, msg, type }];
  render();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    render();
  }, ms);
}

export default toast;
