# for javascript (including bun and node) and coffeescript
1. use 2-space tab indentation
2. when defining objects to be stored, always prefer to use snake_case for the field names.
3. when creating files, always prefer to use the - delimiter (example: api-keys.coffee, api-keys.js) if one is needed instead of camelCase
4. don't add comments if code is doing something obvious

# for code dependencies (especially in node.js, bun and coffeescript):
1. within each dependency group, order by total text length of the line (shortest to longest)
   Example ordering by length:
   ```coffee
   fs = require 'fs'                              # length: 17
   path = require 'path'                          # length: 21
   { createHash } = require 'crypto'              # length: 33
   { existsSync, readFileSync } = require 'fs'    # length: 45
   ```

2. if two dependencies have the same text length:
   - prefer the one with the shorter variable name first
   - if variable names are same length, sort alphabetically

3. if a vim modeline exists, don't insert a line break after it

4. group dependencies in this order:
   - group 0: environmental setup (dotenv, global configs)
   - group 1: debugging utilities (console, process)
   - group 2: native node modules (fs, path, crypto)
   - group 3: third-party npm modules
   - group 4: local project modules
   - group 5: data files and constants

5. use logical line breaks between groups

6. within group 3 (third-party), subgroup related modules:
   ```coffee
   # express and middleware together
   express = require 'express'
   compression = require 'compression'

   # standalone modules
   _ = require 'lodash'
   timebase = require 'timebase'
   ```

7. when instantiating a constructor, place it immediately after its import:
   ```coffee
   Redis = require 'ioredis'
   redis = new Redis { uri: env.REDIS_URI }
   ```

### simple example
```
{ log } = require 'console'
{ process, env } = require 'process'

{ createHash } = require 'crypto'
{ existsSync, readFileSync } = require 'fs'

_ = require 'lodash'
timebase = require 'timebase'
pluralize = require 'pluralize'

Redis = require 'ioredis'
redis = new Redis { uri: env.REDIS_URI }

MemoryCache = require 'memory-cache'
memoryCache = new MemoryCache()

helpers = require './helpers'
```

# for all code
1. only use lowercase for comments unless referring to something in the code which needs to contain an uppercase character
  - another exception is if you're writing in a language that requires uppercase characters for comments (like COBOL)
2. liberally insert logical line breaks within your code but never use double line breaks (\n\n)
3. when adding a comment above a line of code, always make sure there's a line break above it

