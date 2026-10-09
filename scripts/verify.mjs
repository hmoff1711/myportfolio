import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const site = 'https://hmoff1711.github.io/myportfolio/';
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

// This scanner checks explicit source references, not browser HTML semantics.
// Quoted attribute values may contain >; comments do not contain live elements.
function elements(source) {
  const result = [];
  const markup = source.replace(/<!--[\s\S]*?-->/g, '');
  const tags = /<([a-z][\w:-]*)\b((?:[^<>"']|"[^"]*"|'[^']*')*)>/gi;
  for (const match of markup.matchAll(tags)) {
    const attrs = Object.create(null);
    const attributes = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    for (const attribute of match[2].matchAll(attributes)) {
      attrs[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
    }
    result.push({ tag: match[1].toLowerCase(), attrs });
  }
  return result;
}

const nodes = elements(html);
const ids = new Map(nodes.filter(node => node.attrs.id).map(node => [node.attrs.id, node]));
const hasClass = (node, name) => (node.attrs.class || '').split(/\s+/).includes(name);
const isExternal = value => /^[a-z][\w+.-]*:|^\/\//i.test(value);
const meta = name => nodes.find(node => node.tag === 'meta' && (node.attrs.name === name || node.attrs.property === name))?.attrs.content;

test('Adventure controllers link with their real exported dependencies', async () => {
  // File existence alone cannot catch a renamed or missing named export.
  const coast = await import('../js/game.js');
  const journey = await import('../js/journey.js');
  assert.equal(typeof coast.boot, 'function');
  assert.equal(typeof journey.createJourneyController, 'function');
});

function localAsset(reference, from = root) {
  const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  assert.ok(clean, `Empty asset path: ${reference}`);
  assert.ok(!clean.startsWith('/') || clean.startsWith('/myportfolio/'), `Asset escapes the GitHub Pages base: ${reference}`);
  const path = clean.startsWith('/myportfolio/')
    ? resolve(root, clean.slice('/myportfolio/'.length))
    : resolve(from, clean);
  assert.ok(path.startsWith(resolve(root) + sep), `Asset escapes the repository: ${reference}`);
  assert.ok(statSync(path).isFile(), `Asset is not a file: ${reference}`);
  return path;
}

test('HTML IDs are unique and internal links, ARIA references and labels resolve', () => {
  const identified = nodes.filter(node => node.attrs.id);
  assert.equal(ids.size, identified.length, 'Duplicate HTML/SVG IDs');
  for (const { tag, attrs } of nodes) {
    if (attrs.href?.startsWith('#')) {
      const id = decodeURIComponent(attrs.href.slice(1));
      assert.ok(ids.has(id), `Broken fragment link: ${attrs.href}`);
    }
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-details', 'aria-owns', 'aria-activedescendant']) {
      for (const id of (attrs[attribute] || '').split(/\s+/).filter(Boolean)) {
        assert.ok(ids.has(id), `Missing ${attribute} target: ${id}`);
      }
    }
    if (tag === 'label' && attrs.for) assert.ok(ids.has(attrs.for), `Missing label target: ${attrs.for}`);
  }
});

test('Legacy navigable sections and heading fragments remain available', () => {
  for (const id of ['main', 'top', 'hero-title', 'focus', 'focus-title', 'expertise', 'expertise-title', 'work', 'work-title', 'experience', 'experience-title', 'background', 'background-title', 'languages-title', 'contact', 'contact-title']) {
    assert.ok(ids.has(id), `Legacy fragment removed: #${id}`);
  }
});

test('HTML and CSS local assets exist under the /myportfolio/ base', () => {
  const stylesheets = [];
  for (const { tag, attrs } of nodes) {
    for (const reference of [attrs.src, attrs.href, attrs.poster].filter(Boolean)) {
      if (!reference.startsWith('#') && !isExternal(reference)) {
        const path = localAsset(reference);
        if (tag === 'link' && attrs.rel === 'stylesheet') stylesheets.push(path);
      }
    }
  }
  assert.ok(stylesheets.length, 'No stylesheets found');
  for (const path of stylesheets) {
    const css = readFileSync(path, 'utf8');
    for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
      const reference = (match[1] ?? match[2] ?? match[3]).trim();
      if (!reference.startsWith('#') && !isExternal(reference)) localAsset(reference, dirname(path));
    }
  }
});

test('Five case notes use native details with readable evidence and preserved fragment targets', () => {
  const cases = new Map();
  for (const match of html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/gi)) {
    const members = elements(match[0]);
    if (hasClass(members[0], 'journal-case')) cases.set(members[0].attrs.id, members);
  }
  const expected = ['onefs', 'sftp', 'rollout', 'smb', 'dns'];
  assert.deepEqual([...cases.keys()].sort(), expected.map(name => `case-${name}`).sort());
  for (const name of expected) {
    const members = cases.get(`case-${name}`);
    assert.equal(members[1].tag, 'summary', `${name}: details must begin with a native summary`);
    assert.equal(members.filter(node => node.tag === 'summary').length, 1, `${name}: expected one summary`);
    assert.ok(members.some(node => node.attrs.id === `case-${name}-title`), `${name}: missing case title`);
    assert.ok(members.some(node => hasClass(node, 'journal-detail-body')), `${name}: missing case body`);
    assert.ok(members.some(node => node.tag === 'aside' && hasClass(node, 'journal-note')), `${name}: missing verification boundary`);
    for (const fragment of ['observe', 'isolate', 'verify']) {
      assert.ok(members.some(node => /^h[2-4]$/.test(node.tag) && node.attrs.id === `${name}-${fragment}`), `${name}: missing ${fragment} heading`);
    }
  }
});

test('Core content is present and visible in the source without JavaScript', () => {
  const sections = nodes.filter(node => 'data-journal-section' in node.attrs);
  assert.deepEqual(sections.map(node => node.attrs.id).sort(), ['background', 'contact', 'experience', 'expertise', 'profile', 'work']);
  assert.equal(ids.get('portfolio-panel')?.tag, 'aside', 'Professional journal missing from HTML');
  for (const id of ['layer-identity', 'layer-storage', 'layer-networks', 'layer-endpoints', 'layer-platforms']) {
    assert.equal(ids.get(id)?.tag, 'details', `Expertise subject is not a native disclosure: #${id}`);
  }
  const core = nodes.filter(node => node.attrs.id === 'portfolio-panel' || 'data-journal-section' in node.attrs || node.attrs.id?.startsWith('layer-') || hasClass(node, 'journal-case') || hasClass(node, 'journal-detail-body'));
  for (const node of core) {
    assert.ok(!('hidden' in node.attrs), `Source content requires JavaScript to reveal: ${node.attrs.id}`);
    assert.ok(!('inert' in node.attrs), `Source content is inert: ${node.attrs.id}`);
    assert.notEqual(node.attrs['aria-hidden'], 'true', `Source content is hidden from assistive technology: ${node.attrs.id}`);
  }
});

test('Resume and vCard are byte-for-byte preserved', () => {
  // SHA-256 of the unchanged source files, verified against Git HEAD before redesign.
  const expected = {
    'cv/Hikmat_Mahammadov_Resume.pdf': '0172533bfa5972f31dd4c099bff8ec4f50a4120402c764d58edf5a00fee07e58',
    'cv/hikmat.vcf': '9f6d19ee99f9465b31c1bcc6ddcbbbc6ecceb52808f5f0e5844b7cbbf14ea98e'
  };
  for (const [path, hash] of Object.entries(expected)) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex'), hash, `${path} changed`);
    assert.ok(nodes.some(node => node.tag === 'a' && node.attrs.href === path), `Download link missing: ${path}`);
  }
});

