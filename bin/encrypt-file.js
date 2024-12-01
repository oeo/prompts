#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const fs = require('fs')

function encryptFile(inputFile, outputFile) {
  const recipients = process.env.GPG_RECIPIENTS
  const keyId = process.env.GPG_KEY_ID
  
  if (!recipients) {
    throw new Error('GPG_RECIPIENTS not set in .env')
  }

  // build recipient arguments for each recipient
  const recipientArgs = recipients.split(',')
    .map(r => `-r ${r.trim()}`)
    .join(' ')

  // build gpg command with optional key id and multiple recipients
  const keyOption = keyId ? `--local-user ${keyId}` : ''
  const command = `gpg --yes --trust-model always ${keyOption} ${recipientArgs} -e -o "${outputFile}" "${inputFile}"`

  try {
    execSync(command)
    return true
  } catch (error) {
    console.error(`encryption failed: ${error.message}`)
    return false
  }
}

// Add command-line handling
if (require.main === module) {
  const inputFile = process.argv[2]
  const outputFile = process.argv[3]

  if (!inputFile || !outputFile) {
    console.error('usage: encrypt-file.js <input_file> <output_file>')
    process.exit(1)
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`input file not found: ${inputFile}`)
    process.exit(1)
  }

  const success = encryptFile(inputFile, outputFile)
  process.exit(success ? 0 : 1)
}

module.exports = encryptFile 