#!/usr/bin/env node

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import path from 'path';

try {
  // install dependencies
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // run validation
  console.log('Validating setup...');
  execSync('node bin/validate-encryption-setup.js', { stdio: 'inherit' });

  // initialize archive
  console.log('Initializing archive...');
  execSync('node bin/init-archive.js', { stdio: 'inherit' });

  // install git hooks
  console.log('Installing git hooks...');
  const hookFiles = readdirSync('git-hooks');
  for (const file of hookFiles) {
    if (file.endsWith('.example')) {
      const hookName = file.replace('.example', '');
      execSync(`mv git-hooks/${file} .git/hooks/${hookName}`, { stdio: 'inherit' });
    }
  }

  execSync('chmod +x .git/hooks/*', { stdio: 'inherit' });

  // create symlink to bin script
  console.log('Creating symlink to bin script...');
  execSync(`ln -s ${path.resolve('./bin/cli.js')} ${path.resolve('./cli')}`, { stdio: 'inherit' });

  console.log('Installation complete!');
} catch (error) {
  console.error(`Installation failed: ${error.message}`);
  process.exit(1);
}
