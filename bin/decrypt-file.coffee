#!/usr/bin/env coffee

{ log } = require 'console'
{ exit } = require 'process'

{ execSync } = require 'child_process'
{ existsSync } = require 'fs'
path = require 'path'

file_path = process.argv[2]

unless file_path
  log 'usage: decrypt-file.coffee <file_path>'
  exit 1

unless existsSync file_path
  log "file not found: #{file_path}"
  exit 1

unless file_path.endsWith '.md.gpg'
  log 'only encrypted markdown files can be decrypted'
  exit 1

decrypted_path = file_path.replace '.gpg', ''
if existsSync decrypted_path
  log "decrypted file already exists: #{decrypted_path}"
  exit 1

try
  execSync "gpg --yes --batch --output #{decrypted_path} --decrypt #{file_path}", { stdio: 'inherit' }
  log "decrypted #{file_path} to #{decrypted_path}"
catch error
  log "decryption failed: #{error.message}"
  exit 1 