#!/usr/bin/env node

require('dotenv').config()
const { execSync } = require('child_process')
const fs = require('fs')

function decryptFile(inputFile, outputFile) {
  const keyId = process.env.GPG_KEY_ID
  
  // build gpg command with optional key id
  const keyOption = keyId ? `--local-user ${keyId}` : ''
  const command = `gpg --yes --batch ${keyOption} -d -o "${outputFile}" "${inputFile}"`

  try {
    execSync(command)
    return true
  } catch (error) {
    console.error(`decryption failed: ${error.message}`)
    return false
  }
}

module.exports = decryptFile 