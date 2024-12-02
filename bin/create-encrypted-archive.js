#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync, mkdirSync, readFileSync } = require('fs')
const path = require('path')
const { minimatch } = require('minimatch')

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
const timestamp = Math.floor(Date.now() / 1000)

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