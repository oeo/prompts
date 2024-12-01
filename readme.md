# Encrypted Markdown Repository

A Git repository setup for storing encrypted markdown files. Files in the `private/` directory are automatically encrypted using GPG before being committed and decrypted after pulling.

## Features

- Automatic encryption of markdown files in `private/` directory during commits
- Automatic decryption of files after pulling or checking out
- Clean working directory - only see decrypted `.md` files while working
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

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Run the installation script:
   ```bash
   node install.js
   ```

3. Configure your GPG key in `.env`:
   ```bash
   # Required: Your GPG key ID or email for encryption
   GPG_RECIPIENT=your.email@example.com
   
   # Optional: Specific GPG key ID if you have multiple keys
   GPG_KEY_ID=3AA5C34371567BD2
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
   - The pre-commit hook automatically encrypts your files
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

## Project Structure

```
.
├── private/           # Your markdown files (auto-encrypted)
├── bin/              # Helper scripts
│   ├── cleanup-private-dir.js
│   ├── decrypt-file.js
│   ├── encrypt-file.js
│   ├── pre-commit-encrypt.js
│   └── validate-encryption-setup.js
├── git-hooks/        # Git hook templates
├── .env              # GPG configuration
└── install.js        # Setup script
```

## Troubleshooting

### Common GPG Issues

1. "No public key" error:
   - Verify your GPG_RECIPIENT in .env matches your key
   - Check if the key exists: `gpg --list-keys`

2. Decryption fails:
   - Ensure you have the private key: `gpg --list-secret-keys`
   - Verify the key hasn't expired

3. Multiple keys:
   - Use GPG_KEY_ID in .env to specify exact key
   - Format: last 16 characters of key ID

### File Issues

- If files aren't encrypting:
  ```bash
  # Manually run validation
  node bin/validate-encryption-setup.js
  ```

- If .gpg files remain:
  ```bash
  # Clean up manually
  node bin/cleanup-private-dir.js
  ```

## Security Best Practices

- Never commit unencrypted `.md` files
- Keep your `.env` file private (it's gitignored)
- Regularly backup your GPG keys
- Use strong passphrases for your GPG keys
- Consider using subkeys for different machines
- Regularly verify your GPG setup is working

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


