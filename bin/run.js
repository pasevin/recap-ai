#!/usr/bin/env bun
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const project = join(__dirname, '..');

const oclif = require('@oclif/core');
await oclif.execute({
  type: 'esm',
  dir: project,
  development: true,
  esm: true,
});
