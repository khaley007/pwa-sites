'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');
const ministry = path.join(root, 'sites', 'ministry');
const nonprofit = path.join(root, 'sites', 'nonprofit');
const shared = path.join(root, 'shared');
const origin = 'https://preview.invalid';
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw new Error('Unsafe dist path.');
const excludedDir = /^(?:\.git|node_modules|data|deploy|design-src|project-docs|reviews)$/i;
const excludedFile = /^(?:server\.js|\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|.*(?:credential|secret).*)$/i;
function allowed(sourceRoot, file) {
  return !path.relative(sourceRoot, file).split(path.sep).some((part) => excludedDir.test(part) || excludedFile.test(part));
}
function copyContents(source, dest) {
  if (!fs.existsSync(source)) throw new Error('Missing source: ' + source);
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, ent.name);
    if (!allowed(source, from)) continue;
    fs.cpSync(from, path.join(dest, ent.name), {
      recursive: true, force: true,
      filter: (candidate) => allowed(source, candidate),
    });
  }
}
function prefixNonprofitUrl(value) {
  const m = value.match(/^([^?#]*)(.*)$/);
  const pathname = m ? m[1] : value;
  const suffix = m ? m[2] : '';
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return value;
  if (pathname === '/') return '/nonprofit/' + suffix;
  if (pathname === '/nonprofit' || pathname.startsWith('/nonprofit/')) return value;
  if (pathname === '/shared' || pathname.startsWith('/shared/')) return value;
  if (pathname === '/go' || pathname.startsWith('/go/')) return value;
  return '/nonprofit' + pathname + suffix;
}
function rewriteNonprofitHtml(html) {
  html = html.replace(/\b(href|src|action|poster|data-src|data-href)\s*=\s*(["'])(.*?)\2/gi,
    (whole, attr, quote, value) => value.startsWith('/') ? attr + '=' + quote + prefixNonprofitUrl(value) + quote : whole);
  return html.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (whole, quote, value) => {
    const rewritten = value.split(',').map((item) => {
      const parts = item.trim().split(/\s+/, 2);
      parts[0] = prefixNonprofitUrl(parts[0]);
      return parts.join(' ');
    }).join(', ');
    return 'srcset=' + quote + rewritten + quote;
  });
}
function addFormNotice(html, label) {
  let count = 0;
  html = html.replace(/<form\b[^>]*data-lead-form[^>]*>/gi, (tag) => {
    count++;
    if (!/\bonsubmit\s*=/.test(tag)) tag = tag.replace(/>$/, ' onsubmit="return false;">');
    return tag + '\n      <p class="preview-form-notice" role="note"><strong>Preview only:</strong> form submissions are disabled.</p>';
  });
  if (/data-lead-form/i.test(html) && count === 0) throw new Error('Could not guard form in ' + label);
  html = html.replace(/<button\b[^>]*>/gi, (tag) => {
    if (!/\btype\s*=\s*["']submit["']/i.test(tag) || /\bdisabled\b/i.test(tag)) return tag;
    return tag.replace(/^<button\b/i, '<button disabled');
  });
  html = html.replace(/<input\b[^>]*>/gi, (tag) => {
    if (!/\btype\s*=\s*["']submit["']/i.test(tag) || /\bdisabled\b/i.test(tag)) return tag;
    return tag.replace(/^<input\b/i, '<input disabled');
  });
  return { html, count };
}
function walk(dir) {
  let result = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    result = result.concat(ent.isDirectory() ? walk(full) : ent.isFile() ? [full] : []);
  }
  return result;
}
function writeShared() {
  const out = path.join(dist, 'shared');
  const ds = path.join(out, 'ds');
  const tokens = ['base.css','colors.css','typography.css','spacing.css','radius.css','shadows.css','motion.css'];
  fs.mkdirSync(path.join(ds, 'tokens'), { recursive: true });
  fs.copyFileSync(path.join(shared, 'ds', 'styles.css'), path.join(ds, 'styles.css'));
  for (const token of tokens) fs.copyFileSync(path.join(shared, 'ds', 'tokens', token), path.join(ds, 'tokens', token));
  fs.mkdirSync(path.join(out, 'js'), { recursive: true });
  const js = fs.readFileSync(path.join(shared, 'js', 'site.js'), 'utf8');
  const start = js.indexOf('  // Lead form');
  const end = js.indexOf('  // Scroll reveal', start);
  if (start < 0 || end < 0) throw new Error('Could not locate lead-form handler in shared site.js.');
  const guard = [
    '  // Preview build: forms remain visible but never submit.',
    "  document.querySelectorAll('[data-lead-form]').forEach(function (form) {",
    "    form.addEventListener('submit', function (event) {",
    '      event.preventDefault();',
    '      event.stopImmediatePropagation();',
    '    });',
    '  });',
    '',
  ].join('\n');
  const output = js.slice(0, start) + guard + js.slice(end);
  if (output.includes('/api/lead') || /\bfetch\s*\(/.test(output)) throw new Error('Preview JS still has a submit network path.');
  fs.writeFileSync(path.join(out, 'js', 'site.js'), output, 'utf8');
}
function servedPageUrl(relative) {
  const p = '/' + relative.split(path.sep).join('/');
  if (p === '/index.html') return '/';
  if (p === '/nonprofit/index.html') return '/nonprofit/';
  return p.replace(/\.html$/i, '');
}
function fileForUrl(pathname, fileSet) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const clean = decoded.replace(/^\/+/, '');
  const candidates = decoded.endsWith('/') || !clean ? [path.posix.join(clean, 'index.html')] : [clean, ...(path.posix.extname(clean) ? [] : [clean + '.html'])];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}
function checkReference(raw, pageUrl, source, fileSet, htmlMap, redirectSet, errors) {
  const value = raw.trim();
  if (!value || value.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return;
  let u;
  try { u = new URL(value, origin + pageUrl); } catch { errors.push(source + ' has invalid URL ' + value); return; }
  if (u.origin !== origin) return;
  if (u.pathname === '/go/discover' || u.pathname === '/go/quiz') {
    if (!redirectSet.has(u.pathname)) errors.push(source + ' lacks redirect for ' + u.pathname);
    return;
  }
  const target = fileForUrl(u.pathname, fileSet);
  if (!target) { errors.push(source + ' -> ' + u.pathname + ' is unresolved'); return; }
  if (u.hash && htmlMap.has(target)) {
    const ids = [...htmlMap.get(target).matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]);
    if (!ids.includes(decodeURIComponent(u.hash.slice(1)))) errors.push(source + ' -> ' + u.pathname + u.hash + ' has no matching anchor');
  }
}
function audit() {
  const paths = walk(dist).map((p) => path.relative(dist, p).split(path.sep).join('/'));
  const fileSet = new Set(paths);
  const htmlMap = new Map(paths.filter((p) => p.endsWith('.html')).map((p) => [p, fs.readFileSync(path.join(dist, p), 'utf8')]));
  const redirectLines = fs.readFileSync(path.join(dist, '_redirects'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const redirectSet = new Set(redirectLines.map((line) => line.split(/\s+/, 1)[0]));
  const errors = [];
  let localRefs = 0;
  let forms = 0;
  for (const [relative, html] of htmlMap) {
    const pageUrl = servedPageUrl(relative);
    const attr = /\b(href|src|action|poster|data-src|data-href|srcset)\s*=\s*(["'])(.*?)\2/gi;
    let m;
    while ((m = attr.exec(html))) {
      const values = m[1].toLowerCase() === 'srcset' ? m[3].split(',').map((i) => i.trim().split(/\s+/, 1)[0]) : [m[3]];
      for (const value of values) {
        if (value.trim() && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value.trim())) localRefs++;
        checkReference(value, pageUrl, relative, fileSet, htmlMap, redirectSet, errors);
      }
    }
    for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      for (const url of style[1].matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
        localRefs++;
        checkReference(url[2], pageUrl, relative + ' inline CSS', fileSet, htmlMap, redirectSet, errors);
      }
    }
    const pageForms = [...html.matchAll(/<form\b[^>]*data-lead-form[^>]*>/gi)];
    forms += pageForms.length;
    for (const form of pageForms) if (!/\bonsubmit\s*=\s*["']return false;["']/i.test(form[0])) errors.push(relative + ' preview form lacks submit guard');
    if (pageForms.length && !html.includes('Preview only:</strong> form submissions are disabled.')) errors.push(relative + ' preview form lacks notice');
    if (pageForms.length && /<button\b(?![^>]*\bdisabled\b)[^>]*\btype\s*=\s*["']submit["']/i.test(html)) errors.push(relative + ' has an enabled submit button');
  }
  for (const relative of paths.filter((p) => p.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(dist, relative), 'utf8');
    for (const ref of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)['"]?\)?/gi)) {
      localRefs++;
      checkReference(ref[1], '/' + relative, relative + ' @import', fileSet, htmlMap, redirectSet, errors);
    }
    for (const ref of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
      localRefs++;
      checkReference(ref[2], '/' + relative, relative + ' CSS url()', fileSet, htmlMap, redirectSet, errors);
    }
  }
  for (const relative of paths.filter((p) => /\.(?:html|css|js)$/i.test(p))) {
    const text = fs.readFileSync(path.join(dist, relative), 'utf8');
    if (relative.endsWith('.js') && (text.includes('/api/lead') || /\bfetch\s*\(/.test(text))) errors.push(relative + ' contains an API/network submit path');
  }
  const required = ['index.html','nonprofit/index.html','styles.css','nonprofit/styles.css','shared/assets/favicon.png','shared/assets/og-card.png','shared/assets/logo/pwa-logo-full-color-transparent.png','shared/ds/styles.css','shared/ds/tokens/base.css','shared/js/site.js'];
  for (const p of required) if (!fileSet.has(p)) errors.push('required file missing: ' + p);
  for (const p of paths) {
    if (/(^|\/)(?:server\.js|node_modules|\.git|data|deploy|design-src|project-docs|reviews)(?:\/|$)/i.test(p)
      || /(^|\/)\.env(?:\.|$)/i.test(p)
      || /(?:credential|secret|private[-_]?key|\.(?:pem|key|p12|pfx)$)/i.test(p)) errors.push('forbidden file included: ' + p);
  }
  if (!fileSet.has('services.html') || !fileSet.has('nonprofit/services.html')) errors.push('Ministry or Nonprofit services clean-route file is missing');
  if (forms !== 4) errors.push('expected four preview forms, found ' + forms);
  for (const route of ['/go/discover','/go/quiz']) if (!redirectSet.has(route)) errors.push('missing redirect source ' + route);
  if (errors.length) throw new Error('Output audit failed:\n- ' + errors.join('\n- '));
  console.log('Validated ' + fileSet.size + ' dist files and ' + localRefs + ' local references; all resolve.');
  console.log('Routes: / -> index.html; /nonprofit/ -> nonprofit/index.html; Ministry and Nonprofit clean routes generated.');
  console.log('Forms: ' + forms + ' remain visible, disabled, and guarded; no /api/lead request code is present.');
  console.log('CTA redirects: /go/discover and /go/quiz verified.');
}
function redirects() {
  const lines = ['/go/discover https://team.purewaterautomations.com/discover 302','/go/quiz https://purewaterautomations.getformly.app/tcndHU 302','/index.html / 301','/nonprofit /nonprofit/ 301','/nonprofit/index.html /nonprofit/ 301'];
  for (const group of [{dir:dist,prefix:''},{dir:path.join(dist,'nonprofit'),prefix:'/nonprofit'}]) {
    for (const file of fs.readdirSync(group.dir).filter((f) => f.toLowerCase().endsWith('.html') && f.toLowerCase() !== 'index.html')) {
      const route = group.prefix + '/' + file.replace(/\.html$/i, '');
      lines.push(route + '.html ' + route + ' 301', route + ' ' + route + '.html 200', route + '/ ' + route + ' 301');
    }
  }
  fs.writeFileSync(path.join(dist, '_redirects'), lines.join('\n') + '\n', 'utf8');
}
function build() {
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  copyContents(ministry, dist);
  copyContents(nonprofit, path.join(dist, 'nonprofit'));
  copyContents(path.join(shared, 'assets'), path.join(dist, 'shared', 'assets'));
  writeShared();
  let forms = 0;
  for (const htmlPath of walk(dist).filter((p) => p.toLowerCase().endsWith('.html'))) {
    const relative = path.relative(dist, htmlPath).split(path.sep).join('/');
    let html = fs.readFileSync(htmlPath, 'utf8');
    if (relative.startsWith('nonprofit/')) html = rewriteNonprofitHtml(html);
    const result = addFormNotice(html, relative);
    forms += result.count;
    fs.writeFileSync(htmlPath, result.html, 'utf8');
  }
  for (const css of [path.join(dist,'styles.css'),path.join(dist,'nonprofit','styles.css')]) {
    if (!fs.existsSync(css)) throw new Error('Missing site stylesheet ' + css);
    fs.appendFileSync(css, '\n.preview-form-notice { margin: 0 0 1rem; padding: .75rem 1rem; border: 2px solid #b45309; border-radius: .5rem; background: #fff7ed; color: #7c2d12; font-size: .95rem; }\n', 'utf8');
  }
  if (forms !== 4) throw new Error('Expected four forms, found ' + forms);
  redirects();
  audit();
}
build();
