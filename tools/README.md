# Development Tools

This directory contains utility scripts for maintaining code quality and identifying potential improvements.

## indirection-detector.js

**Purpose:** Detects and helps clean up unnecessary function indirections - minimal functions (1-4 lines) that are only called from a single location and could be safely inlined.

**Usage:**

```bash
# Concise output (default) - shows only actionable candidates
node tools/indirection-detector.js src

# Detailed output - shows all function categories
node tools/indirection-detector.js src --verbose
node tools/indirection-detector.js src -v
```

**What it does:**

1. Scans all `.js`, `.vue`, and `.ts` files in the specified directory
2. Extracts function definitions using comprehensive patterns:
   - Function declarations: `function name() {}`
   - Arrow functions: `const name = () => {}`
   - Vue computed: `const name = computed(() => {})`
   - Method definitions: `name() {}`
3. Analyzes usage patterns across the entire codebase
4. Categorizes functions and identifies true indirection candidates

**Function Categories:**

- **Indirection candidates**: Short functions with single callers (actionable)
- **Template-bound**: Functions used in Vue templates (excluded)
- **Previously reviewed**: Functions marked with `@indirection-reviewed` comments (skipped)
- **Unused**: Functions with no detected usage (rare)

**Review Comment System:**

Mark analyzed functions to prevent them from appearing in future runs:

```javascript
/**
 * Calculate force strength based on selected publications
 */
// @indirection-reviewed: architectural-consistency - part of get*ForceStrength pattern
export function getChargeStrength(selectedPublicationsCount) {
  return Math.min(-200, -100 * Math.sqrt(selectedPublicationsCount))
}
```

**Standard Review Reasons:**
- `architectural-consistency` - Part of established patterns
- `meaningful-abstraction` - Function name adds significant clarity
- `business-logic` - Contains domain logic that may evolve
- `complex-operation` - Multi-step operations despite being short
- `api-consistency` - Maintains consistent interface across modules

**Example Output (Concise):**

```
🔍 Analyzing function indirections...

📊 Found 11 indirection candidates (0 unused, 6 reviewed, 26 template-bound) - use --verbose for details

🎯 Function indirection candidates (single caller):

📁 src\components\FilterMenuComponent.vue
   Function: getDoiTooltip
   Lines: 2 | Usages: 1
   Body preview: const publication = sessionStore.getSelectedPublicationByDoi(doi)...

💡 Run 'claude cleanup-indirections' to review and fix these candidates.
```

**Best Practices:**

1. **Work step by step** - Process one function at a time
2. **Test immediately** - Run tests after each change
3. **Consider consistency** - Don't break architectural patterns
4. **Mark reviewed functions** - Use review comments for functions you keep
5. **When in doubt, inline it** - You can always extract it back if needed

**Integration:**

Use with the Claude Code command `/cleanup-indirections` for guided cleanup workflow.

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
