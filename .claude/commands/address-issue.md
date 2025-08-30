# Address Issue Command

**Usage**: `\address-issue <issue-number> [optional-comments]`

**Description**: Systematically addresses a GitHub issue following a test-driven development approach with proper analysis, implementation, testing, and PR creation.

## Parameters
- `issue-number` (required): The GitHub issue number to address
- `optional-comments` (optional): Additional context or specific requirements for the fix

## Procedure

This command follows a systematic 6-step approach to address GitHub issues:

### 1. **Issue Analysis & Branch Creation**
- Fetch and analyze the GitHub issue using `gh issue view <issue-number>`
- Understand the problem description and expected behavior
- Create a descriptive feature branch: `fix-<issue-description>-<issue-number>`
- Set up todo tracking to manage the workflow

### 2. **Root Cause Investigation**
- Search codebase to locate relevant files and components
- Understand the current implementation and identify why the issue occurs
- Use debugging techniques (reading code, checking test failures, analyzing error patterns)
- Document the root cause(s) - there may be multiple underlying problems

### 3. **Test-Driven Development**
- **First**: Write failing tests that reproduce the issue
- Ensure tests actually fail with the current buggy code
- Cover edge cases and error conditions
- Write tests for both the main functionality and error handling scenarios

### 4. **Implementation & Fix**
- Implement the minimal fix that addresses the root cause
- Follow existing code patterns and conventions
- Handle edge cases gracefully with proper error handling
- Ensure the fix is robust and doesn't introduce new issues

### 5. **Verification & Testing**
- Run the new tests to verify they now pass
- Run the full test suite to ensure no regressions
- Run linting to maintain code quality
- Test edge cases and error conditions
- Verify the fix works as intended

### 6. **Commit & Pull Request**
- Stage and commit changes with a descriptive commit message
- Push the branch to the remote repository
- Create a comprehensive pull request with:
  - Clear summary of changes
  - Root cause analysis explanation
  - Technical implementation details
  - Test plan and verification steps
- Reference the original issue with "Fixes #<issue-number>"
- Switch back to main branch after PR creation

## Best Practices Followed

### **Code Quality**
- Follow existing code conventions and patterns
- Write minimal, focused fixes that address the specific issue
- Include proper error handling for edge cases
- Maintain backward compatibility

### **Testing Strategy**
- Write tests that would fail without the fix
- Cover both happy path and edge cases
- Ensure tests are maintainable and clearly describe the expected behavior
- Update existing tests if the fix changes behavior

### **Documentation**
- Write clear commit messages that explain the "why" not just the "what"
- Create detailed PR descriptions with root cause analysis
- Include test plans and verification steps
- Reference the original issue for traceability

### **Process**
- Use todo tracking to maintain organized workflow
- Verify all tests pass before committing
- Run code quality checks (linting, type checking)
- Create focused, single-purpose commits
- Follow the project's branching and PR conventions

## Example Usage

```bash
\address-issue 525
```

```bash
\address-issue 525 "Focus specifically on keyboard navigation issues"
```

## Expected Outcomes

After running this command, you should have:
- ✅ A thorough understanding of the issue and its root cause
- ✅ A feature branch with the implemented fix
- ✅ Comprehensive test coverage for the fix
- ✅ All tests passing (including existing ones)
- ✅ A pull request ready for review
- ✅ Proper documentation and traceability

This systematic approach ensures consistent, high-quality issue resolution that follows software engineering best practices and maintains code quality standards.