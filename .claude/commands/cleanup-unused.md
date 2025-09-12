---
description: Find and clean unused legacy code by identifying dead code, unused imports, obsolete functions, and deprecated patterns using automated tools.
---

Find and clean unused legacy code using the automated unused function detection tool:

## Quick Analysis

Run the automated unused function finder:

```bash
node tools/find-unused-functions.js
```

This tool analyzes the codebase for:

1. **Dead code** - Functions, methods, or classes that are never called or imported
2. **Unused imports** - Import statements that don't have corresponding usage
3. **Obsolete functions** - Legacy utility functions that have been replaced by newer implementations
4. **Deprecated patterns** - Old Vue 2 patterns, unused Vuetify components, or outdated CSS classes
5. **Unreferenced files** - Files that are no longer imported or used anywhere in the project
6. **Commented-out code** - Old code blocks that are commented out and no longer needed

## Manual Verification Required

The tool provides candidates that need manual verification. For each identified unused piece, verify it's truly unused by checking:

- Import statements across the codebase
- Dynamic imports or string-based references
- Template usage in Vue components
- Test file references
- Vue component method calls via `$refs`
- Store method calls from components

## Focus Areas

The analysis covers:

- Vue components and composables in `src/components/` and `src/composables/`
- Utility functions in `src/lib/` and `src/core/`
- Store modules that may have unused getters/actions
- Test files that test removed functionality

## Safe Removal Guidelines

Prioritize removal candidates with highest confidence:

1. **Test utilities never imported** - Safe to remove
2. **Private methods with single occurrence** - Usually safe
3. **Legacy helper functions** - Check for string-based calls first
4. **Store methods never called** - Verify no dynamic access
5. **Component methods** - Check template usage and ref calls

After verification, remove unused code and commit changes with descriptive messages.
