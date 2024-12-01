# Encrypted Markdown Repository

A Git repository setup for storing encrypted markdown files. Files in the `private/` directory are automatically encrypted using GPG before being committed and decrypted after pulling.

## Features

- Automatic encryption of markdown files in `private/` directory during commits
- Automatic decryption of files after pulling or checking out
- Clean working directory - only see decrypted `.md` files while working
- Validation system to prevent accidental commits of unencrypted files
- Environment-based configuration for GPG key selection

## Prerequisites

- Node.js and npm/yarn
- GPG installed and configured with your key
- Git

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure your GPG key:
   ```bash
   cp .env.example .env
   # Edit .env and set GPG_RECIPIENT to your GPG key email or ID
   ```

4. Verify setup:
   ```bash
   ./bin/validate-encryption-setup.coffee
   ```

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

3. Pull changes:
   ```bash
   git pull
   ```
   - Files are automatically decrypted
   - `.gpg` files are cleaned up

### Safety Features

- Pre-commit validation prevents:
  - Committing unencrypted files
  - Commits without proper GPG setup
  - Missing or misconfigured scripts

- Post-merge and post-checkout hooks ensure:
  - Automatic decryption of files
  - Clean working directory (no `.gpg` files)

## Directory Structure

- `private/` - Directory for markdown files (automatically encrypted)
- `bin/` - Helper scripts for encryption/decryption
- `.git/hooks/` - Git hooks for automation
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

