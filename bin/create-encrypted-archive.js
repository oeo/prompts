#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync, mkdirSync } = require('fs')
const path = require('path')

// ensure directories exist
const privateDir = path.join(process.cwd(), 'private')
const archiveDir = path.join(process.cwd(), '.archives')

if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}
if (!existsSync(archiveDir)) {
  mkdirSync(archiveDir, { recursive: true })
}

// create timestamp for archive name
const timestamp = new Date().toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .replace('Z', '')

const tarFile = path.join(archiveDir, `${timestamp}.tar`)
const encryptedFile = path.join(archiveDir, `${timestamp}.tar.gpg`)

try {
  // create tarball
  execSync(`tar -cf "${tarFile}" -C "${privateDir}" .`)

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

  console.log(`created encrypted archive: ${encryptedFile}`)
} catch (error) {
  console.error(`failed to create archive: ${error.message}`)
  process.exit(1)
} 