test('Canonical, social metadata, structured identity and crawler files agree', () => {
  assert.equal(nodes.find(node => node.tag === 'link' && node.attrs.rel === 'canonical')?.attrs.href, site);
  assert.equal(meta('og:url'), site);
  for (const name of ['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']) assert.ok(meta(name), `Missing metadata: ${name}`);
  for (const name of ['og:image', 'twitter:image']) {
    assert.equal(meta(name), `${site}images/cover.jpg`);
    localAsset('images/cover.jpg');
  }
  const json = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(json, 'Person JSON-LD missing');
  const person = JSON.parse(json[1]);
  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, 'Hikmat Mahammadov');
  assert.equal(person.url, site);
  assert.equal(person.jobTitle, 'IT Infrastructure Specialist');
  assert.equal(person.address.addressLocality, 'Baku');
  assert.equal(person.address.addressCountry, 'AZ');
  assert.ok(person.sameAs.includes('https://www.linkedin.com/in/hmoff1711/'));
  assert.ok(person.sameAs.includes('https://github.com/hmoff1711'));
  assert.ok(readFileSync(resolve(root, 'robots.txt'), 'utf8').includes(`Sitemap: ${site}sitemap.xml`));
  assert.ok(readFileSync(resolve(root, 'sitemap.xml'), 'utf8').includes(`<loc>${site}</loc>`));
});

