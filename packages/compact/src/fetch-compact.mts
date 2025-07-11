#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import * as console from 'node:console';

console.log('Fetching Compactc...');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [_node, _script, ...args] = process.argv;

const packageDir = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const targetFile = path.resolve(packageDir, 'compactc.zip');
const targetCompactDir = path.resolve(packageDir, 'managed');

const COMPACTC_DIR_ARG = args.find((arg) => arg.startsWith('--help'));
if (COMPACTC_DIR_ARG) {
  console.log('Supported flags:\n' +
    '    --help              - this help\n' +
    '    --force             - force download, even if directory exists\n' +
    '    --version=<version> - specify the version to download');
  process.exit(0);
}

const COMPACTC_FORCE_ARG = args.find((arg) => arg.startsWith('--force'));
console.log(`Checking directory: ${targetCompactDir}`);
if(fs.existsSync(targetCompactDir) && !COMPACTC_FORCE_ARG) {
  console.warn('Directory exists, skipping compactc download. To force download, use --force flag.');
  process.exit(0);
}

const COMPACTC_VERSION_ARG = args.find((arg) => arg.startsWith('--version='));
if (COMPACTC_VERSION_ARG) {
  console.log(`--version: ${COMPACTC_VERSION_ARG}`);
  const version = COMPACTC_VERSION_ARG.split('=')[1];
  if (version) {
    process.env.COMPACTC_VERSION = version;
  }
}

const COMPACT_HOME_ENV = process.env.COMPACT_HOME;
if (COMPACT_HOME_ENV != null) {
  console.log(`COMPACT_HOME env variable is set, skipping fetch to use Compact from ${COMPACT_HOME_ENV}`);
  process.exit(0);
}

const compactcVersion = process.env.COMPACTC_VERSION;
if (!compactcVersion) {
  console.error("COMPACTC_VERSION env var is missing. I don't know which version to download.");
  process.exit(1);
}

const currentPlatform = process.platform;
const currentCpu = process.arch;
const currentVersion = compactcVersion!;

const fetchCompact = async (): Promise<void> => {

  const githubToken = process.env['GITHUB_TOKEN'];

  if (githubToken == undefined || githubToken == '') {
    throw new Error(`No GitHub token present. Expected GITHUB_TOKEN env var to be present`);
  }

  type Release = { assets_url: string }
  const urlString = `https://api.github.com/repos/midnight-ntwrk/artifacts/releases/tags/compactc-v${currentVersion}`;
  console.log(`Trying to fetch release from: ${urlString}`);
  const release: Release = await fetch(urlString, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  }).then((r) => {
    if (r.ok) {
      return r.json() as unknown as Release;
    } else {
      console.error(`Error downloading ${urlString} ${r.status} ${r.statusText}`);
      process.exit(r.status);
    }
  });

  type Asset = { name: string; url: string }
  const assets: Asset[] = await fetch(release.assets_url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  }).then((r) => r.json() as unknown as Asset[]);

  const platformToAssetSuffix = (platform: NodeJS.Platform): string => {
    switch (platform) {
      case 'darwin':
        return 'aarch64-darwin';
      default:
        return 'x86_64-unknown-linux-musl';
    }
  };
  const assetName = `compactc_v${currentVersion}_${platformToAssetSuffix(currentPlatform)}.zip`;
  const asset = assets.find((assetLocal) => assetLocal.name === assetName);

  if (!asset) {
    throw new Error(`No matching asset found! : ${assetName}`);
  }

  const assetData = await fetch(asset.url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/octet-stream',
    },
  }).then(async (response) => {
    if (response.ok) {
      console.log(`Fetching Compact archive: ${urlString}`);
      console.log(`Compact version: ${currentVersion}`);
      return response.arrayBuffer();
    } else {
      console.error('Error: could not fetch asset: ', response.statusText, response.status);
      console.error(await response.text());
      throw new Error('Could not fetch asset');
    }
  });

  fs.writeFileSync(targetFile, Buffer.from(assetData));
  console.log(`Compact archive fetched and saved to ${targetFile}`);

  fs.rmSync(targetCompactDir, { force: true, recursive: true });
  childProcess.execSync(`unzip ${targetFile} -d ${targetCompactDir}`);
  childProcess.execSync(`chmod -R +w ${targetCompactDir}`);
  console.log(`Compact extracted to ${targetCompactDir}`);

  fs.rmSync(targetFile);
  console.log('Compact archive removed');
  console.log('Compactc ready');
}

const fetchDockerImage = () => {
  console.log('Fetching Compact docker image...');
  const dockerImage= `ghcr.io/midnight-ntwrk/compactc:v${currentVersion}`;
  const child = childProcess.exec(`docker pull ${dockerImage}`);
  child.on('exit', (code, signal) => {
    console.log(`Child process exited with code ${code}`);
    if (code === 0) {
      process.exit(0);
    } else {
      process.exit(code ?? signal);
    }
  });

  child.stdout?.on('data', (data) => {
    console.log(`${data.toString().trim()}`);
  });

  child.stderr?.on('data', (data) => {
    console.error(`${data.toString().trim()}`);
  });
}

const checkOs = (): string => {
  let compactOS;
  if (currentPlatform === 'darwin' && currentCpu === 'arm64') {
    compactOS = 'macos';
  } else if (currentPlatform === 'linux') {
    compactOS = 'linux';
  } else {
    compactOS = 'docker';
  }
  return compactOS;
}

if (checkOs() === 'docker') {
  fetchDockerImage();
} else {
  await fetchCompact()
}
