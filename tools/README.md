# Development Tools

This directory contains utility scripts for maintaining code quality and identifying potential improvements.

## find-unused-functions.js

**Purpose:** Identifies potentially unused functions in the codebase by finding function definitions that appear only once (suggesting they may only exist in their definition but never called).

**Usage:**

```bash
node tools/find-unused-functions.js
```

**What it does:**

1. Scans all `.js`, `.vue`, and `.ts` files in `src/` and `tests/` directories
2. Extracts function definitions using multiple patterns:
   - `function functionName()`
   - `const functionName = () =>`
   - `methodName() {}`
   - `export function functionName()`
   - etc.
3. Counts how many times each function name appears across all files
4. Reports functions that appear exactly once (potentially unused)

**Example Output:**

```
🔍 Searching for potentially unused functions...

📁 Scanning 107 files in [src, tests]
🎯 Found 600 function definitions

📋 POTENTIALLY UNUSED FUNCTIONS:
==================================================

📄 src/core/PublicationSearch.js:
  • computeTitleSimilarity (line 33)

📄 src/stores/author.js:
  • updateSettings (line 51)

📊 Summary: 2 potentially unused functions found
```

**Important Notes:**

- **Manual verification required** - Results are suggestions, not definitive
- Functions may be called dynamically via strings
- Functions may be used in Vue templates
- Test utilities and mocks are often only defined once
- Public API functions may legitimately appear once
- Consider the context before removing any code

**Limitations:**

- Cannot detect dynamic function calls (`obj[functionName]()`)
- Cannot detect template usage in Vue components
- May miss functions used in external build tools or configs
- Does not understand complex import/export patterns

**Best Practices:**

1. Review each result manually
2. Search codebase for string references to function names
3. Check if function is part of public API or external interface
4. Verify function isn't used in Vue templates or computed properties
5. Consider if function serves as documentation or future use case
