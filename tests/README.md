# Testing Best Practices for PUREsuggest

This document outlines testing best practices established through systematic refactoring of our test suite. These patterns prioritize maintainability, readability, and behavior-focused testing.

## 🎯 Core Principles

### 1. **Test Behavior, Not Implementation**
- ✅ **Good**: Test user interactions and expected outcomes
- ❌ **Bad**: Test internal component state or method calls

```javascript
// ❌ Bad - testing implementation details
expect(wrapper.vm.internalMethod).toHaveBeenCalled()
expect(wrapper.vm.someProperty).toBe(expectedValue)

// ✅ Good - testing user behavior
await wrapper.find('[data-testid="add-btn"]').trigger('click')
expect(mockStore.addPublication).toHaveBeenCalledWith(publication.doi)
```

### 2. **Simplify Mocking**
- Use minimal, behavior-focused mocks
- Avoid overly complex mock implementations
- Focus on essential functionality only

```javascript
// ❌ Bad - over-complex D3 mocking
const createMockSelection = () => {
  // 100+ lines of intricate chainable mock construction
}

// ✅ Good - simple behavior mock
const createD3ChainableMock = () => {
  const mock = vi.fn(() => createD3ChainableMock())
  ['append', 'attr', 'select'].forEach(method => {
    mock[method] = vi.fn(() => createD3ChainableMock())
  })
  return mock
}
```

### 3. **Remove Redundant Tests**
- One representative test per behavior
- Avoid excessive boundary testing
- Focus on meaningful edge cases only

```javascript
// ❌ Bad - excessive boundary testing
describe('score boundaries', () => {
  it('should handle score exactly at threshold', () => { /* test */ })
  it('should handle score just below threshold', () => { /* test */ })  
  it('should handle score just above threshold', () => { /* test */ })
  it('should handle fractional scores near boundary', () => { /* test */ })
  // ... 5 more similar tests
})

// ✅ Good - representative testing
describe('score display', () => {
  it('should display various score values correctly', () => {
    // Test a few representative values including edge cases
  })
})
```

## 🛠️ Recommended Tools and Patterns

### Use testUtils.js for Consistency

Import and use standardized patterns:

```javascript
import { 
  createMockSessionStore, 
  createMockInterfaceStore, 
  commonComponentStubs,
  createMockPublication,
  mockExternalDependencies 
} from '../../helpers/testUtils.js'
```

### Store Mocking Pattern

```javascript
// ✅ Consistent store mocking
const mockSessionStore = createMockSessionStore({
  // Override only what you need for this test
  selectedPublications: [mockPublication1, mockPublication2]
})

vi.mock('@/stores/session.js', () => ({ 
  useSessionStore: () => mockSessionStore 
}))
```

### Component Stubbing

```javascript
// ✅ Use standardized stubs
const wrapper = mount(Component, {
  global: {
    stubs: commonComponentStubs
  }
})
```

### External Dependencies

```javascript
// ✅ Use predefined mocks
vi.mock('@/lib/Cache.js', () => mockExternalDependencies.Cache)
vi.mock('@/lib/Util.js', () => mockExternalDependencies.Util)
```

## 📋 Test Structure Guidelines

### File Organization
```
tests/
├── helpers/
│   └── testUtils.js          # Shared utilities and mocks
├── unit/
│   ├── components/           # Component tests
│   ├── stores/              # Store tests  
│   ├── utils/               # Utility function tests
│   └── bugs/                # Regression tests for specific bugs
└── performance/             # Performance benchmarks
```

### Test Naming
- Use descriptive test names that explain the behavior
- Group related tests in `describe` blocks
- Use consistent naming patterns

```javascript
describe('PublicationComponent', () => {
  describe('User Interactions', () => {
    it('should call queueForSelected when add button is clicked', () => {
      // Test user interaction and expected behavior
    })
  })
  
  describe('Display Logic', () => {
    it('should show score with appropriate styling', () => {
      // Test visual behavior
    })
  })
})
```

## ⚠️ Anti-Patterns to Avoid

### 1. **Over-Mocking External Libraries**
```javascript
// ❌ Bad - 100+ lines of D3.js mocking
global.d3 = {
  select: vi.fn(() => ({
    append: vi.fn(() => ({
      attr: vi.fn(() => ({
        // ... endless nesting
      }))
    }))
  }))
}

// ✅ Good - Simple behavior stub
vi.mock('d3', () => ({ 
  select: vi.fn(() => createD3ChainableMock()),
  zoom: vi.fn(() => ({ on: vi.fn(), transform: vi.fn() }))
}))
```

### 2. **Testing Implementation Details**
```javascript
// ❌ Bad - brittle to implementation changes  
expect(wrapper.vm.svg).toBeDefined()
expect(wrapper.vm.simulation.nodes).toHaveBeenCalled()

// ✅ Good - focuses on user-visible behavior
expect(wrapper.find('.network-visualization').exists()).toBe(true)
expect(wrapper.emitted('publication-selected')).toBeTruthy()
```

### 3. **Excessive Edge Case Testing**
```javascript
// ❌ Bad - testing every possible edge case
it('should handle null DOI', () => { /* test */ })
it('should handle empty string DOI', () => { /* test */ })
it('should handle undefined DOI', () => { /* test */ })
it('should handle whitespace-only DOI', () => { /* test */ })

// ✅ Good - test meaningful edge cases only
it('should handle invalid DOI gracefully', () => {
  // Test with null, empty, or malformed DOI
})
```

## 📊 Success Metrics

Our refactoring achieved:
- **80% reduction** in D3 mocking complexity
- **Zero test failures** during refactoring
- **8 redundant tests removed** (473 → 465 total)
- **Faster test execution** due to simpler mocks
- **Improved maintainability** - tests less likely to break on refactoring

## 🚀 Future Guidelines

1. **Before adding new tests**: Check if existing tests cover the behavior
2. **Before complex mocking**: Consider if the test is testing the right thing
3. **Before testing internal state**: Ask if a user would notice this behavior
4. **Use testUtils**: Leverage established patterns for consistency
5. **Test user flows**: Focus on complete user interactions rather than isolated units

## 🔧 Common Test Utilities Reference

### Mock Factories
- `createMockSessionStore(overrides)` - Standard session store
- `createMockInterfaceStore(overrides)` - Standard interface store  
- `createMockPublication(overrides)` - Standard publication object
- `createD3ChainableMock()` - D3.js chainable methods

### Component Stubs
- `commonComponentStubs` - Standard Vuetify and custom component stubs
- `mockExternalDependencies` - Cache, Util, and other external mocks

### Testing Patterns
- `createMockElement(id, nodeName)` - DOM element mocks
- Focus on `data-testid` attributes for reliable element selection
- Use behavior-driven test descriptions

---

**Remember**: Good tests protect against regressions while being resilient to implementation changes. They should fail when functionality breaks, not when code is refactored.