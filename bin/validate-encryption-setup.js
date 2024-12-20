#!/usr/bin/env node

import { config } from 'dotenv'
import { execSync } from 'child_process'
import { existsSync, statSync, lstatSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
config()

function log(message) {
  console.log(message)
}

function checkDirs() {
  const privateDir = path.join(process.cwd(), process.env.WARD_PRIVATE_FOLDER || 'private')
  const archiveDir = path.join(process.cwd(), process.env.WARD_ARCHIVE_FOLDER || '.archives')

  // check/create private directory
  if (!existsSync(privateDir)) {
    try {
      log('creating private directory...')
      mkdirSync(privateDir, { recursive: true })
    } catch (error) {
      log(`error: failed to create private directory: ${error.message}`)
      process.exit(1)
    }
  }

  // check/create archives directory
  if (!existsSync(archiveDir)) {
    try {
      log('creating archives directory...')
      mkdirSync(archiveDir, { recursive: true })
    } catch (error) {
      log(`error: failed to create archives directory: ${error.message}`)
      process.exit(1)
    }
  }
}

function checkEnv() {
  // No need to check for WARD_GPG_RECIPIENTS anymore
  // Just check if we have any GPG keys available
  try {
    execSync('gpg --list-secret-keys', { encoding: 'utf8' })
  } catch (error) {
    log('error: no GPG keys found')
    log('hint: you need at least one GPG key pair for encryption/decryption')
    process.exit(1)
  }
}

function checkGpg() {
  try {
    const output = execSync('gpg --list-secret-keys', { encoding: 'utf8' })
    const keyId = process.env.WARD_GPG_KEY
    const recipients = process.env.WARD_GPG_RECIPIENTS?.split(',').map(r => r.trim()) || []
    
    // If using specific key, validate it exists
    if (keyId && !output.includes(keyId)) {
      log(`error: specified WARD_GPG_KEY ${keyId} not found in secret keys`)
      process.exit(1)
    }

    // If using recipients, validate they exist
    for (const recipient of recipients) {
      if (!output.includes(recipient)) {
        log(`error: GPG key for "${recipient}" not found`)
        process.exit(1)
      }
    }

    // test encryption/decryption with archive
    const testDir = path.join(process.cwd(), '.test-archive')
    const testFile = path.join(testDir, 'test.txt')
    const testTar = path.join(testDir, 'test.tar')
    const testEncrypted = `${testTar}.gpg`
    
    try {
      // create test directory and file
      mkdirSync(testDir, { recursive: true })
      execSync(`echo "test" > "${testFile}"`)

      // create test archive
      execSync(`tar -cf "${testTar}" -C "${testDir}" test.txt`)

      // build recipient args
      const recipientArgs = recipients.map(r => `-r ${r}`).join(' ')
      
      // test encryption
      const encryptCmd = keyId 
        ? `gpg --yes --trust-model always --local-user ${keyId} ${recipientArgs} -e -o "${testEncrypted}" "${testTar}"`
        : `gpg --yes --trust-model always ${recipientArgs} -e -o "${testEncrypted}" "${testTar}"`
      
      execSync(encryptCmd)

      // test decryption
      const decryptCmd = keyId
        ? `gpg --yes --local-user ${keyId} -d -o /dev/null "${testEncrypted}"`
        : `gpg --yes -d -o /dev/null "${testEncrypted}"`
      
      execSync(decryptCmd)
    } finally {
      // cleanup test directory
      execSync(`rm -rf "${testDir}"`)
    }
  } catch (error) {
    log(`error: GPG test failed: ${error.message}`)
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
    'bin/create-encrypted-archive.js',
    'bin/restore-from-archive.js'
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
  const privateDir = process.env.WARD_PRIVATE_FOLDER || 'private'
  const archiveDir = process.env.WARD_ARCHIVE_FOLDER || '.archives'
  
  const required = [
    `${privateDir}/*`,
    `${archiveDir}/temp.tar`,
    `!${archiveDir}/*.tar.gpg`
  ]

  for (const rule of required) {
    if (!content.includes(rule)) {
      log(`error: .gitignore missing rule: ${rule}`)
      process.exit(1)
    }
  }
}

// Run all checks
log('checking directories...')
checkDirs()

log('checking environment...')
checkEnv()

log('checking GPG setup...')
checkGpg()

log('checking git hooks...')
checkHooks()

log('checking required scripts...')
checkScripts()

log('checking .gitignore configuration...')
checkGitignore()

log('all checks passed!') 