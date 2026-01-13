#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const compiledDirPath = process.argv[2];

if (!compiledDirPath) {
  console.error('Error: Please provide the path to the compiled directory as an argument.');
  console.error('Usage: node check-compiled.js <path-to-managed-dir>');
  process.exit(1);
}

const compiledDir = path.join(process.cwd(), compiledDirPath);

if (!fs.existsSync(compiledDir)) {
  console.log(`Compiled directory not found at ${compiledDirPath}. Running yarn compact...`);
  execSync('yarn compact', { stdio: 'inherit' });
} else {
  console.log(`Compiled directory exists at ${compiledDirPath}. Skipping compilation.`);
}