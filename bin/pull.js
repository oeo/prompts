#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function log(message) {
  console.log(`\x1b[36m${message}\x1b[0m`)
}

function cmd(command, showOutput = false) {
  log(`\n> ${command}`)
  const output = execSync(command, { encoding: 'utf8', stdio: showOutput ? 'inherit' : ['inherit', 'pipe', 'pipe'] })
  return output
}

try {
  // check if we have any staged changes
  const status = cmd('git status --porcelain')
  if (status.trim()) {
    log('\nStashing changes before pull...')
    cmd('git stash')
  }

  // pull latest changes
  log('\nPulling latest changes...')
  cmd('git pull --rebase', true)

  // always restore from latest archive, even if no git changes
  log('\nRestoring from latest archive...')
  const privateDir = process.env.WARD_PRIVATE_FOLDER || 'private'
  cmd(`rm -rf ${privateDir}`)
  cmd(`mkdir -p ${privateDir}`)
  cmd('node bin/restore-from-archive.js', true)

  // pop stash if we stashed
  if (status.trim()) {
    log('\nRestoring stashed changes...')
    cmd('git stash pop')
  }

  log('\nPull and restore completed successfully!')
} catch (error) {
  console.error(`\n\x1b[31mError: ${error.message}\x1b[0m`)
  process.exit(1)
} 