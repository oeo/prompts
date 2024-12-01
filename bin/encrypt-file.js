#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
require('dotenv/config');

const filePath = process.argv[2];

if (!filePath) {
  console.log('usage: encrypt-file.js <file_path>');
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.log(`file not found: ${filePath}`);
  process.exit(1);
}

if (!filePath.endsWith('.md')) {
  console.log('only markdown files can be encrypted');
  process.exit(1);
}

const encryptedPath = `${filePath}.gpg`;
if (existsSync(encryptedPath)) {
  console.log(`encrypted file already exists: ${encryptedPath}`);
  process.exit(1);
}

try {
  // Build recipient arguments for each recipient
  const recipients = process.env.GPG_RECIPIENTS.split(',').map(r => `--recipient ${r.trim()}`).join(' ');
  
  execSync(
    `gpg --batch --yes ${recipients} --output ${encryptedPath} --encrypt ${filePath}`,
    { stdio: 'inherit' }
  );
  console.log(`encrypted ${filePath} to ${encryptedPath}`);
} catch (error) {
  console.log(`encryption failed: ${error.message}`);
  process.exit(1);
} 