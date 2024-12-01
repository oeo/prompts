#!/usr/bin/env coffee

{ log } = require 'console'
{ exit } = require 'process'

{ execSync } = require 'child_process'
{ existsSync, readdirSync, statSync, unlinkSync } = require 'fs'
path = require 'path'

walk_dir = (dir) ->
  results = []
  list = readdirSync dir
  
  for file in list
    file = path.resolve dir, file
    stat = statSync file
    
    if stat?.isDirectory()
      results = results.concat walk_dir file
    else if file.endsWith '.md.gpg'
      results.push file
      
  results

private_dir = path.resolve __dirname, '../private'
unless existsSync private_dir
  log 'private directory not found'
  exit 1

encrypted_files = walk_dir private_dir
for file in encrypted_files
  decrypted_file = file.replace '.gpg', ''
  
  try
    unless existsSync decrypted_file
      execSync "#{__dirname}/decrypt-file.coffee #{file}", { stdio: 'inherit' }
    unlinkSync file
  catch error
    log "failed to process #{file}: #{error.message}"
    exit 1 