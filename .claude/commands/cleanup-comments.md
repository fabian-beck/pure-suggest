---
description: Clean up the codebase by identifying and removing trivial, unnecessary, or outdated comments while preserving meaningful documentation.
---

Clean up the codebase by analyzing comments for:

1. **Trivial comments** - Comments that simply restate what the code obviously does
2. **Outdated comments** - Comments that no longer match the current implementation  
3. **Redundant comments** - Comments that duplicate information available elsewhere
4. **Noise comments** - TODO items that are completed, debugging comments, or temporary notes

## Analysis Categories

### **Trivial Comments to Remove**
- Comments that restate obvious code: `// Set variable to true` above `isActive = true`
- Variable/function name restatements: `// Get user name` above `getUserName()`
- Basic language feature explanations: `// Loop through array` above `for` loops
- Self-evident return statements: `// Return result` above `return result`

### **Outdated Comments to Update or Remove**
- Comments describing old implementations that have been refactored
- Parameter descriptions that don't match current function signatures
- Workflow descriptions that reference removed features
- Architecture comments that describe obsolete patterns

### **Redundant Comments to Remove** 
- Comments duplicating JSDoc or similar documentation
- Repeated explanations across similar functions
- Comments that duplicate information in nearby code
- Section headers for obvious groupings

### **Noise Comments to Clean Up**
- Completed TODO items: `// TODO: Add validation` when validation exists
- Debugging artifacts: `// console.log for testing`, commented-out `console.log`
- Temporary development notes: `// FIXME: temporary solution`
- Dead code comments: `// Old implementation below` with no code

## Preservation Guidelines

### **Comments to Keep**
- **Business logic explanations**: Why specific algorithms or approaches were chosen
- **Non-obvious calculations**: Mathematical formulas, complex transformations
- **Integration requirements**: API contracts, external system dependencies  
- **Performance optimizations**: Explanations of performance-critical code choices
- **Security considerations**: Authentication, validation, or sanitization rationale
- **Bug workarounds**: Explanations of unusual code that addresses specific issues
- **Complex regular expressions**: Pattern explanations and example matches
- **Configuration explanations**: Why certain settings or flags are used

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

- **Preserve intent over implementation**: Keep comments explaining "why", remove those explaining "what"
- **Update rather than remove** when comments serve a purpose but are outdated
- **Consider maintenance burden**: Remove comments that require frequent updates due to code changes
- **Focus on readability**: Ensure code remains clear and self-documenting after comment removal
- **Be conservative with complex code**: Keep explanatory comments for intricate business logic

This systematic approach improves code maintainability by removing comment debt while preserving valuable documentation that aids understanding and maintenance.