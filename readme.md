# ward2

`ward2` is a secure file archival tool that uses pgp encryption and git versioning. it helps you maintain encrypted archives of sensitive files while keeping track of changes over time.

this is a complete rewrite of the [original ward](https://github.com/oeo/ward) project, expanding on its main idea with additional features and improved user experience.

**why use ward2?**

ward solves several critical problems in managing sensitive files:

1. securely propagates environment variables and secrets between team members
1. maintains a complete version history of sensitive files
1. enables secure file sharing through pgp encryption
1. provides easy rollback to previous versions when needed

ward builds on proven encryption standards rather than implementing custom cryptography.

ward is great for storing things in your repositories in a secure and private manner, and particularly valuable as a secure backup solution as well.

1. securely keep updated project-specific environment secrets in your repository
1. store recovery codes for all your critical services
1. keep encrypted copies of important credentials and keys
1. maintain backup 2fa/totp secrets
1. store copies of important documents and certificates

## contents

- [install](#install)
- [overview](#overview)
- [config](#config)
- [commands](#commands)
- [archive references](#archive-references)
- [file paths](#file-paths)
- [security](#security)
- [@todo](#todo)

## install

1. clone the repository
2. make sure you have `gpg` installed and configured
3. `npm install` to install dependencies
4. the `ward` binary is available in `./bin/ward`

![help menu](assets/help.png)

## quick overview

put files in the `./private` directory and create an encrypted archive.

```bash
echo "hello" > ./private/test.txt
ward pack
```

commit the archive.

```bash
git commit -m "add new archive"
```

![creating and committing an archive](assets/pack-commit.png)

**access files:**

```bash
ward ls                     # list all archives
ward cat latest/test.txt    # view file contents
ward cat 0/test.txt         # view file contents from index 0 (same as latest)
ward restore                # restore latest archive and extract to ./private 
```

![main menu](assets/menu.png)

## config
`ward` instances are configured using environment variables or in your local `.env` file.

**example env file**

```env
# format: last 16 characters of your key ID, email, or name
# if not set, uses your default GPG key
WARD_GPG_KEY=your.email@example.com

# format: comma-separated list of emails or key IDs
# if not set, encrypts only for `WARD_GPG_KEY` or default key
WARD_GPG_RECIPIENTS=user1@example.com,user2@example.com

# relative to project root or use an absolute path
# this folder contains files that will be encrypted
WARD_PRIVATE_FOLDER=vault

# this folder contains the encrypted archives
WARD_ARCHIVE_FOLDER=.vault_archives
```

## commands

### ls
list archives and files within them.

![listing archives](assets/ls.png)

```bash
ward ls [options] [archive-ref]

# examples
ward ls                  # list all archives
ward ls --limit 5        # show 5 most recent
ward ls 2                # show archive at index 2
ward ls 66b              # show archive with hash 66b7d91
```

options:
- `--json` - output in JSON format
- `--limit N` - limit output to N entries (0 for unlimited)

### cat
view file contents from an archive.

```bash
ward cat <archive-path>

# examples
ward cat latest/test.txt     # from latest archive
ward cat 2/*.md              # all markdown files from index 2
ward cat 66b/config.json     # from archive with hash 66b7d91
ward cat 66b7d91/config.json # from archive with hash 66b7d91
```

### cp
copy files from any archive to the local filesystem.

```bash
ward cp <archive-path> <destination>

# examples
ward cp latest/test.txt ./local/   # copy to local directory
ward cp '2/*.md' ./docs/           # copy all markdown files
ward cp '66b/*.txt' ./backup/      # copy from specific archive
```

### less
view file contents from an archive with pager.

```bash
ward less <archive-path>

# examples
ward less latest/test.txt
ward less 2/*.md
ward less 66b/config.json
ward less 66b7d91/config.json
```

### verify
check integrity of an archive.

```bash
ward verify [archive-ref]

# examples
ward verify            # verify latest
ward verify 2          # verify index 2
ward verify 66b        # verify hash 66b7d91
```

options:
- `--json` - output in JSON format

### restore
extract files. this will restore the specified archive to the `private` directory.

![restoring an archive](assets/restore.png)

```bash
ward restore [archive-ref]

# examples
ward restore          # latest archive
ward restore 2        # archive at index 2
ward restore 66b      # archive with hash 66b7d91
ward restore 66b7d91  # archive with hash 66b7d91
```

options:
- `--json` - output in JSON format

### pack
create a new archive based on the contents of the `private` directory. files included in the `.encignore` file (if it exists) are excluded from the archive.

```bash
ward pack [options]

# examples
ward pack             # create if changes detected
ward pack --force     # create regardless of changes
```

options:
- `--force` - create archive even if no changes detected

### clean 
remove old archives

```bash
ward clean  # remove all but most recent uncommitted archive
```

## archive references
archives can be referenced in three ways:

1. **by index number**
   ```bash
   ward ls 0         # most recent archive
   ward ls 1         # second archive in list
   ```

2. **by commit hash**
   ```bash
   ward ls 66b       # using first 3 chars
   ward ls 66b7      # using first 4 chars
   ward ls 66b7d91   # using full hash
   ```

3. **special references**
   ```bash
   ward ls latest    # most recent archive
   ```

## file paths
ward uses unix-like paths to access files within archives:

```bash
latest/file.txt      # file from latest archive
0/file.txt           # file from index 0 (same as latest)
2/docs/*.md          # all markdown files from archive index 2
66b/config.json      # config from archive with commit hash 66b7d91
66b7d91/config.json  # config from archive with commit hash 66b7d91
```

- leading slash is optional
- glob patterns are supported
- paths are relative to archive root

## security
- multiple recipients can decrypt archives
  - recipients are specified in the `.env` file
- all files are encrypted using `which gpg` 
- keys never leave your system
- archives can be safely stored in git

## @todo
- [x] add support for gpg passphrase
- [ ] restructure so that the ward package can be imported into other projects easily
- [ ] bin/ward should be smaller in terms of lines of code
- [ ] dockerize to remove dependency and installation issues
- [ ] add unit testing
- [ ] add more examples
- [ ] add more documentation
