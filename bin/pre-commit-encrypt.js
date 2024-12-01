#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync, mkdirSync } = require('fs')
const path = require('path')
const encryptFile = require('./encrypt-file')
const minimatch = require('minimatch')

// ensure private directory exists
const privateDir = path.join(process.cwd(), 'private')
if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}

// get patterns from env or default to all files
const patterns = (process.env.ENCRYPT_PATTERNS || '*')
  .split(',')
  .map(p => p.trim())

// get all staged files in private/
const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n')
  .filter(file => {
    if (!file.startsWith('private/') || file.endsWith('.gpg')) {
      return false
    }
    // check if file matches any pattern
    const filename = path.basename(file)
    return patterns.some(pattern => minimatch(filename, pattern))
  })

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