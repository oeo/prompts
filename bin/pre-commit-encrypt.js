#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync } = require('fs')
const path = require('path')
const encryptFile = require('./encrypt-file')

// get all staged markdown files in private/
const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n')
  .filter(file => file.startsWith('private/') && file.endsWith('.md') && !file.endsWith('.md.gpg'))

for (const file of stagedFiles) {
  const encryptedFile = `${file}.gpg`
  
  try {
    // encrypt the file
    if (!encryptFile(file, encryptedFile)) {
      console.error(`failed to encrypt ${file}`)
      process.exit(1)
    }

    // unstage original file
    execSync(`git reset HEAD "${file}"`)
    
    // add encrypted file
    if (existsSync(encryptedFile)) {
      execSync(`git add "${encryptedFile}"`)
    } else {
      console.error(`encrypted file not found: ${encryptedFile}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(`failed to process ${file}: ${error.message}`)
    process.exit(1)
  }
} 