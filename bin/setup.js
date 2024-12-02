#!/usr/bin/env node

import { execSync } from 'child_process'
import { readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

try {
  // install dependencies
  console.log('Installing dependencies...')
  execSync('npm install', { stdio: 'inherit' })

  // run validation
  console.log('Validating setup...')
  execSync('node bin/validate-encryption-setup.js', { stdio: 'inherit' })

  // initialize archive
  console.log('Initializing archive...')
  execSync('node bin/init-archive.js', { stdio: 'inherit' })

  // install git hooks
  console.log('Installing git hooks...')
  const hookFiles = readdirSync(path.join(process.cwd(), 'git-hooks'))
  for (const file of hookFiles) {
    if (file.endsWith('.example')) {
      const hookName = file.replace('.example', '')
      execSync(`mv git-hooks/${file} .git/hooks/${hookName}`, { stdio: 'inherit' })
    }
  }
  execSync('chmod +x .git/hooks/*', { stdio: 'inherit' })

  // Need to add: ensure .gitignore has correct paths
  const privateDir = process.env.WARD_PRIVATE_FOLDER || 'private'
  const archiveDir = process.env.WARD_ARCHIVE_FOLDER || '.archives'
  
  // Update .gitignore with correct paths
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  let gitignoreContent = ''
  try {
    gitignoreContent = readFileSync(gitignorePath, 'utf8')
  } catch (e) {
    // File doesn't exist, that's fine
  }

  const lines = gitignoreContent.split('\n')
  let updated = false

  // Add private directory
  if (!lines.some(line => line.trim() === privateDir)) {
    gitignoreContent += `\n${privateDir}`
    updated = true
  }

  // Add temp.tar in archive directory
  if (!lines.some(line => line.trim() === `${archiveDir}/temp.tar`)) {
    gitignoreContent += `\n${archiveDir}/temp.tar`
    updated = true
  }

  // Make sure we don't ignore .tar.gpg files
  if (!lines.some(line => line.trim() === `!${archiveDir}/*.tar.gpg`)) {
    gitignoreContent += `\n!${archiveDir}/*.tar.gpg`
    updated = true
  }

  if (updated) {
    writeFileSync(gitignorePath, gitignoreContent.trim() + '\n')
  }

  console.log('Installation complete!')
} catch (error) {
  console.error(`Installation failed: ${error.message}`)
  process.exit(1)
}
