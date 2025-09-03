#!/usr/bin/env node

const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const { exec } = require("node:child_process");

const [_node, _script, ...args] = process.argv;
const COMPACT_HOME_ENV = process.env.COMPACT_HOME;

console.log(`Trying to compile: ${args.join(' ')}`)

function resolveCompactPath(packageDir, version) {
  if (COMPACT_HOME_ENV != null) {
    console.log(`COMPACT_HOME env variable is set; using Compact from ${COMPACT_HOME_ENV}`);
    return COMPACT_HOME_ENV;
  }

  const managedDir = path.resolve(packageDir, 'managed');

  if (version) {
    const versionDir = path.resolve(managedDir, version);
    const compactcPath = path.join(versionDir, 'compactc');

    if (fs.existsSync(compactcPath)) {
      console.log(`Using Compact version ${version} from ${versionDir}`);
      return versionDir;
    } else {
      throw new Error(`Compact version ${version} not found at ${versionDir}. Run fetch-compactc --version=${version} first.`);
    }
  }

  const versions = fs.existsSync(managedDir)
    ? fs.readdirSync(managedDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(versionName => {
          const compactcPath = path.join(managedDir, versionName, 'compactc');
          return fs.existsSync(compactcPath);
        })
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    : [];

  if (versions.length === 0) {
    throw new Error('No Compact versions found. Run fetch-compactc first.');
  }

  const latestVersion = versions[0];
  const latestVersionDir = path.resolve(managedDir, latestVersion);
  console.log(`Using latest Compact version ${latestVersion} from ${latestVersionDir}`);

  return latestVersionDir;
}

function checkOs() {
  const currentPlatform = process.platform;
  const currentCpu = process.arch;
  let compactOS;
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

  const packageDir = path.resolve(__dirname, '..');
  const requestedVersion = process.env.COMPACTC_VERSION;

  try {
    const compactPath = resolveCompactPath(packageDir, requestedVersion);

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
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
