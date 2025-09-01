import * as fs from 'node:fs';
import * as path from 'node:path';

export const resolveCompactPath = (packageDir: string, version?: string): string => {
  const compactHomeEnv = process.env.COMPACT_HOME;
  
  if (compactHomeEnv) {
    console.log(`COMPACT_HOME env variable is set; using Compact from ${compactHomeEnv}`);
    return compactHomeEnv;
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
};
