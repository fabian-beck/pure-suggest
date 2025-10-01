# Find Bug Command

**Usage**: `/find-bug [optional-focus-area]`

**Description**: Deep analysis to discover real bugs in the codebase through systematic examination, edge case analysis, and test-driven verification.

## Parameters

- `optional-focus-area` (optional): Specific component, feature, or file to focus analysis on

## Procedure

This command follows a systematic approach to discover and verify real bugs:

### 1. **Codebase Analysis**

- Identify critical code paths and complex logic areas
- Review recent changes and refactorings that might introduce regressions
- Analyze error-prone patterns: state management, async operations, edge cases, data transformations
- Focus on components with limited test coverage
- Look for boundary conditions and validation gaps

### 2. **Deep Logic Inspection**

- Examine conditional logic for missing branches or incorrect conditions
- Check for race conditions in async code
- Identify off-by-one errors, null/undefined handling gaps
- Review data transformation pipelines for edge cases
- Analyze component lifecycle and state update sequences
- Look for inconsistent error handling
- Check for memory leaks or performance issues

### 3. **Test-Driven Bug Verification**

- **Write failing tests first** to reproduce suspected bugs
- Create tests for edge cases that might not be handled
- Test boundary conditions (empty arrays, null values, extreme inputs)
- Test error scenarios and exception handling
- Verify tests actually fail before fixing
- Ensure tests demonstrate the real issue

### 4. **Root Cause Analysis**

- Confirm the bug is real and reproducible
- Document why the bug occurs (logic error, missing validation, race condition, etc.)
- Assess impact and severity
- Identify related code that might have similar issues

### 5. **Fix Implementation**

- Implement minimal fix that addresses root cause
- Handle edge cases properly
- Add defensive checks where needed
- Follow existing code patterns
- Ensure backward compatibility

### 6. **Verification & Testing**

- Run new tests to verify they now pass
- Run full test suite to ensure no regressions
- Run linting and type checking
- Test manually if UI changes involved

## Analysis Focus Areas

### **High-Priority Targets**

- State management logic (Pinia stores)
- Data transformation functions
- API integration and error handling
- Citation/reference processing algorithms
- Filter and search logic
- Network visualization calculations
- Publication scoring and ranking

### **Common Bug Patterns to Check**

- Unhandled null/undefined values
- Array operations on empty arrays
- Async race conditions
- Missing error boundaries
- Incorrect conditional logic
- Off-by-one errors in loops/pagination
- State mutations vs immutability
- Event listener cleanup
- Cache invalidation issues

### **Edge Cases to Verify**

- Empty datasets (no publications, no citations)
- Single-item collections
- Maximum load scenarios
- Rapid user interactions
- Network failures and retries
- Invalid or malformed data
- Concurrent operations

## Example Usage

```bash
/find-bug
```

```bash
/find-bug FilterMenuComponent
```

```bash
/find-bug citation processing
```

## Expected Outcomes

After running this command, you should have:

- ✅ Identified at least one real, reproducible bug
- ✅ Root cause analysis explaining why the bug exists
- ✅ Failing tests that demonstrate the bug
- ✅ Implementation that fixes the bug
- ✅ All tests passing including new ones
- ✅ No regressions in existing functionality
- ✅ Documentation of the bug and fix

## Success Criteria

A bug is considered **real** if:

1. It causes incorrect behavior or errors in real usage scenarios
2. It can be reproduced consistently
3. It has a clear root cause in the code
4. It impacts functionality, not just style preferences
5. Tests can demonstrate the failure and success states

## Notes

- Focus on finding **real bugs** that impact functionality, not theoretical issues
- Prioritize bugs that users would encounter in normal usage
- Look for bugs in undertested areas
- Consider performance bugs and memory leaks
- Think about mobile/responsive issues
- Check accessibility concerns
