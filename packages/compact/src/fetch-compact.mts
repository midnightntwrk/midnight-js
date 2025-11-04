#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as console from 'node:console';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import { parseArgs, printHelp,shouldSkipDownload } from './fetch-utils.js';
import { VersionManager } from './version-manager.js';

console.log('Fetching Compactc...');

const [_node, _script, ...args] = process.argv;
const options = parseArgs(args);

const packageDir = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const versionManager = new VersionManager(packageDir);

if (options.help) {
  printHelp();
  process.exit(0);
}

if (options.listVersions) {
  const versions = versionManager.listVersions();
  if (versions.length === 0) {
    console.log('No versions installed');
  } else {
    console.log('Installed versions:');
    versions.forEach(version => console.log(`  ${version}`));
  }
  process.exit(0);
}

if (options.cleanup) {
  console.log(`Cleaning up, keeping ${options.cleanup} latest versions...`);
  versionManager.cleanupOldVersions(options.cleanup);
  console.log('Cleanup completed');
  process.exit(0);
}

if (shouldSkipDownload()) {
  console.log(`COMPACT_HOME env variable is set, skipping fetch to use Compact from ${process.env.COMPACT_HOME}`);
  process.exit(0);
}

const compactcVersion = options.version || process.env.COMPACTC_VERSION;
if (!compactcVersion) {
  console.error('COMPACTC_VERSION env var is missing or --version flag not provided. I don\'t know which version to download.');
  process.exit(1);
}

const targetCompactDir = versionManager.getVersionDir(compactcVersion);
console.log(`Target directory: ${targetCompactDir}`);

if (shouldSkipDownload(targetCompactDir, options.force)) {
  console.warn(`Version ${compactcVersion} already exists. Use --force to re-download.`);
  process.exit(0);
}

const targetFile = path.resolve(packageDir, `compactc-${compactcVersion}.zip`);
const currentPlatform = process.platform;
const currentCpu = process.arch;

const fetchCompact = async (): Promise<void> => {
  const githubToken = process.env['GITHUB_TOKEN'];

  if (githubToken == undefined || githubToken == '') {
    throw new Error(`No GitHub token present. Expected GITHUB_TOKEN env var to be present`);
  }

  type Release = { assets_url: string }
  const urlString = `https://api.github.com/repos/midnight-ntwrk/artifacts/releases/tags/compactc-v${compactcVersion}`;
  console.log(`Trying to fetch release from: ${urlString}`);
  const release: Release = await fetch(urlString, {
    headers: {
      Authorization: `Bearer ${githubToken}`
    }
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
      Authorization: `Bearer ${githubToken}`
    }
  }).then((r) => r.json() as unknown as Asset[]);

  const platformToAssetSuffix = (): string => {
    if (currentPlatform === 'darwin') {
      if (currentCpu === 'arm64') {
        return 'aarch64-darwin';
      } else if (currentCpu === 'x64') {
        return 'x86_64-darwin';
      } else {
        throw new Error(`Unexpected platform architecture combination: platform=${currentPlatform}, architecture=${currentCpu}`);
      }
    } else if (currentPlatform === 'linux') {
      return 'x86_64-unknown-linux-musl';
    } else {
      throw new Error(`Unsupported platform: ${currentPlatform}`);
    }
  };

  const assetName = `compactc_v${compactcVersion}_${platformToAssetSuffix()}.zip`;
  const asset = assets.find((assetLocal) => assetLocal.name === assetName);

  if (!asset) {
    throw new Error(`No matching asset found! : ${assetName}`);
  }

  const assetData = await fetch(asset.url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/octet-stream'
    }
  }).then(async (response) => {
    if (response.ok) {
      console.log(`Fetching Compact archive: ${urlString}`);
      console.log(`Compact version: ${compactcVersion}`);
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
  fs.mkdirSync(targetCompactDir, { recursive: true });

  childProcess.execSync(`unzip ${targetFile} -d ${targetCompactDir}`);
  childProcess.execSync(`chmod -R +w ${targetCompactDir}`);
  console.log(`Compact extracted to ${targetCompactDir}`);

  fs.rmSync(targetFile);
  console.log('Compact archive removed');
  console.log(`Compactc v${compactcVersion} ready`);
};

const fetchDockerImage = () => {
  console.log('Fetching Compact docker image...');
  const dockerImage = `ghcr.io/midnight-ntwrk/compactc:v${compactcVersion}`;
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
};

const checkOs = (): string => {
  let compactOS;
  if (currentPlatform === 'darwin' && (currentCpu === 'arm64' || currentCpu === 'x64')) {
    compactOS = 'macos';
  } else if (currentPlatform === 'linux') {
    compactOS = 'linux';
  } else {
    compactOS = 'docker';
  }
  return compactOS;
};

versionManager.ensureManagedDirExists();

if (checkOs() === 'docker') {
  fetchDockerImage();
} else {
  await fetchCompact();
}
