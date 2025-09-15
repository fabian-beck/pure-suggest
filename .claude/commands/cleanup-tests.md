---
description: Analyze unit tests for performance optimization and cleanup opportunities
argument-hint: [test-directory]
---

Analyze the unit test suite to identify optimization opportunities and suggest improvements:

## Performance Analysis
- **Execution Time**: Identify tests with excessive runtime (>100ms) and investigate root causes
- **Heavy Mounting**: Find component tests that mount full trees when simpler approaches would suffice
- **Complex Mocking**: Locate tests where mock setup complexity outweighs the actual test value
- **Async Delays**: Detect unnecessary setTimeout/delay patterns that slow test execution

## Quality Assessment
- **Trivial Tests**: Flag tests that verify basic language or framework behavior rather than business logic
- **Duplicate Coverage**: Identify tests that redundantly verify the same functionality
- **Brittle Tests**: Find tests that break easily with minor implementation changes
- **Over-Engineering**: Spot tests with unnecessarily complex setup, assertions, or mocking patterns

## Optimization Recommendations
- Prioritize tests with high execution time but low added value
- Suggest converting integration-style tests to focused unit tests
- Recommend consolidation of similar test scenarios
- Propose simpler testing approaches for complex mock scenarios
- Identify candidates for test removal vs. refactoring

Provide specific, actionable recommendations that balance test execution speed with comprehensive coverage of critical functionality. Focus on the unit test directory structure and patterns rather than performance tests.
