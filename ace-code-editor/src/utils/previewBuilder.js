// Builds a self-contained preview document (iframe srcdoc) from project files.
// Supports plain HTML/CSS/JS sandboxes and transpiles JSX via Babel standalone.

function findEntry(files) {
  return (
    files.find((f) => /(^|\/)index\.html$/i.test(f.path)) ||
    files.find((f) => /\.html?$/i.test(f.path))
  );
}

function inlineImports(html, files) {
  // Replace <script type="module" src="..."> with inline module scripts that
  // resolve relative imports by fetching from a blob-like registry approach:
  // Simpler robust route: rewrite src to point at virtual paths served via srcdoc
  // is not possible, so we bundle ES modules by concatenating with a tiny loader.
  return html.replace(
    /<script\s+type=["']module["']\s+src=["']([^"']+)["']\s*><\/script>/gi,
    (_, src) => {
      const path = normalize(src);
      const mod = files.find((f) => f.path === path);
      if (!mod) return `<script type="module">console.error("Module not found: ${path}");</script>`;
      return `<script type="module">\n${bundleModule(path, files)}\n</script>`;
    }
  );
}

function normalize(p) {
  return p.replace(/^\.?\//, '');
}

// Very small ES-module bundler: rewrites each project file into a module
// function registered in a tiny runtime, then executes the entry module.
function bundleModule(entryPath, files) {
  const order = [];
  const seen = new Set();

  function collect(path) {
    if (seen.has(path)) return;
    seen.add(path);
    const file = files.find((f) => f.path === path);
    if (!file) return;
    const imports = extractImports(file.content);
    for (const imp of imports) collect(resolveImport(path, imp));
    order.push(path);
  }
  collect(entryPath);

  let code = [
    'const __modules = {}, __loaded = {};',
    'const __require = (p) => {',
    '  if (__loaded[p]) return __modules[p];',
    '  if (!(p in __modules)) throw new Error("Module not found: " + p);',
    '  const m = { exports: {} };',
    '  __loaded[p] = true;',
    '  __modules[p](m, m.exports, __require);',
    '  __modules[p] = m.exports;',
    '  return m.exports;',
    '};',
  ].join('\n');
  for (const path of order) {
    const file = files.find((f) => f.path === path);
    if (!file) continue;
    code +=
      `\n__modules[${JSON.stringify(path)}] = function(module, exports, require) {\n` +
      transformFile(path, file.content, files) +
      `\n};\n`;
  }
  code += `\n__require(${JSON.stringify(entryPath)});\n`;
  return code;
}

function extractImports(content) {
  const out = [];
  const re = /(?:^|\n)\s*import\s+(?:[^'"]*from\s*)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content))) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('/')) out.push(spec);
  }
  return out;
}

function resolveImport(fromPath, spec) {
  if (spec.startsWith('/')) return normalize(spec);
  const dir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : '';
  const raw = dir ? `${dir}/${spec}` : spec;
  const parts = [];
  for (const seg of raw.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  let p = parts.join('/');
  // extension guessing
  const exts = ['', '.js', '.jsx', '.ts', '.tsx', '.json', '.css'];
  return p;
}

function transformFile(path, content, files) {
  if (/\.css$/i.test(path)) {
    return `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(content)};document.head.appendChild(s);})();`;
  }
  if (/\.json$/i.test(path)) {
    return `/* json: ${path} */`;
  }

  let js = content;

  // Rewrite side-effect-only imports (e.g. CSS) first, so the broader
  // from-import rewrite below cannot accidentally swallow them.
  js = js.replace(
    /(?:^|\n)[ \t]*import\s+['"](\.[^'"]*|\/[^'"]*)['"]\s*;?/g,
    (m, spec) => `\nrequire(${JSON.stringify(resolveImport(path, spec))});`
  );
  // Rewrite remaining import declarations into require() calls.
  // ESM `as` aliases become destructuring `:` aliases.
  const destructure = (clause) =>
    clause.replace(/([{,]\s*[\w$]+)\s+as\s+([\w$]+)/g, '$1: $2');
  js = js.replace(
    /(?:^|\n)[ \t]*import\s+([\s\S]*?)\s+from\s+['"](\.[^'"]*|\/[^'"]*)['"]\s*;?/g,
    (m, clause, spec) => {
      const req = `require(${JSON.stringify(resolveImport(path, spec))})`;
      const c = clause.trim();
      const ns = c.match(/^\*\s+as\s+([\w$]+)$/);
      if (ns) return `\nconst ${ns[1]} = ${req};`;
      const def = c.match(/^([\w$]+)\s*,/);
      if (def) {
        const rest = c.slice(def[0].length).trim();
        let out = `const ${def[1]} = ${req}.default;`;
        if (rest.startsWith('{')) out += `\nconst ${destructure(rest)} = ${req};`;
        else if (/^\*\s+as\s+[\w$]+$/.test(rest)) {
          out += `\nconst ${rest.replace(/^\*\s+as\s+/, '')} = ${req};`;
        }
        return '\n' + out;
      }
      if (c.startsWith('{')) return `\nconst ${destructure(c)} = ${req};`;
      return `\nconst ${c} = ${req}.default;`;
    }
  );

  // Rewrite named exports: strip the `export` keyword and register the
  // binding on the module's exports object. Registrations are appended at
  // the end of the function body, which is safe for hoisted function
  // declarations and for const/let/class bindings that run in order.
  const exported = [];
  js = js.replace(
    /(?:^|\n)[ \t]*export\s+(function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g,
    (m, kw, name) => {
      exported.push(name);
      return m.replace(/export\s+/, '');
    }
  );
  // export { a, b as c } → exports.a = a; exports.c = b;
  js = js.replace(/(?:^|\n)[ \t]*export\s*\{([^}]*)\}\s*;?/g, (m, body) => {
    let out = '';
    for (const part of body.split(',')) {
      if (!part.trim()) continue;
      const [orig, alias] = part.split(/\s+as\s+/);
      const from = orig.trim();
      const to = alias ? alias.trim() : from;
      out += `\nexports[${JSON.stringify(to)}] = ${from};`;
    }
    return out;
  });
  // export default <anything> → exports.default = <anything>
  js = js.replace(/(?:^|\n)[ \t]*export\s+default\s+/g, '\nexports.default = ');
  // Fallback: strip any remaining `export` keyword so leftover declarations
  // (e.g. destructured const exports) don't produce a syntax error.
  js = js.replace(/(?:^|\n)[ \t]*export\s+/g, '\n');

  for (const name of exported) js += `\nexports[${JSON.stringify(name)}] = ${name};`;
  return js;
}

export function buildPreviewDoc(files) {
  const entry = findEntry(files);
  if (!entry) {
    return `<!doctype html><body style="font-family:sans-serif;padding:2rem;background:#0d1117;color:#e6edf3">
      <h2>No HTML entry found</h2>
      <p>Add an <code>index.html</code> to your project to see a preview.</p></body>`;
  }
  let html = entry.content;

  // Inline local CSS links
  html = html.replace(
    /<link([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (full, pre, href, post) => {
      if (/\brel=["']stylesheet["']/i.test(full) && (href.startsWith('.') || href.startsWith('/'))) {
        const path = resolveImport(entry.path, href);
        const css = files.find((f) => f.path === path);
        if (css) return `<style>\n${css.content}\n</style>`;
      }
      return full;
    }
  );

  // Inline module scripts (bundled) and classic scripts
  html = inlineImports(html, files);
  html = html.replace(
    /<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attrs, body) => {
      // Never wrap scripts with a type attribute: module scripts can contain
      // top-level export declarations, which are invalid inside a try block,
      // and non-JS types (worker, text/babel, …) should be left untouched.
      if (/type=["'][a-z]+["']/i.test(attrs)) return full;
      return `<script${attrs}>\ntry{\n${body}\n}catch(e){console.error(e);}</script>`;
    }
  );

  // Inject error overlay + console bridge
  const bridge = `
<script>
(function(){
  function report(msg){
    var d=document.getElementById('__err_overlay__');
    if(!d){d=document.createElement('div');d.id='__err_overlay__';
      d.style.cssText='position:fixed;left:0;right:0;bottom:0;max-height:40%;overflow:auto;background:#2d1215;color:#ffb4ab;font:12px monospace;padding:8px 12px;z-index:99999;border-top:2px solid #f85149';
      document.body&&document.body.appendChild(d);}
    d.innerHTML+='<div>✖ '+String(msg).replace(/</g,'&lt;')+'</div>';
    window.parent&&window.parent.postMessage({source:'ace-preview',msg:String(msg)},'*');
  }
  window.addEventListener('error',function(e){report(e.message+' ('+(e.filename||'')+':'+(e.lineno||0)+')');});
  window.addEventListener('unhandledrejection',function(e){report('Unhandled promise rejection: '+e.reason);});
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.querySelector('a[target="_blank"]');void b;
  });
})();
</script>`;
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, bridge + '</body>');
  else html += bridge;

  // Add babel for JSX if any jsx/js file contains JSX-ish syntax? Keep simple:
  // If user includes <script type="text/babel"> it works via CDN they add themselves.
  return html;
}
