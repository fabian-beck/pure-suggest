---
description: Clean up the tests by identifying trivial, redundant, fragile, or overly convoluted tests and suggesting improvements.
---

Clean up the tests by analyzing the test suite for:

1. **Trivial functionality** - Tests that check basic language features or framework behavior
2. **Redundant tests** - Tests that duplicate coverage provided by other tests
3. **Fragile tests** - Tests that break easily with minor implementation changes (brittle)
4. **Overly convoluted tests** - Tests with unnecessarily complex setup, mocking, or assertions

For meaningful but problematic tests, suggest refactoring approaches to make them more robust and maintainable. For truly trivial or redundant tests, recommend removal.
