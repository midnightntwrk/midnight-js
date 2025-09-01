import * as fs from 'node:fs';
import * as path from 'node:path';

export class VersionManager {
  constructor(private packageDir: string) {}

  getVersionDir(version: string): string {
    return path.resolve(this.packageDir, 'managed', version);
  }

  versionExists(version: string): boolean {
    const versionDir = this.getVersionDir(version);
    const compactcPath = path.join(versionDir, 'compactc');
    return fs.existsSync(compactcPath);
  }

  listVersions(): string[] {
    const managedDir = path.resolve(this.packageDir, 'managed');
    
    if (!fs.existsSync(managedDir)) {
      return [];
    }

    return fs.readdirSync(managedDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(version => this.versionExists(version))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  getCompactcPath(version: string): string {
    return path.join(this.getVersionDir(version), 'compactc');
  }

  removeVersion(version: string): void {
    const versionDir = this.getVersionDir(version);
    fs.rmSync(versionDir, { recursive: true, force: true });
  }

  cleanupOldVersions(keepCount: number): void {
    const versions = this.listVersions();
    const toRemove = versions.slice(0, -keepCount);
    
    toRemove.forEach(version => this.removeVersion(version));
  }

  ensureManagedDirExists(): void {
    const managedDir = path.resolve(this.packageDir, 'managed');
    if (!fs.existsSync(managedDir)) {
      fs.mkdirSync(managedDir, { recursive: true });
    }
  }
}
