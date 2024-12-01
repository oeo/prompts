#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync, readdirSync, unlinkSync, mkdirSync } = require('fs')
const path = require('path')
const minimatch = require('minimatch')

// get patterns from env or default to all files
const patterns = (process.env.ENCRYPT_PATTERNS || '*')
  .split(',')
  .map(p => p.trim())

// ensure private directory exists
const privateDir = path.join(process.cwd(), 'private')
if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}

// remove any .gpg files that have corresponding source files
const files = readdirSync(privateDir)

for (const file of files) {
  if (file.endsWith('.gpg')) {
    const sourceFile = path.join(privateDir, file.replace('.gpg', ''))
    const gpgFile = path.join(privateDir, file)
    const filename = path.basename(sourceFile)
    
    // check if source file exists and matches patterns
    if (existsSync(sourceFile) && patterns.some(pattern => minimatch(filename, pattern))) {
      try {
        unlinkSync(gpgFile)
        console.log(`removed ${gpgFile}`)
      } catch (error) {
        console.error(`failed to remove ${gpgFile}: ${error.message}`)
      }
    }
  }
} 