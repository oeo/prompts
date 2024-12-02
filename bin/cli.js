#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, readdirSync, statSync } from 'fs'
import path from 'path'
import chalk from 'chalk'
import boxen from 'boxen'
import ora from 'ora'
import Table from 'cli-table3'
import { fileURLToPath } from 'url'

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Styling constants
const styles = {
  header: chalk.bold.cyan,
  subheader: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
  hash: chalk.yellow,
  size: chalk.magenta,
  date: chalk.blue,
  author: chalk.green
}

function log(message, type = 'info') {
  const prefix = {
    info: styles.info('ℹ'),
    success: styles.success('✔'),
    error: styles.error('✖'),
    warning: styles.warning('⚠')
  }
  console.log(`${prefix[type] || prefix.info} ${message}`)
}

function error(message) {
  console.error(`\n${styles.error('Error:')} ${message}`)
  process.exit(1)
}

function cmd(command, showOutput = false) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: showOutput ? 'inherit' : ['inherit', 'pipe', 'pipe'] })
    return output.trim()
  } catch (e) {
    error(e.message)
  }
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(1)} ${units[unit]}`
}

function getGitInfo(archiveName) {
  try {
    const commitHash = cmd(`git log --format="%H" -1 -- .archives/${archiveName}`).trim()
    if (!commitHash) return null

    const author = cmd(`git show -s --format="%an <%ae>" ${commitHash}`).trim()
    const date = cmd(`git show -s --format="%cd" ${commitHash} --date=local`).trim()
    const message = cmd(`git show -s --format="%s" ${commitHash}`).trim()

    return { author, date, message, hash: commitHash.slice(0, 7) }
  } catch (e) {
    return null
  }
}

function getArchives() {
  const archiveDir = path.join(process.cwd(), '.archives')
  if (!existsSync(archiveDir)) {
    error('no archives directory found')
  }

  return readdirSync(archiveDir)
    .filter(f => f.endsWith('.tar.gpg'))
    .map(f => {
      const stats = statSync(path.join(archiveDir, f))
      const gitInfo = getGitInfo(f)
      
      // Try to parse timestamp from filename
      let timestamp
      if (f.includes('_')) {
        // Parse from formatted date (2024-12-01_23-37-27-060)
        const dateStr = f.split('.')[0]
        const date = new Date(dateStr.replace(/_/g, ' ').replace(/-/g, ':'))
        timestamp = Math.floor(date.getTime() / 1000)
      } else {
        // Parse from Unix timestamp
        timestamp = parseInt(f.split('.')[0])
      }

      return {
        name: f,
        timestamp,
        date: new Date(timestamp * 1000).toLocaleString(),
        size: stats.size,
        git: gitInfo
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}

const commands = {
  list: () => {
    const archives = getArchives()
    if (archives.length === 0) {
      log('No archives found', 'warning')
      return
    }

    console.log(boxen(styles.header(' Archive List '), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }))

    const table = new Table({
      head: ['Archive', 'Date', 'Size', 'Author', 'Message'].map(h => styles.header(h)),
      style: { head: [], border: [] }
    })

    archives.forEach((a, i) => {
      const current = i === 0 ? styles.success(' (current)') : ''
      table.push([
        styles.info(a.name) + current,
        styles.date(a.date),
        styles.size(formatSize(a.size)),
        a.git ? styles.author(a.git.author) : styles.dim('unknown'),
        a.git ? (styles.hash(a.git.hash) + ' ' + a.git.message) : styles.dim('no commit info')
      ])
    })

    console.log(table.toString())
  },

  info: () => {
    const archives = getArchives()
    if (archives.length === 0) {
      log('No archives found', 'warning')
      return
    }

    console.log(boxen(styles.header(' Archive Statistics '), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }))

    const totalSize = archives.reduce((sum, a) => sum + a.size, 0)
    const avgSize = totalSize / archives.length
    const authors = new Set(archives.filter(a => a.git).map(a => a.git.author))

    const statsTable = new Table()
    statsTable.push(
      { 'Total Archives': styles.info(archives.length.toString()) },
      { 'Total Size': styles.size(formatSize(totalSize)) },
      { 'Average Size': styles.size(formatSize(avgSize)) },
      { 'Contributors': styles.author(authors.size.toString()) },
      { 'Date Range': `${styles.date(archives[archives.length - 1].date)} → ${styles.date(archives[0].date)}` }
    )

    console.log(statsTable.toString())

    console.log(boxen(styles.header(' Recent History '), {
      padding: 1,
      margin: { top: 1 },
      borderStyle: 'round',
      borderColor: 'cyan'
    }))

    const historyTable = new Table({
      head: ['Date', 'Size', 'Author', 'Message'].map(h => styles.header(h)),
      style: { head: [], border: [] }
    })

    archives.slice(0, 5).forEach(a => {
      historyTable.push([
        styles.date(a.date),
        styles.size(formatSize(a.size)),
        a.git ? styles.author(a.git.author) : styles.dim('unknown'),
        a.git ? (styles.hash(a.git.hash) + ' ' + a.git.message) : styles.dim('no commit info')
      ])
    })

    console.log(historyTable.toString())
  },

  restore: async (args) => {
    const archives = getArchives()
    if (archives.length === 0) {
      error('no archives found')
    }

    let targetArchive
    if (!args[0]) {
      targetArchive = archives[0]
      log(`Restoring from latest archive: ${styles.info(targetArchive.name)}`, 'info')
    } else if (args[0] === 'list') {
      console.log(boxen(styles.header(' Available Archives '), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }))

      const table = new Table({
        head: ['#', 'Archive', 'Date', 'Size', 'Author', 'Message'].map(h => styles.header(h)),
        style: { head: [], border: [] }
      })

      archives.forEach((a, i) => {
        table.push([
          styles.info((i + 1).toString()),
          styles.info(a.name),
          styles.date(a.date),
          styles.size(formatSize(a.size)),
          a.git ? styles.author(a.git.author) : styles.dim('unknown'),
          a.git ? (styles.hash(a.git.hash) + ' ' + a.git.message) : styles.dim('no commit info')
        ])
      })

      console.log(table.toString())
      return
    } else if (!isNaN(args[0])) {
      const index = parseInt(args[0]) - 1
      if (index < 0 || index >= archives.length) {
        error('invalid archive number')
      }
      targetArchive = archives[index]
      log(`Restoring from archive #${index + 1}: ${styles.info(targetArchive.name)}`, 'info')
    } else {
      targetArchive = archives.find(a => 
        a.name === args[0] || 
        a.name === args[0] + '.tar.gpg' ||
        a.timestamp.toString() === args[0]
      )
      if (!targetArchive) {
        error('archive not found')
      }
      log(`Restoring from archive: ${styles.info(targetArchive.name)}`, 'info')
    }

    if (targetArchive.git) {
      console.log(`${styles.dim('commit')} ${styles.hash(targetArchive.git.hash)} ${styles.dim('by')} ${styles.author(targetArchive.git.author)}`)
      console.log(styles.dim('message:'), targetArchive.git.message)
    }

    const spinner = ora('Restoring files...').start()
    try {
      cmd('rm -rf private')
      cmd('mkdir -p private')
      cmd(`node bin/restore-from-archive.js "${targetArchive.name}"`)
      spinner.succeed('Files restored successfully')
    } catch (e) {
      spinner.fail('Failed to restore files')
      error(e.message)
    }
  },

  create: async () => {
    const spinner = ora('Creating new archive...').start()
    try {
      cmd('node bin/create-encrypted-archive.js')
      spinner.succeed('Archive created successfully')
    } catch (e) {
      spinner.fail('Failed to create archive')
      error(e.message)
    }
  },

  verify: async (args) => {
    const archives = getArchives()
    if (archives.length === 0) {
      error('no archives found')
    }

    let targetArchives = archives
    if (args[0]) {
      if (!isNaN(args[0])) {
        const count = parseInt(args[0])
        if (count < 1 || count > archives.length) {
          error('invalid archive count')
        }
        targetArchives = archives.slice(0, count)
      } else {
        const archive = archives.find(a => 
          a.name === args[0] || 
          a.name === args[0] + '.tar.gpg' ||
          a.timestamp.toString() === args[0]
        )
        if (!archive) {
          error('archive not found')
        }
        targetArchives = [archive]
      }
    }

    console.log(boxen(styles.header(` Verifying ${targetArchives.length} Archive(s) `), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }))

    cmd('rm -rf .tmp-verify')
    cmd('mkdir -p .tmp-verify')

    try {
      let allValid = true
      for (const archive of targetArchives) {
        const spinner = ora(`Verifying ${styles.info(archive.name)}`).start()
        if (archive.git) {
          spinner.text += ` (${styles.hash(archive.git.hash)})`
        }

        try {
          cmd(`gpg -d -o .tmp-verify/archive.tar .archives/${archive.name} 2>/dev/null`)
          cmd('cd .tmp-verify && tar tf archive.tar >/dev/null 2>&1')
          spinner.succeed(`${styles.info(archive.name)} is ${styles.success('valid')}`)
        } catch (e) {
          spinner.fail(`${styles.info(archive.name)} is ${styles.error('invalid')}`)
          allValid = false
        }
        cmd('rm -f .tmp-verify/archive.tar')
      }

      if (!allValid) {
        error('some archives failed verification')
      }
    } finally {
      cmd('rm -rf .tmp-verify')
    }
  },

  help: () => {
    const message = `
${styles.header('Usage:')} enc <command> [args]

${styles.header('Commands:')}
  ${styles.info('list')}                 List all available archives with commit info
  ${styles.info('info')}                 Show detailed archive and commit statistics
  ${styles.info('restore')} [number|id]  Restore from specific archive (latest if no arg)
  ${styles.info('restore list')}        Show numbered list for restoration
  ${styles.info('create')}              Create new archive without committing
  ${styles.info('verify')} [n|id]       Verify archive integrity (all if no arg)
  ${styles.info('help')}                Show this help message

${styles.header('Examples:')}
  ${styles.dim('$')} enc list            ${styles.dim('# List all archives with commit info')}
  ${styles.dim('$')} enc info            ${styles.dim('# Show archive and commit statistics')}
  ${styles.dim('$')} enc restore         ${styles.dim('# Restore from latest archive')}
  ${styles.dim('$')} enc restore 2       ${styles.dim('# Restore from second newest archive')}
  ${styles.dim('$')} enc restore list    ${styles.dim('# Show numbered list for selection')}
  ${styles.dim('$')} enc create          ${styles.dim('# Create new archive')}
  ${styles.dim('$')} enc verify          ${styles.dim('# Verify all archives')}
  ${styles.dim('$')} enc verify 5        ${styles.dim('# Verify 5 newest archives')}`

    console.log(boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }))
  }
}

// Parse command line
const [,, command, ...args] = process.argv
if (!command || !commands[command]) {
  commands.help()
  process.exit(command ? 1 : 0)
}

// Execute command
commands[command](args) 