test('Contact endpoints and the native Airform contract are preserved', () => {
  for (const href of ['mailto:hikmet2000.hg@gmail.com', 'tel:+994554387647', 'https://www.linkedin.com/in/hmoff1711/', 'https://github.com/hmoff1711', 'https://wa.me/994554387647']) {
    assert.ok(nodes.some(node => node.tag === 'a' && node.attrs.href === href), `Missing contact: ${href}`);
  }
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/i);
  assert.ok(form, 'Contact form missing');
  const members = elements(form[0]);
  assert.equal(members[0].attrs.action, 'https://airform.io/hikmet2000.hg@gmail.com');
  assert.equal(members[0].attrs.method.toLowerCase(), 'post');
  for (const [name, maxlength] of [['name', '100'], ['email', '254'], ['message', '3000']]) {
    const field = members.find(node => node.attrs.name === name);
    assert.ok(field && 'required' in field.attrs, `Required form field missing: ${name}`);
    assert.equal(field.attrs.maxlength, maxlength, `Changed ${name} field limit`);
    if (name === 'email') assert.equal(field.attrs.type, 'email', 'Native email validation missing');
    assert.ok(members.some(node => node.tag === 'label' && node.attrs.for === field.attrs.id), `Form field has no label: ${name}`);
  }
  assert.ok(members.some(node => node.tag === 'button' && node.attrs.type === 'submit'));
});

test('Runtime module graph and styles resolve locally without CDN dependencies', () => {
  const runtimeFiles = [];
  for (const { tag, attrs } of nodes) {
    if (tag === 'script' && attrs.src) {
      assert.ok(!isExternal(attrs.src), `Remote runtime script: ${attrs.src}`);
      runtimeFiles.push(localAsset(attrs.src));
    }
    if (tag === 'link' && /(?:^|\s)(?:stylesheet|modulepreload)(?:\s|$)/.test(attrs.rel || '')) {
      assert.ok(attrs.href && !isExternal(attrs.href), `Remote runtime stylesheet/module: ${attrs.href}`);
      runtimeFiles.push(localAsset(attrs.href));
    }
  }
  assert.ok(runtimeFiles.length, 'No runtime assets checked');
  const visited = new Set();
  for (let index = 0; index < runtimeFiles.length; index++) {
    const path = runtimeFiles[index];
    if (visited.has(path)) continue;
    visited.add(path);
    const source = readFileSync(path, 'utf8');
    const imports = path.endsWith('.css')
      ? [...source.matchAll(/(?:url\(\s*|@import\s+)["']?([^\s"'()]+)/gi)]
      : [...source.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?|\bimport\s*\(\s*)['"]([^'"]+)['"]/g)];
    for (const match of imports) {
      const reference = match[1];
      if (reference.startsWith('#') || reference.startsWith('data:')) continue;
      assert.ok(!isExternal(reference), `Remote runtime dependency in ${path}: ${reference}`);
      const dependency = localAsset(reference, dirname(path));
      if (/\.(?:m?js|css)$/.test(dependency)) runtimeFiles.push(dependency);
    }
  }
});

test('The self-hosted Three.js runtime retains its version and MIT license', () => {
  const core = readFileSync(localAsset('vendor/three/three.core.js'), 'utf8');
  localAsset('vendor/three/three.module.js');
  assert.match(core, /const REVISION = '180';/, 'Expected Three.js 0.180.0 runtime');
  const license = readFileSync(localAsset('vendor/three/LICENSE'), 'utf8');
  assert.match(license, /The MIT License/);
  assert.match(license, /Copyright.*three\.js authors/);
});
