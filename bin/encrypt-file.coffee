#!/usr/bin/env coffee

{ log } = require 'console'
{ exit } = require 'process'

{ execSync } = require 'child_process'
{ existsSync } = require 'fs'
path = require 'path'

gpg_recipient = 'taky'
file_path = process.argv[2]

unless file_path
  log 'usage: encrypt-file.coffee <file_path>'
  exit 1

unless existsSync file_path
  log "file not found: #{file_path}"
  exit 1

unless file_path.endsWith '.md'
  log 'only markdown files can be encrypted'
  exit 1

encrypted_path = "#{file_path}.gpg"
if existsSync encrypted_path
  log "encrypted file already exists: #{encrypted_path}"
  exit 1

try
  execSync "gpg --yes --batch --recipient #{gpg_recipient} --output #{encrypted_path} --encrypt #{file_path}", { stdio: 'inherit' }
  log "encrypted #{file_path} to #{encrypted_path}"
catch error
  log "encryption failed: #{error.message}"
  exit 1 