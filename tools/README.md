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

## constant-usage-analyzer.js

**Purpose:** Analyzes usage patterns of exported constants across the codebase to identify unused or underutilized constants and understand their distribution.

**Usage:**

```bash
node tools/constant-usage-analyzer.js
```

**What it does:**

1. Scans all files in `src/constants/` to extract exported constants
2. Searches through all source and test files for usage of each constant
3. Categorizes usage by file type (source vs test files)
4. Identifies which files define vs consume each constant
5. Generates usage statistics and saves detailed analysis to JSON

**Output:**

- **Console Report**: Summary of each constant with usage counts and file locations
- **JSON File**: Detailed analysis saved to `tools/output/constant-usage-analysis.json`

**Example Output:**

```
🔍 Analyzing constant usage patterns...

Found 3 constant files: index.js, themes.js, validation.js
Searching through 127 files for usage patterns

📊 CONSTANT USAGE ANALYSIS:

📁 DEFAULT_THEME (from src/constants/themes.js):
  ✅ Used in 5 files (2 source, 3 test)
  📄 src/components/ThemeSelector.vue (1 usage)
  📄 src/stores/interface.js (2 usages)
  🧪 tests/unit/themes.test.js (3 usages)

⚠️  VALIDATION_RULES (from src/constants/validation.js):
  ⚠️  Used in 1 file (1 source, 0 test) - potentially underutilized
  📄 src/utils/validators.js (1 usage)

❌ UNUSED_CONSTANT (from src/constants/index.js):
  ❌ No usage found - consider removing

📈 SUMMARY:
- Total constants: 15
- Used constants: 12 (80%)
- Unused constants: 3 (20%)
- Underutilized: 2 (13%)
```

**Use Cases:**
- Identify unused constants for cleanup
- Understand constant distribution across the codebase
- Find constants that may need better adoption
- Audit constants before refactoring

## dependency-analyzer.js

**Purpose:** Analyzes import/export relationships and dependencies across the entire codebase, generating a comprehensive project dependency overview.

**Usage:**

```bash
node tools/dependency-analyzer.js
```

**What it does:**

1. Scans all `.vue`, `.js`, `.ts`, and `.mjs` files in the project
2. Extracts import statements and categorizes them (local vs external)
3. Identifies exports from each file
4. Analyzes Vue-specific patterns (template components, store usage)
5. Generates dependency graph and statistics

**Output:**

- **Console Report**: Detailed breakdown by file type with imports/exports
- **GraphML File**: Dependency graph saved to `tools/output/project-dependencies.graphml`

**Example Output:**

```
📊 Project Overview:

=== Vue Components (45) ===

📁 NetworkVisComponent.vue (src/components/NetworkVisComponent.vue)
  📦 Local: ./NetworkControls.vue, @/stores/session, @/utils/network/forces
  📚 External: d3, tippy.js
  📤 Exports: default
  🏪 Stores: sessionStore, interfaceStore
  🧩 Template Components: NetworkControls, NetworkPerformanceMonitor

=== JavaScript Modules (23) ===

📁 forces.js (src/utils/network/forces.js)
  📦 Local: @/constants
  📚 External: d3
  📤 Exports: getChargeStrength, createForceSimulation

=== Summary Statistics ===

File Types:
- Vue Components: 45 files
- JavaScript Modules: 23 files
- TypeScript Files: 2 files

Dependencies:
- Total import relationships: 156
- Local dependencies: 89 (57%)
- External dependencies: 67 (43%)
- Most imported external: d3 (12 files)
- Most imported local: @/stores/session (18 files)
```

**Generated Files:**
- `tools/output/project-dependencies.graphml` - Import graph for visualization tools

**Use Cases:**
- Understand project architecture and dependency flow
- Identify tightly coupled modules
- Find candidates for refactoring or extraction
- Visualize dependency graphs in external tools
- Audit external dependency usage

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
