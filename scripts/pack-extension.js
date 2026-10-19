import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distDir = 'dist';
const publicZipPath = 'public/snippet-organizer-extension.zip';
const distZipPath = 'dist/snippet-organizer-extension.zip';

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run "vite build" first.');
  process.exit(1);
}

try {
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  execSync(`python3 -c "
import os, zipfile
with zipfile.ZipFile('${publicZipPath}', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('${distDir}'):
        for file in files:
            if file.endswith('.zip'): continue
            fp = os.path.join(root, file)
            zipf.write(fp, os.path.relpath(fp, '${distDir}'))
"`);
  console.log('Created zip at', publicZipPath);

  fs.copyFileSync(publicZipPath, distZipPath);
  console.log('Synced zip to', distZipPath);
} catch (e) {
  console.error('Failed to create zip', e);
  process.exit(1);
}
