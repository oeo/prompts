#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, readdirSync, statSync, unlinkSync } = require('fs');
const path = require('path');

function walkDir(dir) {
  const results = [];
  const list = readdirSync(dir);

  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = statSync(filePath);

    if (stat?.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.md.gpg')) {
      results.push(filePath);
    }
  }

  return results;
}

const privateDir = path.resolve(__dirname, '../private');
if (!existsSync(privateDir)) {
  console.log('private directory not found');
  process.exit(1);
}

const encryptedFiles = walkDir(privateDir);
for (const file of encryptedFiles) {
  const decryptedFile = file.replace('.gpg', '');

  try {
    if (!existsSync(decryptedFile)) {
      execSync(`${__dirname}/decrypt-file.js ${file}`, { stdio: 'inherit' });
    }
    unlinkSync(file);
  } catch (error) {
    console.log(`failed to process ${file}: ${error.message}`);
    process.exit(1);
  }
} 