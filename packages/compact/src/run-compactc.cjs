#!/usr/bin/env node

const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require("node:child_process");

const [_node, _script, ...args] = process.argv;
const COMPACT_HOME_ENV = process.env.COMPACT_HOME;

console.log(`Trying to compile: ${args.join(' ')}`)

function checkOs ()  {
  const currentPlatform = process.platform;
  const currentCpu = process.arch;
  let compactOS = 'docker';
  if (currentPlatform === 'darwin' && (currentCpu === 'arm64' || currentCpu === 'x64')) {
    compactOS = 'macos';
  } else if (currentPlatform === 'linux') {
    compactOS = 'linux';
  } else {
    compactOS = 'docker';
  }
  return compactOS;
}

let child;
if (checkOs() === 'docker') {
  console.log('Using docker image...');
  const currentDir = process.cwd();
  const currentVersion = process.env.COMPACTC_VERSION;
  if (!currentVersion) {
    console.error("COMPACTC_VERSION env var is missing. I don't know which version to execute.");
    process.exit(1);
  }
  const dockerImage = `ghcr.io/midnight-ntwrk/compactc:v${currentVersion}`;

  const argsCompact = args
    .map(arg => arg.startsWith('-') ? arg : `/compact/${arg}`)
    .join(' ');

  const containerName = 'compactc-docker';

  const argsDocker = [
    'run', '--name', containerName, '--rm', '-v', `${currentDir}:/compact`, `${dockerImage}`, `"compactc ${argsCompact}"`
  ];

  const dockerCommand = `docker ${argsDocker.join(" ")}`;

  child = exec(dockerCommand);

  child.on('exit', (code, signal) => {
    console.log(`Child process exited with code ${code}`);
    if (code === 0) {
      process.exit(0);
    } else {
      process.exit(code ?? signal);
    }
  });

  child.stdout.on('data', (data) => {
    console.log(`${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
      console.error(`${data.toString().trim()}`);
  });
} else {
  console.log('Using compactc binary...');
  let compactPath;
  if (COMPACT_HOME_ENV != null) {
    compactPath = COMPACT_HOME_ENV;
    console.log(`COMPACT_HOME env variable is set; using Compact from ${compactPath}`);
  } else {
    compactPath = path.resolve(__dirname, '..', 'managed');
    console.log(`COMPACT_HOME env variable is not set; using fetched compact from ${compactPath}`);
  }

  // yarn runs everything with node...
  child = childProcess.spawn(path.resolve(compactPath, 'compactc'), args, {
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    console.log(`Child process exited with code ${code}`);
    if (code === 0) {
      process.exit(0);
    } else {
      process.exit(code ?? signal);
    }
  })
}


