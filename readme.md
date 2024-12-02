# Encrypted Git Repository

A Git repository setup for storing encrypted files. Files in the `private/` directory are automatically encrypted into archives before being committed.

## Features

- Automatic archive creation and encryption of files in `private/` directory
- Support for multiple GPG recipients (all recipients can decrypt files)
- `.encignore` support for excluding files from archives (like `.gitignore`)
- Clean working directory - files exist only in `private/`
- Automatic restoration from latest archive on pull/checkout
- Simple commands: `npm run pull`, `npm run restore`

## Prerequisites

- Node.js (v12 or later)
- GPG installed and configured
- Git

## Installation

1. Clone and setup:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   npm install
   npm run setup
   ```

2. Configure GPG recipients in `.env`:
   ```bash
   # Required: Comma-separated list of GPG recipients who can decrypt files
   # Use email or last 16 characters of key ID
   GPG_RECIPIENTS=user1@example.com,3AA5C34371567BD2

   # Optional: Your signing key if you have multiple
   # GPG_KEY_ID=3AA5C34371567BD2
   ```

3. Configure file exclusions in `.encignore`:
   ```bash
   # Files/patterns to exclude from archives
   *.tmp
   *.swp
   .DS_Store
   temp/
   ```

## Usage

### Basic Workflow

1. Always restore latest content first:
   ```bash
   npm run pull     # pull git changes and restore
   # or
   npm run restore  # just restore from latest archive
   ```

2. Work with files in `private/`:
   ```bash
   vim private/notes.md
   ```

3. Commit changes:
   ```bash
   git add .
   git commit -m "update notes"
   ```
   - Creates encrypted archive automatically
   - Only commits the archive, not the files
   - Excludes files matching `.encignore` patterns

### File Exclusions

The `.encignore` file works like `.gitignore` but for archives:
- Files matching patterns still exist in `private/`
- But they won't be included in archives
- They won't be shared with other users

Example `.encignore`:

```bash
# Temp files
*.tmp
*.swp

# System files
.DS_Store
Thumbs.db

# Directories
temp/
cache/
node_modules/

# File types
*.log
*.bak
```

### Commands

- `npm run pull`: Pull git changes and restore latest archive
- `npm run restore`: Just restore from latest archive
- `git pull`: Triggers restore from latest archive
- `git checkout`: Triggers restore from latest archive

### Handling Conflicts

If you get conflicts:
1. Stash your changes: `git stash`
2. Pull and restore: `npm run pull`
3. Apply your changes: `git stash pop`
4. Resolve conflicts
5. Commit and push

## Project Structure

```
.
├── private/           # Your files (auto-encrypted)
├── .archives/         # Encrypted archives
├── bin/               # Helper scripts
├── git-hooks/         # Git hook templates
├── .env               # GPG configuration
└── .encignore         # Archive exclusion patterns
```

## Troubleshooting

### Common Issues

1. "No public key" error:
   - Check GPG_RECIPIENTS in .env matches your keys
   - Verify keys exist: `gpg --list-keys`
   - Import missing keys if needed

2. Files not in archive:
   - Check `.encignore` patterns
   - Run `npm run restore` to verify
   - Create new commit to generate new archive

3. Content out of sync:
   ```bash
   npm run restore  # force restore from latest
   ```

4. Multiple GPG keys:
   - Set GPG_KEY_ID in .env to specify key
   - Use last 16 characters of key ID

### GPG Key Management

1. Generate new key:
   ```bash
   gpg --full-generate-key
   ```

2. List keys:
   ```bash
   gpg --list-secret-keys --keyid-format LONG
   ```

3. Export public key:
   ```bash
   gpg --armor --export your.email@example.com
   ```

4. Import others' keys:
   ```bash
   gpg --import their-key.asc
   ```

## Security Best Practices

- Never commit unencrypted files from `private/`
- Keep `.env` private (it's gitignored)
- Backup GPG keys securely
- Use strong passphrases
- Review GPG_RECIPIENTS periodically
- Use `.encignore` for sensitive temp files

## License

MIT


