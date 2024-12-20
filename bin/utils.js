#!/usr/bin/env node

const { execSync } = require('child_process')
const { existsSync, mkdirSync } = require('fs')
const path = require('path')

// common paths
const PRIVATE_DIR = path.join(process.cwd(), process.env.WARD_PRIVATE_FOLDER || 'private')
const ARCHIVE_DIR = path.join(process.cwd(), process.env.WARD_ARCHIVE_FOLDER || '.archives')

function ensureDirectories() {
  if (!existsSync(PRIVATE_DIR)) {
    mkdirSync(PRIVATE_DIR, { recursive: true })
  }
  if (!existsSync(ARCHIVE_DIR)) {
    mkdirSync(ARCHIVE_DIR, { recursive: true })
  }
}

function createArchive(message) {
  ensureDirectories()

  // create timestamp for archive name
  const timestamp = Math.floor(Date.now() / 1000)

  const tarFile = path.join(ARCHIVE_DIR, `${timestamp}.tar`)
  const encryptedFile = path.join(ARCHIVE_DIR, `${timestamp}.tar.gpg`)

  try {
    // create tarball
    execSync(`tar -cf "${tarFile}" -C "${PRIVATE_DIR}" .`)

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

    console.log(message || `created encrypted archive: ${encryptedFile}`)
    return true
  } catch (error) {
    console.error(`failed to create archive: ${error.message}`)
    return false
  }
}

function restoreFromArchive() {
  ensureDirectories()

  // find latest archive
  const archives = execSync(`ls -1 ${ARCHIVE_DIR}/*.tar.gpg 2>/dev/null || true`, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .sort()
    .reverse()

  if (archives.length === 0) {
    console.log('no archives found')
    return true
  }

  const latestArchive = archives[0]
  const tempTar = path.join(ARCHIVE_DIR, 'temp.tar')

  try {
    // decrypt archive
    const keyId = process.env.WARD_GPG_KEY
    const keyOption = keyId ? `--local-user ${keyId}` : ''
    execSync(`gpg --yes ${keyOption} -d -o "${tempTar}" "${latestArchive}"`)

    // clear private directory without warning
    execSync(`rm -rf "${PRIVATE_DIR}"/*`)

    // extract archive
    execSync(`tar -xf "${tempTar}" -C "${PRIVATE_DIR}"`)

    console.log(`restored from archive: ${latestArchive}`)
    return true
  } catch (error) {
    console.error(`failed to restore archive: ${error.message}`)
    return false
  } finally {
    // cleanup
    if (existsSync(tempTar)) {
      execSync(`rm "${tempTar}"`)
    }
  }
}

module.exports = {
  PRIVATE_DIR,
  ARCHIVE_DIR,
  ensureDirectories,
  createArchive,
  restoreFromArchive
} 