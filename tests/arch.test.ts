/**
 * Architecture tests. D4 ("the CLI never calls a model") is a promise to users;
 * this is what makes it a fact rather than an intention.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) return sources(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

const NETWORK = [
  'fetch(', 'node:http', 'node:https', 'node:net', 'node:dgram', 'XMLHttpRequest', 'WebSocket',
];
const LLM = ['openai', '@anthropic-ai', 'anthropic', '@google/generative', 'langchain', 'ollama', 'mistralai', 'cohere'];

test('packages/core performs no network I/O', () => {
  for (const file of sources('src/core')) {
    const text = readFileSync(file, 'utf8');
    for (const needle of NETWORK) {
      assert.ok(!text.includes(needle), `${file} references '${needle}' — core must never touch the network`);
    }
  }
});

test('nothing in the tool depends on an LLM provider', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies: Record<string, string>; devDependencies: Record<string, string>;
  };
  const all = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  for (const dep of all) {
    for (const needle of LLM) {
      assert.ok(!dep.includes(needle), `dependency '${dep}' pulls in an LLM provider — D4 forbids it`);
    }
  }
  for (const file of [...sources('src/core'), ...sources('src/cli')]) {
    const text = readFileSync(file, 'utf8');
    for (const needle of LLM) {
      assert.ok(!text.includes(`from '${needle}`), `${file} imports ${needle}`);
    }
  }
});

test('core never imports the cli layer', () => {
  for (const file of sources('src/core')) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/from '\.\.\/cli/.test(text) && !/from '\.\.\/\.\.\/cli/.test(text), `${file} imports from cli`);
  }
});

test('only the fs layer touches the filesystem for reading the workspace', () => {
  const allowed = new Set(['src/core/fs.ts', 'src/core/mutate.ts', 'src/core/init.ts', 'src/core/load.ts']);
  for (const file of sources('src/core')) {
    if (allowed.has(file)) continue;
    const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes("from 'node:fs'"), `${file} imports node:fs — keep I/O in the fs layer`);
  }
});

test('the adapter generator is pure — it returns files rather than writing them', () => {
  for (const file of sources('src/adapters')) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes("from 'node:fs'"), `${file} writes to disk; adapters must stay pure so CI can diff them`);
  }
});

test('the runtime dependency surface stays tiny', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> };
  const deps = Object.keys(pkg.dependencies);
  assert.ok(deps.length <= 2, `runtime dependencies grew to ${deps.length}: ${deps.join(', ')}`);
});
