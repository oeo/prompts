#!/usr/bin/env coffee

{ log } = require 'console'
{ exit } = require 'process'

{ execSync } = require 'child_process'
{ existsSync, readdirSync, statSync } = require 'fs'
path = require 'path'

walk_dir = (dir) ->
  results = []
  list = readdirSync dir
  
  for file in list
    file = path.resolve dir, file
    stat = statSync file
    
    if stat?.isDirectory()
      results = results.concat walk_dir file
    else if file.endsWith('.md') and not existsSync("#{file}.gpg")
      results.push file
      
  results

private_dir = path.resolve __dirname, '../private'
unless existsSync private_dir
  log 'private directory not found'
  exit 1

markdown_files = walk_dir private_dir
for file in markdown_files
  encrypted_file = "#{file}.gpg"
  
  try
    execSync "#{__dirname}/encrypt-file.coffee #{file}", { stdio: 'inherit' }
    execSync "git add #{encrypted_file}", { stdio: 'inherit' }
  catch error
    log "failed to process #{file}: #{error.message}"
    exit 1 