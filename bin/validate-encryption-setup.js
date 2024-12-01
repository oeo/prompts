#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const { existsSync, statSync, lstatSync } = require('fs')
const path = require('path')

function log(message) {
  console.log(message)
}

function checkEnv() {
  if (!process.env.GPG_RECIPIENTS) {
    log('error: GPG_RECIPIENTS not set in .env file')
    log('hint: copy .env.example to .env and set your GPG recipients (comma-separated)')
    process.exit(1)
  }
}

function checkGpg() {
  try {
    const output = execSync('gpg --list-secret-keys', { encoding: 'utf8' })
    const recipients = process.env.GPG_RECIPIENTS.split(',').map(r => r.trim())
    const keyId = process.env.GPG_KEY_ID
    
    // check all recipients exist
    for (const recipient of recipients) {
      if (!output.includes(recipient)) {
        log(`error: GPG key for "${recipient}" not found`)
        process.exit(1)
      }
    }

    // if key id specified, validate it exists
    if (keyId && !output.includes(keyId)) {
      log(`error: specified GPG_KEY_ID ${keyId} not found in secret keys`)
      process.exit(1)
    }

    // test encryption/decryption
    const testFile = '.encryption-test'
    const testEncrypted = `${testFile}.gpg`
    
    try {
      // create test file
      execSync(`echo "test" > ${testFile}`)

      // build recipient args
      const recipientArgs = recipients.map(r => `-r ${r}`).join(' ')
      
      // test encryption
      const encryptCmd = keyId 
        ? `gpg --yes --trust-model always --local-user ${keyId} ${recipientArgs} -e -o ${testEncrypted} ${testFile}`
        : `gpg --yes --trust-model always ${recipientArgs} -e -o ${testEncrypted} ${testFile}`
      
      execSync(encryptCmd)

      // test decryption
      const decryptCmd = keyId
        ? `gpg --yes --local-user ${keyId} -d -o /dev/null ${testEncrypted}`
        : `gpg --yes -d -o /dev/null ${testEncrypted}`
      
      execSync(decryptCmd)
    } finally {
      // cleanup
      execSync(`rm -f ${testFile} ${testEncrypted}`)
    }
  } catch (error) {
    log('error: GPG is not properly installed or configured')
    log(`details: ${error.message}`)
    process.exit(1)
  }
}

function checkStagedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    for (const file of staged.split('\n')) {
      if (file.startsWith('private/') && file.endsWith('.md') && !file.endsWith('.md.gpg')) {
        log(`error: attempting to commit unencrypted markdown file: ${file}`)
        log(`hint: remove it from staging with: git reset HEAD ${file}`)
        process.exit(1)
      }
    }
  } catch (error) {
    log('error: failed to check staged files')
    process.exit(1)
  }
}

function checkHooks() {
  const requiredHooks = [
    '.git/hooks/pre-commit',
    '.git/hooks/post-merge',
    '.git/hooks/post-checkout',
    '.git/hooks/post-rewrite',
    '.git/hooks/post-push'
  ]

  for (const hook of requiredHooks) {
    if (!existsSync(hook)) {
      log(`error: missing git hook: ${hook}`)
      process.exit(1)
    }

    if (!lstatSync(hook).isSymbolicLink() && (statSync(hook).mode & 0o111) === 0) {
      log(`error: git hook is not executable: ${hook}`)
      process.exit(1)
    }
  }
}

function checkScripts() {
  const requiredScripts = [
    'bin/encrypt-file.js',
    'bin/decrypt-file.js',
    'bin/pre-commit-encrypt.js',
    'bin/cleanup-private-dir.js'
  ]

  for (const script of requiredScripts) {
    if (!existsSync(script)) {
      log(`error: missing script: ${script}`)
      process.exit(1)
    }

    if ((statSync(script).mode & 0o111) === 0) {
      log(`error: script is not executable: ${script}`)
      process.exit(1)
    }
  }
}

function checkGitignore() {
  if (!existsSync('.gitignore')) {
    log('error: .gitignore file is missing')
    process.exit(1)
  }

  const content = execSync('cat .gitignore', { encoding: 'utf8' })
  if (!content.includes('private/**/*.md')) {
    log('error: .gitignore missing rule for unencrypted markdown files')
    process.exit(1)
  }

  if (!content.includes('!private/**/*.md.gpg')) {
    log('error: .gitignore missing exception for encrypted files')
    process.exit(1)
  }
}

// Run all checks
log('checking environment...')
checkEnv()

log('checking GPG setup...')
checkGpg()

log('checking staged files...')
checkStagedFiles()

log('checking git hooks...')
checkHooks()

log('checking required scripts...')
checkScripts()

log('checking .gitignore configuration...')
checkGitignore()

log('all checks passed!') 