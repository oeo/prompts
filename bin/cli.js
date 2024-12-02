#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'fs'
import path from 'path'
import chalk from 'chalk'
import Table from 'cli-table3'
import { fileURLToPath } from 'url'
import minimist from 'minimist'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ARCHIVE_DIR = path.join(process.cwd(), '.archives')
const PRIVATE_DIR = path.join(process.cwd(), 'private')

// Styling constants - more subtle colors
const styles = {
  dim: chalk.gray,
  accent: chalk.green,
  error: chalk.red,
  hash: chalk.yellow,
  meta: chalk.gray
}

function log(message, type = 'info') {
  const prefix = {
    info: styles.info('ℹ'),
    success: styles.success('✓'),
    error: styles.error('✖'),
    warning: styles.warning('⚠')
  }
  console.log(`${prefix[type] || prefix.info} ${message}`)
}

function error(message) {
  console.error(`${styles.error('error:')} ${message}`)
  process.exit(1)
}

function execCmd(command, showOutput = false) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: showOutput ? 'inherit' : ['inherit', 'pipe', 'pipe'] })
    return output ? output.trim() : ''
  } catch (e) {
    if (e.status !== 0) {
      error(e.message)
    }
    return ''
  }
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = Number(bytes)
  let unit = 0

  if (isNaN(size)) {
    return '0 B'
  }

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }

  return `${Math.round(size * 10) / 10} ${units[unit]}`
}

function getGitInfo(filename) {
  try {
    const output = execSync(`git log --format="%H %an <%ae> %s" -n 1 -- .archives/${filename}`, { encoding: 'utf8' })
    const [hash, ...rest] = output.trim().split(' ')
    const message = rest.join(' ')
    return {
      hash: hash.slice(0, 7),
      author: message.split('>')[0] + '>',
      message: message.split('>')[1].trim()
    }
  } catch (e) {
    return {
      hash: '',
      author: '',
      message: ''
    }
  }
}

function parseArchiveDate(filename) {
  try {
    if (filename.includes('_')) {
      // Parse ISO format (2024-12-02_02-25-48-328Z)
      const [datePart, timePart] = filename.split('_')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute, second] = timePart.split(/[-Z]/g).filter(Boolean).map(Number)
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    } else if (!isNaN(filename)) {
      // Parse Unix timestamp
      return new Date(parseInt(filename) * 1000)
    } else {
      // Return current date for unknown formats
      return new Date()
    }
  } catch (e) {
    console.error('Error parsing date:', e)
    return new Date() // Return current date for invalid formats
  }
}

function getArchives() {
  try {
    // Get all commits that modified .archives directory
    const log = execCmd('git log --format="%H|%an <%ae>|%s" -- .archives/').split('\n')
    if (!log[0]) return []

    const archives = []
    for (const line of log) {
      const [hash, author, message] = line.split('|')
      
      // Get archive files from this commit
      const files = execCmd(`git ls-tree -r --name-only ${hash} -- .archives/*.tar.gpg`).split('\n').filter(Boolean)
      
      for (const archiveFile of files) {
        // Get file size at commit time
        const size = execCmd(`git ls-tree -r -l ${hash} -- ${archiveFile} | awk '{print $4}'`)
        
        archives.push({
          name: path.basename(archiveFile),
          size: parseInt(size) || 0,
          git: {
            hash: hash.slice(0, 7),
            author,
            message
          }
        })
      }
    }

    return archives
  } catch (e) {
    console.error('Error:', e.message)
    return []
  }
}

function getOutputFormat(args) {
  // Look for --output=value or --output value
  const outputArg = args.find(arg => arg === '--output' || arg.startsWith('--output='))
  if (!outputArg) return 'default'
  
  if (outputArg === '--output') {
    // Get the next argument as the value
    const valueIndex = args.indexOf('--output') + 1
    return args[valueIndex] || 'default'
  }
  
  // Handle --output=value format
  return outputArg.split('=')[1] || 'default'
}

// Add a function to handle archive listing
function displayArchives(archives, args) {
  if (args.includes('--json')) {
    console.log(JSON.stringify(archives, null, 2))
    return
  }

  archives.forEach((a, i) => {
    const current = i === 0 ? chalk.green(' (current)') : ''
    const hash = a.git.hash ? chalk.yellow(a.git.hash) : chalk.gray('no hash')
    const message = a.git.message || chalk.gray('no commit info')
    const meta = chalk.gray(`${a.name} • ${formatSize(a.size)} • ${a.git.author || 'unknown'}`)
    console.log(`${hash} ${message}${current}\n${chalk.gray('└─')} ${meta}\n`)
  })
}

