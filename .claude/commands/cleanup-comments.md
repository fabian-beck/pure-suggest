---
description: Clean up the codebase by identifying and removing trivial, unnecessary, or outdated comments while preserving meaningful documentation.
---

Clean up the codebase by analyzing comments for:

1. **Noise comments** - TODO items that are completed, debugging comments, or temporary notes
2. **Outdated comments** - Comments that no longer match the current implementation
3. **Redundant comments** - Comments that duplicate information available elsewhere
4. **Truly trivial comments** - Only the most obvious restatements of what code does

## Analysis Categories

### **Truly Trivial Comments to Remove** (Be Very Conservative)

- Extremely obvious restatements: `// Return true` above `return true`
- Direct variable assignments: `// Set x to 5` above `x = 5`
- Only remove if the comment adds absolutely no value and the code is completely self-evident

### **Outdated Comments to Update or Remove**

- Comments describing old implementations that have been refactored
- Parameter descriptions that don't match current function signatures
- Workflow descriptions that reference removed features
- Architecture comments that describe obsolete patterns

### **Redundant Comments to Remove**

- Comments duplicating JSDoc or similar documentation
- Repeated explanations across similar functions
- Comments that duplicate information in nearby code

### **Noise Comments to Clean Up**

- Completed TODO items: `// TODO: Add validation` when validation exists
- Debugging artifacts: `// console.log for testing`, commented-out `console.log`
- Temporary development notes: `// FIXME: temporary solution`
- Dead code comments: `// Old implementation below` with no code

## Preservation Guidelines

### **Comments to Keep** (Default: Preserve Most Comments)

- **Business logic explanations**: Why specific algorithms or approaches were chosen
- **Non-obvious calculations**: Mathematical formulas, complex transformations
- **Integration requirements**: API contracts, external system dependencies
- **Performance optimizations**: Explanations of performance-critical code choices
- **Security considerations**: Authentication, validation, or sanitization rationale
- **Bug workarounds**: Explanations of unusual code that addresses specific issues
- **Complex regular expressions**: Pattern explanations and example matches
- **Configuration explanations**: Why certain settings or flags are used
- **Structural headers**: Comments that organize code sections and provide navigation
- **Step-by-step sequences**: Comments that break down multi-step processes or algorithms
- **Non-straightforward mechanisms**: Comments explaining code that isn't immediately clear
- **Code organization**: Comments that improve readability by grouping related functionality
- **Workflow organization**: Comments that separate logical phases like "// Clear all active states first"
- **Section separators**: Comments that group related operations like "// Set active state for selected publications"
- **Implementation guidance**: Comments that explain multi-step string processing operations
- **Context provision**: Comments that explain what a block of code is doing at a high level

### **Comments to Improve Rather Than Remove**

- Vague comments that could be more specific
- Comments that could include examples
- Outdated comments that still serve a purpose but need updating

## Process

1. **Scan codebase** systematically for comment patterns
2. **Categorize findings** into the cleanup categories above
3. **Prioritize changes** by impact and risk (start with safest removals)
4. **Apply changes** in focused commits by category or file
5. **Verify functionality** remains intact after cleanup
6. **Document summary** of cleanup performed

## Best Practices

- **Default to preservation**: Only remove comments that are clearly problematic or add no value
- **Preserve structural organization**: Keep comments that organize code sections and workflows
- **Preserve intent over implementation**: Keep comments explaining "why", be very careful removing "what"
- **Update rather than remove** when comments serve a purpose but are outdated
- **Focus on truly problematic comments**: Only target completed TODOs, debugging artifacts, and dead code comments
- **Be extremely conservative**: If there's any doubt about a comment's value, keep it
- **Preserve workflow clarity**: Keep comments that break down complex operations into logical steps
- **Maintain code organization**: Keep comments that group related functionality
- **When in doubt, keep it**: Strongly err on the side of preservation - better to have too many comments than too few

This systematic approach improves code maintainability by removing comment debt while preserving valuable documentation that aids understanding and maintenance.
