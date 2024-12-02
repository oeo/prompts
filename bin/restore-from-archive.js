#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync, mkdirSync, readdirSync } = require('fs')
const path = require('path')

// ensure directories exist
const privateDir = path.join(process.cwd(), 'private')
const archiveDir = path.join(process.cwd(), '.archives')

if (!existsSync(privateDir)) {
  mkdirSync(privateDir, { recursive: true })
}

if (!existsSync(archiveDir)) {
  console.error('no archives directory found')
  process.exit(1)
}

// find latest archive
const archives = readdirSync(archiveDir)
  .filter(f => f.endsWith('.tar.gpg'))
  .map(f => ({
    name: f,
    timestamp: parseInt(f.split('.')[0])
  }))
  .sort((a, b) => b.timestamp - a.timestamp) // sort by timestamp descending

if (archives.length === 0) {
  console.log('no archives found')
  process.exit(0)
}

const latestArchive = path.join(archiveDir, archives[0].name)
const tempTar = path.join(archiveDir, 'temp.tar')

try {
  // decrypt archive
  const keyId = process.env.GPG_KEY_ID
  const keyOption = keyId ? `--local-user ${keyId}` : ''
  execSync(`gpg --yes ${keyOption} -d -o "${tempTar}" "${latestArchive}"`)

  // clear private directory without warning
  execSync(`rm -rf "${privateDir}"/*`)

  // extract archive
  execSync(`tar -xf "${tempTar}" -C "${privateDir}"`)

  console.log(`restored from archive: ${latestArchive}`)
} catch (error) {
  console.error(`failed to restore archive: ${error.message}`)
  process.exit(1)
} finally {
  // cleanup
  if (existsSync(tempTar)) {
    execSync(`rm "${tempTar}"`)
  }
} 