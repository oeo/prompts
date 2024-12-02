#!/usr/bin/env node

import { config } from 'dotenv'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import path from 'path'
import { minimatch } from 'minimatch'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
config()

// ensure directories exist
const privateDir = path.join(process.cwd(), 'private')
const archiveDir = path.join(process.cwd(), '.archives')

if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}
if (!existsSync(archiveDir)) {
  mkdirSync(archiveDir, { recursive: true })
}

// read .encignore if it exists
const encignoreFile = path.join(process.cwd(), '.encignore')
const encignorePatterns = existsSync(encignoreFile)
  ? readFileSync(encignoreFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
  : []

// create timestamp for archive name
const now = new Date()
const timestamp = now.toISOString()
  .replace(/[:.]/g, '-')  // Replace colons and dots with hyphens
  .replace('T', '_')      // Replace T with underscore
  .split('.')[0]          // Remove milliseconds

const tarFile = path.join(archiveDir, `${timestamp}.tar`)
const encryptedFile = path.join(archiveDir, `${timestamp}.tar.gpg`)

try {
  // create list of files to exclude
  const excludeFile = path.join(archiveDir, `${timestamp}.exclude`)
  if (encignorePatterns.length > 0) {
    // write patterns to exclude file
    const excludeContent = encignorePatterns.join('\n')
    execSync(`echo "${excludeContent}" > "${excludeFile}"`)
  }

  // create tarball with exclusions
  const excludeArg = encignorePatterns.length > 0 ? `--exclude-from="${excludeFile}"` : ''
  execSync(`tar -cf "${tarFile}" ${excludeArg} -C "${privateDir}" .`)

  // cleanup exclude file
  if (existsSync(excludeFile)) {
    execSync(`rm "${excludeFile}"`)
  }

  // Build encryption command
  const keyId = process.env.WARD_GPG_KEY
  const recipients = process.env.WARD_GPG_RECIPIENTS
  
  let recipientArgs = ''
  if (recipients) {
    // If recipients specified, encrypt for all of them
    recipientArgs = recipients.split(',')
      .map(r => `-r ${r.trim()}`)
      .join(' ')
  } else if (keyId) {
    // If only key specified, encrypt just for that key
    recipientArgs = `-r ${keyId}`
  }
  // If neither specified, GPG will use default key

  const keyOption = keyId ? `--local-user ${keyId}` : ''
  const encryptCmd = `gpg --yes --trust-model always ${keyOption} ${recipientArgs} -e -o "${encryptedFile}" "${tarFile}"`

  // encrypt tarball
  execSync(encryptCmd)

  // cleanup tar file
  execSync(`rm "${tarFile}"`)

  // stage encrypted archive
  execSync(`git add "${encryptedFile}"`)

  console.log(`created encrypted archive: ${encryptedFile}`)
} catch (error) {
  console.error(`failed to create archive: ${error.message}`)
  process.exit(1)
} 