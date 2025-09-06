---
description: Find and clean unused legacy code by identifying dead code, unused imports, obsolete functions, and deprecated patterns.
---

Find and clean unused legacy code by analyzing the codebase for:

1. **Dead code** - Functions, methods, or classes that are never called or imported
2. **Unused imports** - Import statements that don't have corresponding usage
3. **Obsolete functions** - Legacy utility functions that have been replaced by newer implementations
4. **Deprecated patterns** - Old Vue 2 patterns, unused Vuetify components, or outdated CSS classes
5. **Unreferenced files** - Files that are no longer imported or used anywhere in the project
6. **Commented-out code** - Old code blocks that are commented out and no longer needed

Focus on:
- Vue components and composables in `src/components/` and `src/composables/`
- Utility functions in `src/lib/` and `src/core/`
- CSS/SCSS files for unused styles
- Store modules that may have unused getters/actions
- Test files that test removed functionality

For each identified unused piece, verify it's truly unused by checking:
- Import statements across the codebase
- Dynamic imports or string-based references
- Template usage in Vue components
- Test file references

Provide a summary of findings and suggest safe removal candidates, prioritizing files/functions with the highest confidence of being unused.