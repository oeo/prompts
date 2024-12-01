#!/usr/bin/env coffee

{ log } = require 'console'
{ exit } = require 'process'

{ execSync } = require 'child_process'
{ existsSync, readdirSync, statSync } = require 'fs'
path = require 'path'

check_gpg = ->
  try
    output = execSync 'gpg --list-secret-keys', { encoding: 'utf8' }
    unless output.includes 'taky'
      log 'error: GPG key for "taky" not found'
      exit 1
  catch error
    log 'error: GPG is not properly installed or configured'
    exit 1

check_staged_files = ->
  try
    staged = execSync 'git diff --cached --name-only', { encoding: 'utf8' }
    for file in staged.split '\n'
      if file.startsWith('private/') and file.endsWith('.md') and not file.endsWith('.md.gpg')
        log "error: attempting to commit unencrypted markdown file: #{file}"
        log 'hint: remove it from staging with: git reset HEAD #{file}'
        exit 1
  catch error
    log 'error: failed to check staged files'
    exit 1

check_hooks = ->
  required_hooks = [
    '.git/hooks/pre-commit'
    '.git/hooks/post-merge'
    '.git/hooks/post-checkout'
  ]
  
  for hook in required_hooks
    unless existsSync hook
      log "error: missing git hook: #{hook}"
      exit 1
    
    unless (statSync(hook).mode & 0o111) != 0
      log "error: git hook is not executable: #{hook}"
      exit 1

check_scripts = ->
  required_scripts = [
    'bin/encrypt-file.coffee'
    'bin/decrypt-file.coffee'
    'bin/pre-commit-encrypt.coffee'
    'bin/cleanup-private-dir.coffee'
  ]
  
  for script in required_scripts
    unless existsSync script
      log "error: missing script: #{script}"
      exit 1
    
    unless (statSync(script).mode & 0o111) != 0
      log "error: script is not executable: #{script}"
      exit 1

check_gitignore = ->
  unless existsSync '.gitignore'
    log 'error: .gitignore file is missing'
    exit 1
  
  content = execSync 'cat .gitignore', { encoding: 'utf8' }
  unless content.includes 'private/**/*.md'
    log 'error: .gitignore missing rule for unencrypted markdown files'
    exit 1
  
  unless content.includes '!private/**/*.md.gpg'
    log 'error: .gitignore missing exception for encrypted files'
    exit 1

# Run all checks
log 'checking GPG setup...'
check_gpg()

log 'checking staged files...'
check_staged_files()

log 'checking git hooks...'
check_hooks()

log 'checking required scripts...'
check_scripts()

log 'checking .gitignore configuration...'
check_gitignore()

log 'all checks passed!' 