# Project Tools

This directory contains development and analysis tools for the PUREsuggest project.

## Dependency Analyzer

**File**: `dependency-analyzer.js`

Analyzes the complete project dependency structure and generates visual dependency graphs.

### Features
- Analyzes all project files (.vue, .js, .ts, .mjs)
- Detects imports, template usage, store dependencies
- Categorizes files by type (Components, Stores, Composables, etc.)
- Generates GraphML output for network visualization tools

### Usage
```bash
cd tools
node dependency-analyzer.js
```

### Output
- Console analysis with dependency statistics
- `tools/output/project-dependencies.graphml` - Network graph file for yEd/Gephi

### GraphML Features
- Color-coded nodes by file type
- Clean black dependency arrows
- 16pt Arial font labels
- Optimized for yEd visualization

### Supported File Types
- Vue Components (.vue)
- JavaScript/TypeScript modules (.js, .ts, .mjs)
- Pinia stores
- Vue composables
- Constants and utilities