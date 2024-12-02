# Encrypted Markdown Repository

A Git repository setup for storing encrypted markdown files. Files in the `private/` directory are automatically encrypted using GPG before being committed and decrypted after pulling.

## Features

- Automatic encryption of markdown files in `private/` directory during commits
- Support for multiple GPG recipients (all recipients can decrypt files)
- Automatic decryption of files after pulling or checking out
- Clean working directory - only see decrypted files while working
- `.encignore` support for excluding files from archives
- Validation system to prevent accidental commits of unencrypted files
- Environment-based configuration for GPG key selection
- Single dependency (dotenv) - lightweight and maintainable

## Prerequisites

- Node.js (v12 or later)
- GPG installed and configured with your key
- Git

## GPG Setup

If you're new to GPG, here's a quick start:

1. Generate a new GPG key:
   ```bash
   gpg --full-generate-key
   ```

2. List your keys to get the ID or email:
   ```bash
   gpg --list-secret-keys --keyid-format LONG
   ```

3. Export your public key for sharing:
   ```bash
   gpg --armor --export your.email@example.com
   ```

For more GPG commands and usage, see the [GPG Cheat Sheet](https://devhints.io/gpg)

## Installation

### New Repository

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies and run setup:
   ```bash
   npm install
   npm run setup
   ```

3. Configure your GPG keys in `.env`:
   ```bash
   # Required: Comma-separated list of GPG recipients (emails or key IDs) who can decrypt files
   # Can use either email or last 16 characters of key ID for each recipient
   GPG_RECIPIENTS=user1@example.com,3AA5C34371567BD2
   
   # Optional: Specific GPG key ID for signing if you have multiple keys
   # GPG_KEY_ID=3AA5C34371567BD2
   ```

4. Configure file exclusions in `.encignore`:
   ```bash
   # Ignore temp files
   *.tmp
   *.temp
   *.swp
   
   # Ignore system files
   .DS_Store
   Thumbs.db
   
   # Ignore specific directories
   temp/
   cache/
   ```

5. Commit the initial archive:
   ```bash
   git commit -m "init: create initial archive"
   git push
   ```

### Existing Repository

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Configure your GPG keys in `.env`:
   ```bash
   # Required: Comma-separated list of GPG recipients (emails or key IDs) who can decrypt files
   # Can use either email or last 16 characters of key ID for each recipient
   GPG_RECIPIENTS=user1@example.com,3AA5C34371567BD2
   
   # Optional: Specific GPG key ID for signing if you have multiple keys
   # GPG_KEY_ID=3AA5C34371567BD2
   ```

3. Install dependencies and run setup:
   ```bash
   npm install
   npm run setup
   ```

   This will:
   - Set up git hooks
   - Validate your GPG configuration
   - Restore files from the latest archive

## Usage

### Working with Files

1. Before making changes, always restore from the latest archive:
   ```bash
   git pull  # automatically restores from latest archive
   # or manually restore anytime
   npm run restore
   ```
   This ensures you have the latest content from the archive.

2. Create or edit files in the `private/` directory:
   ```bash
   vim private/my-notes.md
   ```

3. Stage and commit your changes:
   ```bash
   git add .
   git commit -m "update: add new notes"
   ```
   - The pre-commit hook automatically encrypts your files
   - Only the encrypted `.gpg` files are committed
   - Each recipient listed in GPG_RECIPIENTS can decrypt the files
   - Files matching patterns in `.encignore` are excluded from archives

4. Push your changes when ready:
   ```bash
   git push
   ```

### File Exclusions

The `.encignore` file works just like `.gitignore` but for archive creation:

```bash
# Ignore temp files
*.tmp
*.temp
*.swp

# Ignore system files
.DS_Store
Thumbs.db

# Ignore specific directories
temp/
cache/
node_modules/

# Ignore specific file types
*.log
*.bak
*.old
```

Files matching these patterns will:
- Still exist in your `private/` directory
- Not be included in encrypted archives
- Not be shared with other users

### Recommended Git Workflow

To avoid conflicts:

1. Always restore from the latest archive before making changes:
   ```bash
   git pull  # automatic restore
   # or
   npm run restore  # manual restore
   ```

2. Make your changes in the `private/` directory
3. Stage and commit your changes
4. Push when ready

If you get conflicts:
1. Stash your changes: `git stash`
2. Pull and restore: `git pull`
3. Apply your changes: `git stash pop`
4. Resolve any conflicts in the `private/` directory
5. Commit and push

### Safety Features

- Pre-commit validation prevents:
  - Committing unencrypted files
  - Commits without proper GPG setup
  - Missing or misconfigured scripts

- Post-merge/pull/checkout hooks ensure:
  - Automatic restoration from latest archive
  - Clean private directory before each restore
  - Handles pull, merge, checkout, and rebase operations

## Project Structure

```
.
├── private/           # Your files (auto-encrypted)
├── bin/              # Helper scripts
│   ├── setup.js      # Setup script
│   ├── test.js       # Test script
│   ├── test-commit.js # Commit workflow test
│   ├── utils.js      # Common utilities
│   ├── create-encrypted-archive.js
│   ├── restore-from-archive.js
│   ├── init-archive.js
│   └── validate-encryption-setup.js
├── git-hooks/        # Git hook templates
├── .env              # GPG configuration
└── .encignore        # Archive exclusion patterns
```

## Troubleshooting

### Common GPG Issues

1. "No public key" error:
   - Verify your GPG_RECIPIENTS in .env matches your keys
   - Check if the keys exist: `gpg --list-keys`
   - Make sure all recipients' public keys are imported

2. Decryption fails:
   - Ensure you have the private key: `gpg --list-secret-keys`
   - Verify the key hasn't expired
   - Check you're one of the recipients in GPG_RECIPIENTS

3. Multiple keys:
   - Use GPG_KEY_ID in .env to specify exact signing key
   - Format: last 16 characters of key ID

### Git Issues

1. Content out of sync:
   ```bash
   # Manually restore from latest archive
   npm run restore
   ```

2. Conflicts:
   ```bash
   # Stash your changes
   git stash
   
   # Pull and restore
   git pull
   
   # Apply your changes
   git stash pop
   
   # Resolve conflicts and commit
   git add .
   git commit -m "resolved conflicts"
   ```

3. If files aren't encrypting:
   ```bash
   # Manually run validation
   node bin/validate-encryption-setup.js
   ```

4. If files aren't being archived:
   ```bash
   # Run the commit test
   node bin/test-commit.js
   ```

### Archive Issues

1. Files not being excluded:
   - Check `.encignore` syntax matches `.gitignore` format
   - Patterns are relative to `private/` directory
   - Use `**/pattern` to match in all directories

2. Wrong files being excluded:
   - Add `!pattern` to negate a pattern
   - More specific patterns take precedence
   - Use `#` for comments

## Security Best Practices

- Never commit unencrypted files from `private/` directory
- Keep your `.env` file private (it's gitignored)
- Regularly backup your GPG keys
- Use strong passphrases for your GPG keys
- Consider using subkeys for different machines
- Regularly verify your GPG setup is working
- Ensure all recipients' public keys are trusted
- Review GPG_RECIPIENTS list periodically
- Use `.encignore` for sensitive temporary files

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

- Open an issue for bugs or feature requests
- PRs welcome
- Star the repo if you find it useful!


