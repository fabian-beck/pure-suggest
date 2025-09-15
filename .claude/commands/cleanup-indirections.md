---
description: Detect and cleanup unnecessary function indirections - minimal functions with single callers
---

Analyze the codebase to identify and fix unnecessary function indirections: functions that are minimal (1-4 lines of code) and only called from a single location.

## What It Does

1. **Detects candidates** using the indirection detector tool
2. **Analyzes safety** of inlining each candidate function
3. **Reports findings** with detailed analysis of potential improvements
4. **Suggests cleanup** for functions that can be safely inlined or removed

## Detection Criteria

- **Line count**: Functions with 1-4 significant lines of code
- **Usage count**: Functions called from only one location
- **Complexity**: Simple functions that can be safely inlined

## Analysis Process

First, run the detection tool to analyze the codebase:

```bash
node tools/indirection-detector.js src
```

Then investigate the top candidates manually, focusing on:
- Single-line return statements
- Simple variable assignments
- Functions that just call other functions
- Getters that return simple expressions

## Safe Cleanup Patterns

### Inline Simple Returns
```javascript
// Before
function isValid() { return this.value !== null; }
// Usage: if (isValid()) { ... }

// After
// Usage: if (this.value !== null) { ... }
```

### Merge Adjacent Methods
```javascript
// Before
function getValue() { return this.data.value; }
function processValue() { return getValue().trim(); }

// After
function processValue() { return this.data.value.trim(); }
```

### Remove Unnecessary Wrappers
```javascript
// Before
function handleClick() { this.onClick(); }
// Usage: @click="handleClick"

// After
// Usage: @click="onClick"
```

## Manual Review Required

Always manually review candidates before cleanup. The goal is **removing unnecessary indirections** while preserving meaningful abstractions.

### **Good Candidates for Inlining:**

**Trivial Wrappers**
- Simple property access: `return items.map(item => item.property)`
- Basic calculations: `return Math.min(-200, -100 * Math.sqrt(x))`
- Simple ternary conditions: `return condition ? valueA : valueB`
- One-line utility functions: `return string.replace(/pattern/g, 'replacement')`

**Unnecessary Abstractions**
- Functions that don't add semantic clarity when inlined
- Single-use utilities that are self-explanatory at call site
- Getters that just return simple expressions

### **Consider Keeping When:**

**Meaningful Semantics**
- Function name significantly improves code readability
- Complex operations that benefit from descriptive naming
- Business logic that may evolve (calculations, validations)

**Template Readability**
- Functions called from Vue templates that would become complex inline expressions
- Template logic that would harm readability if inlined (multi-line expressions, complex conditions)
- Functions that keep template code clean and declarative

**Architectural Consistency**
- Part of established patterns (if you keep one `clearXHighlight`, keep all)
- API consistency across similar utility modules
- Functions likely to be extended or called from multiple places in future

**Complexity Threshold**
- Multi-step operations even if currently short
- Functions with conditional logic or error handling
- Operations involving external libraries (D3, DOM manipulation)

### **Evaluation Process:**
1. **Ask: Does the function name add clarity?** If inlining makes code less readable, keep it
2. **Consider consistency:** Don't create inconsistent patterns
3. **Assess complexity:** Simple expressions are good inline candidates
4. **Future-proof:** Will this logic likely grow or be reused?

**When in doubt, inline it** - you can always extract it back if needed.

## Marking Reviewed Functions

For functions that you analyze but decide to keep (for architectural consistency, meaningful abstractions, etc.), mark them with a parsable comment to prevent them from appearing in future analysis runs:

```javascript
/**
 * Calculate charge strength based on selected publications
 */
// @indirection-reviewed: architectural-consistency - part of get*ForceStrength pattern
export function getChargeStrength(selectedPublicationsCount) {
  return Math.min(-200, -100 * Math.sqrt(selectedPublicationsCount))
}
```

### Standard Review Reasons:

- **`architectural-consistency`** - Part of established patterns (e.g., `get*ForceStrength`, `clear*Highlight`)
- **`meaningful-abstraction`** - Function name adds significant clarity (e.g., D3 data binding helpers)
- **`template-readability`** - Keeps Vue template code clean and readable
- **`business-logic`** - Contains domain logic that may evolve
- **`complex-operation`** - Multi-step operations despite being short
- **`api-consistency`** - Maintains consistent interface across modules

The detector will automatically skip marked functions in future runs and show them in a separate "Previously reviewed" section.

## Workflow

**Work step by step on one function at a time:**

1. **Select one candidate** from the detection results
2. **Analyze** if it should be inlined based on the criteria above
3. **Either:**
   - **Inline the function** and update caller, OR
   - **Mark as reviewed** with `// @indirection-reviewed: <reason>` comment
4. **Test immediately**: `npm test` to verify functionality
5. **Lint immediately**: `npm run lint` to check code quality
6. **Fix any issues** before moving to the next function
7. **Repeat** for the next candidate

This step-by-step approach prevents breaking changes and maintains code quality throughout the cleanup process.