// Add this helper function
const alignDescription = (cmd, desc) => {
  const cmdWidth = 25  // Increased width for better alignment
  const padding = ' '.repeat(Math.max(0, cmdWidth - cmd.length))
  return cmd + padding + desc
}

const commands = {
  help() {
    console.log(`${chalk.yellow('Usage')}
  <command> [options]

${chalk.yellow('Commands')}
  ${chalk.green('ls')}          \t\t${chalk.gray('List archives')}
  ${chalk.green('info')}        \t\t${chalk.gray('Show archive info')}
    └─ <index>
    └─ <hash>
  ${chalk.green('verify')}      \t\t${chalk.gray('Check archive integrity')}
    └─ <index>
    └─ <hash>
  ${chalk.green('restore')}     \t\t${chalk.gray('Restore from archive by index or commit hash')}
    └─ <index>
    └─ <hash>
  ${chalk.green('pack')}        \t\t${chalk.gray('Create and stage a new archive')}
    └─ [--force]
  ${chalk.green('clean')}       \t\t${chalk.gray('Remove uncommitted archives')}
  ${chalk.green('help')} 

${chalk.yellow('Examples')}
  ls --limit=5      \t${chalk.gray('# Show 5 most recent')}
  info 2           \t${chalk.gray('# Show info for second most recent')}
  restore a321160   \t${chalk.gray('# Restore by commit hash')}
  pack --force      \t${chalk.gray('# Create archive even if no changes')}`)
  },

  async ls(args) {
    const archives = await getArchives()
    if (archives.length === 0) {
      console.log('No archives found')
      return
    }

    const limit = args.limit || 10
    if (limit !== 0) {
      archives.length = Math.min(archives.length, limit)
    }

    if (args.json) {
      console.log(JSON.stringify(archives, null, 2))
      return
    }

    // Find committed archives
    const committedArchives = archives.filter(a => a.git?.hash)
    if (committedArchives.length === 0) {
      // No committed archives found
      for (const archive of archives) {
        const size = formatSize(archive.size)
        const message = archive.git?.message || 'no commit info'
        const author = archive.git?.author || 'unknown'
        process.stdout.write(`${chalk.yellow(message)}
└─ ${archive.name} • ${size} • ${chalk.green(author)}${archives.indexOf(archive) < archives.length - 1 ? '\n' : ''}`)
      }
      return
    }

    // Process archives
    for (const archive of archives) {
      const size = formatSize(archive.size)
      const message = archive.git?.message || 'no commit info'
      const author = archive.git?.author || 'unknown'
      const committedIndex = committedArchives.indexOf(archive)
      const indexStr = committedIndex !== -1 ? 
        `[${committedIndex}] ` : 
        ''
      const hash = archive.git?.hash ? 
        `${chalk.blue(archive.git.hash)} ` : 
        ''
      process.stdout.write(`${indexStr}${hash}${chalk.yellow(message)}
└─ ${archive.name} • ${size} • ${chalk.green(author)}${archives.indexOf(archive) < archives.length - 1 ? '\n' : ''}`)
    }
  },

  async info(args) {
    const archives = await getArchives()
    if (archives.length === 0) {
      console.log('No archives found')
      return
    }

    let archive
    if (args._.length > 1) {
      const target = args._[1]
      if (/^\d+$/.test(target)) {
        // Index provided
        const index = parseInt(target)
        archive = archives[index]
        if (!archive) {
          console.error(`Archive index ${target} not found`)
          return
        }
      } else {
        // Hash provided
        archive = archives.find(a => a.git?.hash?.startsWith(target))
        if (!archive) {
          console.error(`Archive with hash ${target} not found`)
          return
        }
      }
    } else {
      // No argument - show most recent
      archive = archives[0]
    }

    if (args.json) {
      console.log(JSON.stringify(archive, null, 2))
      return
    }

    const size = formatSize(archive.size)
    const date = new Date(archive.timestamp * 1000).toISOString()
      .replace(/[TZ]/g, ' ')
      .trim()
    const message = archive.git?.message || 'no commit info'
    const author = archive.git?.author || 'unknown'
    const filename = archive.name || archive.filename

    console.log(`${chalk.yellow(message)}${archive.is_current ? ' (current)' : ''}
└─ ${filename} • ${size} • ${chalk.green(author)}
   ${chalk.gray('created:')} ${date}${archive.git?.hash ? `\n   ${chalk.gray('commit:')}  ${archive.git.hash}` : ''}`)
  },

  async clean(args) {
    const archives = await getArchives()
    if (archives.length === 0) {
      console.log('No archives found')
      return
    }

    // Get list of uncommitted archives
    const uncommitted = execCmd('git ls-files --others --exclude-standard -- .archives/*.tar.gpg').split('\n').filter(Boolean)
    
    if (uncommitted.length <= 1) {
      console.log('No cleanup needed - at most one uncommitted archive')
      return
    }

    // Keep only the most recent uncommitted archive
    const latest = uncommitted.sort().reverse()[0]
    for (const archive of uncommitted) {
      if (archive !== latest) {
        unlinkSync(path.join(ARCHIVE_DIR, archive))
        console.log(`Removed ${archive}`)
      }
    }

    console.log(`\nCleanup complete. Kept most recent uncommitted archive: ${latest}\n`)
    console.log('Tip: Run git commit -m "chore: clean up uncommitted archives" to save these changes')
  },

  async restore(args) {
    const archives = await getArchives()
    if (archives.length === 0) {
      console.log('No archives found')
      return
    }

    // Find committed archives
    const committedArchives = archives.filter(a => a.git?.hash)
    if (committedArchives.length === 0) {
      console.error('No committed archives found')
      return
    }

    let archive
    if (args._.length > 1) {
      const target = args._[1]
      if (target === 'list') {
        return commands.ls(args)
      }
      
      if (/^\d+$/.test(target)) {
        // Index provided
        const index = parseInt(target)
        if (index < 0 || index >= committedArchives.length) {
          console.error(`Invalid archive index: ${target}`)
          return
        }
        archive = committedArchives[index]
      } else {
        // Hash provided
        archive = archives.find(a => a.git?.hash?.startsWith(target))
        if (!archive) {
          console.error(`Archive with hash ${target} not found`)
          return
        }
      }
    } else {
      // No argument - use most recent committed archive
      archive = committedArchives[0]
    }

    try {
      // Clear private directory
      await execSync('rm -rf private')
      await execSync('mkdir -p private')

      // Decrypt and extract archive
      const tempTar = path.join(ARCHIVE_DIR, 'temp.tar')
      await execSync(`gpg --yes -d -o "${tempTar}" "${path.join(ARCHIVE_DIR, archive.name)}"`)
      await execSync(`tar -xf "${tempTar}" -C private`)
      await execSync(`rm "${tempTar}"`)

      if (args.json) {
        console.log(JSON.stringify({ status: 'success', archive }, null, 2))
        return
      }

      const size = formatSize(archive.size)
      const message = archive.git?.message || 'no commit info'
      const author = archive.git?.author || 'unknown'
      const hash = archive.git?.hash ? `${chalk.blue(archive.git.hash)} ` : ''
      console.log(`${hash}${chalk.yellow(message)}
└─ ${archive.name} • ${size} • ${chalk.green(author)}`)
    } catch (error) {
      console.error(`Failed to restore: ${error.message}`)
      process.exit(1)
    }
  },

  async verify(args) {
    const archives = await getArchives()
    if (archives.length === 0) {
      console.log('No archives found')
      return
    }

    // Find committed archives
    const committedArchives = archives.filter(a => a.git?.hash)
    if (committedArchives.length === 0) {
      console.error('No committed archives found')
      return
    }

    let targetArchives = []
    if (args._.length > 1) {
      const target = args._[1]
      if (/^\d+$/.test(target)) {
        // Index provided
        const index = parseInt(target)
        if (index < 0 || index >= committedArchives.length) {
          console.error(`Invalid archive index: ${target}`)
          return
        }
        targetArchives = [committedArchives[index]]
      } else {
        // Hash provided
        const archive = archives.find(a => a.git?.hash?.startsWith(target))
        if (!archive) {
          console.error(`Archive with hash ${target} not found`)
          return
        }
        targetArchives = [archive]
      }
    } else {
      // Default to most recent committed archive
      targetArchives = [committedArchives[0]]
    }

    const tmpDir = path.join(process.cwd(), '.tmp-verify')
    await execSync(`rm -rf "${tmpDir}"`)
    await execSync(`mkdir -p "${tmpDir}"`)

    const results = []
    let allValid = true

    try {
      for (const archive of targetArchives) {
        const tempFile = path.join(tmpDir, `${archive.name}.tar`)
        try {
          // Decrypt archive
          await execSync(`gpg --yes -d -o "${tempFile}" "${path.join(ARCHIVE_DIR, archive.name)}" 2>/dev/null`)
          // Verify tar contents
          await execSync(`tar tf "${tempFile}" >/dev/null 2>&1`)
          
          results.push({ name: archive.name, valid: true })
          
          if (!args.json) {
            const size = formatSize(archive.size)
            const message = archive.git?.message || 'no commit info'
            const author = archive.git?.author || 'unknown'
            const hash = archive.git?.hash ? `${chalk.blue(archive.git.hash)} ` : ''
            process.stdout.write(`${chalk.green('✓')} ${hash}${chalk.yellow(message)}
└─ ${archive.name} • ${size} • ${chalk.green(author)}${targetArchives.indexOf(archive) < targetArchives.length - 1 ? '\n' : ''}`)
          }
        } catch (error) {
          results.push({ name: archive.name, valid: false })
          allValid = false
          
          if (!args.json) {
            const size = formatSize(archive.size)
            const message = archive.git?.message || 'no commit info'
            const author = archive.git?.author || 'unknown'
            const hash = archive.git?.hash ? `${chalk.blue(archive.git.hash)} ` : ''
            process.stdout.write(`${chalk.red('✖')} ${hash}${chalk.yellow(message)}
└─ ${archive.name} • ${size} • ${chalk.green(author)}${targetArchives.indexOf(archive) < targetArchives.length - 1 ? '\n' : ''}`)
          }
        } finally {
          await execSync(`rm -f "${tempFile}"`)
        }
      }

      if (args.json) {
        console.log(JSON.stringify({
          status: allValid ? 'success' : 'error',
          message: allValid ? 'all archives valid' : 'some archives failed verification',
          results
        }, null, 2))
      }

      if (!allValid) {
        process.exit(1)
      }
    } finally {
      await execSync(`rm -rf "${tmpDir}"`)
    }
  },

  async pack(args) {
    // Check if private directory exists and has files
    if (!existsSync(ARCHIVE_DIR)) {
      mkdirSync(ARCHIVE_DIR, { recursive: true })
    }
    if (!existsSync(PRIVATE_DIR)) {
      mkdirSync(PRIVATE_DIR, { recursive: true })
    }

    // Check if there are any files in private
    const files = readdirSync(PRIVATE_DIR)
    if (files.length === 0) {
      console.error('No files found in private directory')
      process.exit(1)
    }

    // Get latest archive
    const archives = readdirSync(ARCHIVE_DIR)
      .filter(f => f.endsWith('.tar.gpg'))
      .sort()
      .reverse()

    // Always create archive if no previous archive exists
    if (archives.length === 0 || args.force) {
      console.log('Creating encrypted archive...')
      execCmd('node bin/create-encrypted-archive.js', true)
      
      // Stage the new archive
      const latest = readdirSync(ARCHIVE_DIR)
        .filter(f => f.endsWith('.tar.gpg'))
        .sort()
        .reverse()[0]
      
      if (latest) {
        execCmd(`git add ".archives/${latest}"`)
        console.log(`\nStaged new archive: ${latest}`)
        console.log('\nTip: Run git commit -m "chore: add new archive" to save these changes')
      }
      return
    }

    // Compare latest archive contents with current private directory
    const latestArchive = archives[0]
    const tempDir = path.join(ARCHIVE_DIR, 'temp-compare')
    try {
      // Create temp directory
      mkdirSync(tempDir, { recursive: true })
      
      // Decrypt latest archive
      execCmd(`gpg --yes -d -o "${path.join(tempDir, 'temp.tar')}" "${path.join(ARCHIVE_DIR, latestArchive)}"`)
      execCmd(`cd "${tempDir}" && tar xf temp.tar`)

      // Compare directories
      const diff = execCmd(`diff -r "${tempDir}/private" "${PRIVATE_DIR}" 2>&1 || true`)
      if (!diff) {
        console.error('No changes detected in private directory. Use --force to create archive anyway.')
        process.exit(1)
      }

      // Changes detected, create new archive
      console.log('Changes detected. Creating encrypted archive...')
      execCmd('node bin/create-encrypted-archive.js', true)
      
      // Stage the new archive
      const latest = readdirSync(ARCHIVE_DIR)
        .filter(f => f.endsWith('.tar.gpg'))
        .sort()
        .reverse()[0]
      
      if (latest) {
        execCmd(`git add ".archives/${latest}"`)
        console.log(`\nStaged new archive: ${latest}`)
        console.log('\nTip: Run git commit -m "chore: add new archive" to save these changes')
      }
    } finally {
      // Clean up temp directory
      execCmd(`rm -rf "${tempDir}"`)
    }
  }
}

// Parse command line arguments
const args = minimist(process.argv.slice(2))
const [cmd] = args._

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  commands.help()
} else if (cmd === 'list') {
  commands.ls(args) // handle 'list' as alias for 'ls'
} else if (commands[cmd]) {
  commands[cmd](args)
} else {
  console.error(`Unknown command: ${cmd}`)
  commands.help()
} 