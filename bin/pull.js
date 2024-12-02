#!/usr/bin/env node

const { execSync } = require('child_process')
const { existsSync } = require('fs')
const path = require('path')

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

  // restore from latest archive
  log('\nRestoring from latest archive...')
  cmd('rm -rf private')
  cmd('mkdir -p private')
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