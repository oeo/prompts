#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, readdirSync, unlinkSync } = require('fs');
const path = require('path');

// remove any .gpg files that have corresponding .md files
const privateDir = path.join(process.cwd(), 'private');

if (existsSync(privateDir)) {
  const files = readdirSync(privateDir);
  
  for (const file of files) {
    if (file.endsWith('.md.gpg')) {
      const mdFile = path.join(privateDir, file.replace('.gpg', ''));
      const gpgFile = path.join(privateDir, file);
      
      if (existsSync(mdFile)) {
        try {
          unlinkSync(gpgFile);
          console.log(`removed ${gpgFile}`);
        } catch (error) {
          console.error(`failed to remove ${gpgFile}: ${error.message}`);
        }
      }
    }
  }
} 