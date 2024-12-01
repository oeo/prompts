# Encrypted Markdown Repository

A Git repository setup for storing encrypted markdown files. Files in the `private/` directory are automatically encrypted using GPG before being committed and decrypted after pulling.

## Features

- Automatic encryption of markdown files in `private/` directory during commits
- Automatic decryption of files after pulling or checking out
- Clean working directory - only see decrypted `.md` files while working
- Validation system to prevent accidental commits of unencrypted files
- Environment-based configuration for GPG key selection

## Prerequisites

- Node.js (v12 or later)
- GPG installed and configured with your key
- Git

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Run the installation script:
   ```bash
   node install.js
   ```

3. Edit `.env` and set your GPG key:
   ```bash
   # Open .env and set GPG_RECIPIENT to your GPG key email or ID
   vim .env
   ```

That's it! The installation script handles everything else automatically.

## Usage

### Working with Files

1. Create or edit markdown files in the `private/` directory:
   ```bash
   vim private/my-notes.md
   ```

2. Commit changes normally:
   ```bash
   git add .
   git commit -m "update: add new notes"
   ```
   - The pre-commit hook will automatically encrypt your files
   - Only the encrypted `.gpg` files are committed

3. Pull or push changes:
   ```bash
   git pull  # or
   git push
   ```
   - Files are automatically decrypted after pull
   - `.gpg` files are cleaned up after both pull and push

### Safety Features

- Pre-commit validation prevents:
  - Committing unencrypted files
  - Commits without proper GPG setup
  - Missing or misconfigured scripts

- Post-merge/pull/checkout/push hooks ensure:
  - Automatic decryption of files after any update
  - Clean working directory (no `.gpg` files)
  - Handles pull, merge, checkout, rebase, and push operations

## Directory Structure

- `private/` - Directory for markdown files (automatically encrypted)
- `bin/` - Helper scripts for encryption/decryption
- `git-hooks/` - Example Git hooks for installation
- `.env` - Configuration for GPG recipient

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security Notes

- Never commit unencrypted `.md` files
- Keep your `.env` file private
- Regularly verify your GPG setup
- Back up your GPG keys securely

## License

MIT

