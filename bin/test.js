#!/usr/bin/env node

const { execSync } = require('child_process')
const { existsSync } = require('fs')
const path = require('path')

function log(message) {
  console.log(message)
}

function checkPrerequisites() {
  try {
    // Check Node.js
    const nodeVersion = execSync('node --version', { encoding: 'utf8' })
    log(`✓ Node.js ${nodeVersion.trim()}`)

    // Check GPG
    const gpgVersion = execSync('gpg --version | head -n1', { encoding: 'utf8' })
    log(`✓ ${gpgVersion.trim()}`)

    // Check Git
    const gitVersion = execSync('git --version', { encoding: 'utf8' })
    log(`✓ ${gitVersion.trim()}`)

    // Check npm and required packages
    const packages = ['dotenv', 'minimatch']
    for (const pkg of packages) {
      try {
        require(pkg)
        log(`✓ ${pkg} installed`)
      } catch {
        throw new Error(`Missing required package: ${pkg}`)
      }
    }

    // Check required directories
    const dirs = ['private', '.archives', 'bin', 'git-hooks']
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        throw new Error(`Missing required directory: ${dir}`)
      }
      log(`✓ ${dir} directory exists`)
    }

    // Check required scripts
    const scripts = [
      'bin/create-encrypted-archive.js',
      'bin/restore-from-archive.js',
      'bin/init-archive.js',
      'bin/validate-encryption-setup.js',
      'bin/utils.js',
      'bin/test.js'
    ]
    for (const script of scripts) {
      if (!existsSync(script)) {
        throw new Error(`Missing required script: ${script}`)
      }
      log(`✓ ${script} exists`)
    }

    // Check git hooks
    const hooks = [
      'pre-commit',
      'post-merge',
      'post-checkout',
      'post-rewrite',
      'post-push'
    ]
    for (const hook of hooks) {
      const hookPath = `.git/hooks/${hook}`
      if (!existsSync(hookPath)) {
        throw new Error(`Missing git hook: ${hook}`)
      }
      log(`✓ ${hook} hook installed`)
    }

    // Check .env configuration
    require('dotenv').config()
    if (!process.env.GPG_RECIPIENTS) {
      throw new Error('GPG_RECIPIENTS not set in .env')
    }
    log('✓ .env configured')

    // Try to list GPG keys
    try {
      execSync('gpg --list-keys', { stdio: 'pipe' })
      log('✓ GPG keys available')
    } catch {
      throw new Error('No GPG keys found')
    }

    log('\nAll prerequisites met! Repository is ready to use.')
    return true
  } catch (error) {
    log(`\n❌ Error: ${error.message}`)
    return false
  }
}

// Run checks if called directly
if (require.main === module) {
  process.exit(checkPrerequisites() ? 0 : 1)
}

module.exports = checkPrerequisites
