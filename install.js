#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // run validation first
  execSync('node bin/validate-encryption-setup.js', { stdio: 'inherit' });
  
  // initialize archive
  execSync('node bin/init-archive.js', { stdio: 'inherit' });
  
  // install git hooks
  execSync('cp git-hooks/* .git/hooks/', { stdio: 'inherit' });
  execSync('chmod +x .git/hooks/*', { stdio: 'inherit' });
  
  console.log('installation complete!');
} catch (error) {
  console.error(`installation failed: ${error.message}`);
  process.exit(1);
} 