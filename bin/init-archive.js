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
const privateDir = path.join(process.cwd(), 'private')
const archiveDir = path.join(process.cwd(), '.archives')

if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}
if (!existsSync(archiveDir)) {
  mkdirSync(archiveDir, { recursive: true })
}

// create initial archive if none exists
const archives = execSync('ls -1 .archives/*.tar.gpg 2>/dev/null || true', { encoding: 'utf8' })
if (!archives.trim()) {
  console.log('creating initial empty archive...')
  
  // create timestamp for archive name
  const timestamp = Math.floor(Date.now() / 1000)

  const tarFile = path.join(archiveDir, `${timestamp}.tar`)
  const encryptedFile = path.join(archiveDir, `${timestamp}.tar.gpg`)

  try {
    // create empty tarball
    execSync(`tar -cf "${tarFile}" -C "${privateDir}" . || true`)

    // get recipients and key id
    const recipients = process.env.GPG_RECIPIENTS
    if (!recipients) {
      throw new Error('GPG_RECIPIENTS not set in .env')
    }

    // build recipient arguments
    const recipientArgs = recipients.split(',')
      .map(r => `-r ${r.trim()}`)
      .join(' ')

    // build encryption command
    const keyId = process.env.GPG_KEY_ID
    const keyOption = keyId ? `--local-user ${keyId}` : ''
    const encryptCmd = `gpg --yes --trust-model always ${keyOption} ${recipientArgs} -e -o "${encryptedFile}" "${tarFile}"`

    // encrypt tarball
    execSync(encryptCmd)

    // cleanup tar file
    execSync(`rm "${tarFile}"`)

    // stage encrypted archive
    execSync(`git add "${encryptedFile}"`)

    console.log(`created initial archive: ${encryptedFile}`)
  } catch (error) {
    console.error(`failed to create initial archive: ${error.message}`)
    process.exit(1)
  }
} 