#!/usr/bin/env node

import { config } from 'dotenv'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync } from 'fs'
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
  console.error('no archives directory found')
  process.exit(1)
}

function parseArchiveDate(filename) {
  try {
    if (filename.includes('_')) {
      // Parse ISO format (2024-12-02_00-49-38-434Z)
      const [datePart, timePart] = filename.split('_')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute, second] = timePart.split(/[-Z]/g).filter(Boolean).map(Number)
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    } else {
      // Parse Unix timestamp
      return new Date(parseInt(filename) * 1000)
    }
  } catch (e) {
    console.error('Error parsing date:', e)
    return new Date(0) // Return epoch for invalid dates
  }
}

// find latest archive
const archives = readdirSync(archiveDir)
  .filter(f => f.endsWith('.tar.gpg'))
  .map(f => {
    const date = parseArchiveDate(f.split('.')[0])
    return {
      name: f,
      timestamp: Math.floor(date.getTime() / 1000)
    }
  })
  .sort((a, b) => b.timestamp - a.timestamp) // sort by timestamp descending

if (archives.length === 0) {
  console.log('no archives found')
  process.exit(0)
}

const latestArchive = path.join(archiveDir, archives[0].name)
const tempTar = path.join(archiveDir, 'temp.tar')

try {
  // decrypt archive
  const keyId = process.env.WARD_GPG_KEY
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