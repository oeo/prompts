#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.log('usage: decrypt-file.js <file_path>');
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.log(`file not found: ${filePath}`);
  process.exit(1);
}

if (!filePath.endsWith('.md.gpg')) {
  console.log('only encrypted markdown files can be decrypted');
  process.exit(1);
}

const decryptedPath = filePath.replace('.gpg', '');
if (existsSync(decryptedPath)) {
  console.log(`decrypted file already exists: ${decryptedPath}`);
  process.exit(1);
}

try {
  execSync(
    `gpg --yes --batch --output ${decryptedPath} --decrypt ${filePath}`,
    { stdio: 'inherit' }
  );
  console.log(`decrypted ${filePath} to ${decryptedPath}`);
} catch (error) {
  console.log(`decryption failed: ${error.message}`);
  process.exit(1);
} 