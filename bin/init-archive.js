#!/usr/bin/env node

import { config } from 'dotenv'
import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
config()

// ensure directories exist
const privateDir = path.join(process.cwd(), process.env.WARD_PRIVATE_FOLDER || 'private')
const archiveDir = path.join(process.cwd(), process.env.WARD_ARCHIVE_FOLDER || '.archives')

if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}
if (!existsSync(archiveDir)) {
  mkdirSync(archiveDir, { recursive: true })
}

// create initial archive if none exists
const archives = execSync(`ls -1 ${archiveDir}/*.tar.gpg 2>/dev/null || true`, { encoding: 'utf8' })
if (!archives.trim()) {
  console.log('creating initial empty archive...')
  
  // create timestamp for archive name
  const now = new Date()
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')  // Replace colons and dots with hyphens
    .replace('T', '_')      // Replace T with underscore
    .split('.')[0]          // Remove milliseconds

  const tarFile = path.join(archiveDir, `${timestamp}.tar`)
  const encryptedFile = path.join(archiveDir, `${timestamp}.tar.gpg`)

  try {
    // create empty tarball
    execSync(`tar -cf "${tarFile}" -C "${privateDir}" . || true`)

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

    // stage encrypted archive using relative path
    const relativeArchivePath = path.relative(process.cwd(), encryptedFile)
    execSync(`git add "${relativeArchivePath}"`)

    console.log(`created initial archive: ${encryptedFile}`)
  } catch (error) {
    console.error(`failed to create initial archive: ${error.message}`)
    process.exit(1)
  }
} 