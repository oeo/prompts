#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, copyFileSync, chmodSync, writeFileSync } = require('fs');
const path = require('path');

function exec(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function copyAndMakeExecutable(source, dest) {
  console.log(`Installing: ${dest}`);
  copyFileSync(source, dest);
  chmodSync(dest, '755');
}

// Check prerequisites
try {
  exec('node --version');
  exec('gpg --version');
  exec('git --version');
} catch (error) {
  console.error('Error: Missing prerequisites. Please install Node.js, GPG, and Git');
  process.exit(1);
}

// Install npm dependencies
if (!existsSync('node_modules')) {
  console.log('Installing dependencies...');
  exec('npm install');
}

// Create private directory if it doesn't exist
if (!existsSync('private')) {
  console.log('Creating private directory...');
  exec('mkdir -p private');
}

// Create .env if it doesn't exist
if (!existsSync('.env')) {
  console.log('Creating .env file...');
  if (existsSync('.env.example')) {
    copyFileSync('.env.example', '.env');
    console.log('Please edit .env and set your GPG_RECIPIENT');
  } else {
    writeFileSync('.env', 'GPG_RECIPIENT=your.email@example.com\n');
    console.log('Please edit .env and set your GPG_RECIPIENT');
  }
}

// Make scripts executable
console.log('Making scripts executable...');
exec('chmod +x bin/*.js');

// Install Git hooks
console.log('Installing Git hooks...');
const hooks = [
  ['pre-commit', 'pre-commit'],
  ['post-merge', 'post-merge'],
  ['post-checkout', 'post-checkout'],
  ['post-rewrite', 'post-rewrite'],
  ['post-push', 'post-push']
];

for (const [source, dest] of hooks) {
  copyAndMakeExecutable(
    path.join('git-hooks', `${source}.example`),
    path.join('.git', 'hooks', dest)
  );
}

// Create post-pull symlink
console.log('Creating post-pull symlink...');
const postPullPath = path.join('.git', 'hooks', 'post-pull');
if (existsSync(postPullPath)) {
  exec(`rm ${postPullPath}`);
}
exec('ln -sf post-merge .git/hooks/post-pull');

// Verify setup
console.log('\nVerifying setup...');
exec('node bin/validate-encryption-setup.js');

console.log('\nInstallation complete! Your encrypted markdown repository is ready to use.');
console.log('Remember to edit .env and set your GPG_RECIPIENT if you haven\'t already.'); 