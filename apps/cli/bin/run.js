#!/usr/bin/env bun
const { join } = require('path');
const oclif = require('@oclif/core');

const project = join(__dirname, '..');

oclif.execute({
  dir: project,
  development: false,
});
