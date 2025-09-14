#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class IndirectionDetector {
  constructor() {
    this.candidates = [];
    this.functionMap = new Map();
  }

  async analyze(sourceDir) {
    console.log('🔍 Analyzing function indirections...\n');

    await this.scanFiles(sourceDir);
    this.detectCandidates();
    this.reportFindings();
  }

  async scanFiles(dir) {
    const files = await this.getAllJSFiles(dir);

    for (const file of files) {
      await this.analyzeFile(file);
    }
  }

  async getAllJSFiles(dir) {
    const files = [];

    const scan = async (currentDir) => {
      const entries = await fs.promises.readdir(currentDir);

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = await fs.promises.stat(fullPath);

        if (stat.isDirectory() && !this.shouldSkipDir(entry)) {
          await scan(fullPath);
        } else if (this.isJSFile(entry)) {
          files.push(fullPath);
        }
      }
    };

    await scan(dir);
    return files;
  }

  shouldSkipDir(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'test-results', 'coverage'];
    return skipDirs.includes(dirName);
  }

  isJSFile(filename) {
    return /\.(js|ts|vue)$/.test(filename);
  }

  async analyzeFile(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const functions = this.extractFunctions(content, filePath);

    // Store all file contents for usage searching, not just files with functions
    this.allFileContents = this.allFileContents || new Map();
    this.allFileContents.set(filePath, content);

    // Store functions with their file content
    for (const func of functions) {
      func.fileContent = content; // Store full content for template/usage analysis
      this.functionMap.set(`${filePath}:${func.name}`, func);
    }
  }

  extractFunctions(content, filePath) {
    const functions = [];

    // Match function declarations, arrow functions, and method definitions
    const patterns = [
      // function declarations: function name() {}
      /function\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // arrow functions: const name = () => {} or const name = param => {}
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|\w+\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})/g,
      // Vue computed block: const name = computed(() => { ... })
      /(?:const|let|var)\s+(\w+)\s*=\s*computed\s*\(\s*\(\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // Vue computed simple: const name = computed(() => expression)
      /(?:const|let|var)\s+(\w+)\s*=\s*computed\s*\(\s*\(\)\s*=>\s*([^})\n]+)\)/g,
      // method definitions: name() {}
      /(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        const body = match[2] || match[3] || '';

        if (name && !this.isConstructorOrSpecial(name) && this.isTopLevelFunction(match.index, content)) {
          const lineCount = this.countSignificantLines(body);
          functions.push({
            name,
            body: body.trim(),
            lineCount,
            filePath,
            fullMatch: match[0]
          });

        }
      }
    }

    return functions;
  }

  isTopLevelFunction(matchIndex, content) {
    // Check if this function is at the top level (not nested inside another function)
    const beforeMatch = content.substring(0, matchIndex);

    // Count opening and closing braces before this match
    const openBraces = (beforeMatch.match(/\{/g) || []).length;
    const closeBraces = (beforeMatch.match(/\}/g) || []).length;

    // If we're not inside a function body (balanced braces), it's top-level
    // Allow for being inside script setup {} or export {} blocks
    return (openBraces - closeBraces) <= 1;
  }

  isConstructorOrSpecial(name) {
    const specialNames = ['constructor', 'render', 'setup', 'created', 'mounted', 'updated', 'destroyed'];
    const reservedWords = ['if', 'for', 'while', 'do', 'switch', 'case', 'try', 'catch', 'finally',
                          'function', 'return', 'var', 'let', 'const', 'class', 'import', 'export',
                          'default', 'data', 'computed', 'methods', 'watch', 'props', 'emits',
                          'deep', 'and', 'or', 'not', 'set', 'get', 'has', 'add', 'remove', 'clear'];
    const cssSelectors = ['hover', 'focus', 'active', 'visited', 'first', 'last', 'nth', 'before', 'after'];

    return specialNames.includes(name) ||
           reservedWords.includes(name) ||
           cssSelectors.includes(name) ||
           name.startsWith('_') ||
           name.startsWith('$') ||
           name.length <= 2; // Skip very short names like 'if', 'do', etc.
  }

  countSignificantLines(body) {
    const lines = body.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('/*') && line !== '}' && line !== '{');

    return lines.length;
  }

  detectCandidates() {
    // Collect all short functions for analysis
    this.allShortFunctions = [];

    for (const [key, func] of this.functionMap) {
      if (func.lineCount >= 1 && func.lineCount <= 4) {
        const usageInfo = this.countUsages(func.name);

        this.allShortFunctions.push({
          ...func,
          usageCount: usageInfo.totalCount,
          templateUsages: usageInfo.templateUsages,
          codeUsages: usageInfo.codeUsages,
          hasTemplateUsage: usageInfo.hasTemplateUsage,
          key
        });

        // Categorize functions based on usage patterns
        let category = null;
        if (usageInfo.totalCount === 0) {
          category = 'unused';
        } else if (usageInfo.hasTemplateUsage) {
          category = 'template-bound'; // Not an indirection candidate
        } else if (usageInfo.totalCount === 1) {
          category = 'indirection'; // True indirection candidate
        }

        if (category === 'unused' || category === 'indirection') {
          this.candidates.push({
            ...func,
            usageCount: usageInfo.totalCount,
            templateUsages: usageInfo.templateUsages,
            codeUsages: usageInfo.codeUsages,
            hasTemplateUsage: usageInfo.hasTemplateUsage,
            key,
            category
          });
        }
      }
    }

    // Sort all short functions by usage count then line count
    this.allShortFunctions.sort((a, b) => {
      if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
      return a.lineCount - b.lineCount;
    });

    // Sort candidates by line count (shortest first) then by usage count
    this.candidates.sort((a, b) => {
      if (a.lineCount !== b.lineCount) return a.lineCount - b.lineCount;
      return a.usageCount - b.usageCount;
    });
  }

  countUsages(functionName) {
    const usageInfo = {
      totalCount: 0,
      templateUsages: 0,
      codeUsages: 0,
      hasTemplateUsage: false
    };

    // Search in ALL file contents
    if (this.allFileContents) {
      for (const [, content] of this.allFileContents) {
        const templateUsages = this.countTemplateUsages(functionName, content);
        const codeUsages = this.countCodeUsages(functionName, content);

        usageInfo.templateUsages += templateUsages;
        usageInfo.codeUsages += codeUsages;

        if (templateUsages > 0) {
          usageInfo.hasTemplateUsage = true;
        }
      }
    }

    usageInfo.totalCount = usageInfo.templateUsages + usageInfo.codeUsages;
    return usageInfo;
  }

  countTemplateUsages(functionName, content) {
    let count = 0;

    // Vue template-specific patterns
    const templatePatterns = [
      // Vue template bindings
      new RegExp(`="${functionName}"`, 'g'),
      new RegExp(`='${functionName}'`, 'g'),
      new RegExp(`="${functionName}\\(\\)"`, 'g'),
      new RegExp(`='${functionName}\\(\\)'`, 'g'),

      // Vue property access in templates (e.g., :href="publication.doiUrl")
      new RegExp(`\\.${functionName}"`, 'g'),
      new RegExp(`\\.${functionName}'`, 'g'),

      // Vue interpolations
      new RegExp(`\\{\\{\\s*${functionName}\\s*\\}\\}`, 'g'),
      new RegExp(`\\{\\{[^}]*\\.${functionName}[^}]*\\}\\}`, 'g'), // {{ publication.doiUrl }}

      // Vue computed .value access in templates
      new RegExp(`\\b${functionName}\\.value\\b`, 'g'),
    ];

    for (const pattern of templatePatterns) {
      const matches = content.match(pattern) || [];
      count += matches.length;

    }

    return count;
  }

  countCodeUsages(functionName, content) {
    let count = 0;

    // Code-specific patterns (exclude function definitions)
    const codePatterns = [
      // Function calls and method calls (exclude function definitions)
      new RegExp(`(?<!function\\s+)(?<!export\\s+function\\s+)(?<!get\\s+)\\b${functionName}\\s*\\(`, 'g'),
      new RegExp(`\\.${functionName}\\s*\\(`, 'g'),

      // Property access (for getters like doiUrl)
      new RegExp(`\\.${functionName}\\b(?!\\s*\\()`, 'g'), // .functionName but not .functionName(

      // Template literals in code
      new RegExp(`\\$\\{${functionName}\\}`, 'g'),

      // Function references in specific contexts
      new RegExp(`\\bsort\\s*\\(\\s*${functionName}\\s*\\)`, 'g'),
      new RegExp(`\\bemit\\s*\\(\\s*['"][^'"]*['"]\\s*,\\s*${functionName}\\s*\\)`, 'g'),

      // Object method definitions (conservative)
      new RegExp(`^\\s*${functionName}\\s*:`, 'gm'),
    ];

    for (const pattern of codePatterns) {
      const matches = content.match(pattern) || [];
      count += matches.length;

    }

    return count;
  }

  reportFindings() {
    const unusedCandidates = this.candidates.filter(c => c.category === 'unused');
    const indirectionCandidates = this.candidates.filter(c => c.category === 'indirection');
    const templateBoundFunctions = this.allShortFunctions.filter(f => f.hasTemplateUsage);

    console.log(`📊 Analysis Results:`);
    console.log(`Total functions analyzed: ${this.functionMap.size}`);
    console.log(`Short functions (≤4 lines): ${this.allShortFunctions.length}`);
    console.log(`Template-bound functions: ${templateBoundFunctions.length}`);
    console.log(`Unused functions found: ${unusedCandidates.length}`);
    console.log(`Indirection candidates found: ${indirectionCandidates.length}\n`);


    // Show template-bound functions (excluded from candidates)
    if (templateBoundFunctions.length > 0) {
      console.log('🎭 Template-bound functions (excluded from indirection candidates):\n');
      for (const func of templateBoundFunctions) {
        console.log(`📁 ${path.relative(process.cwd(), func.filePath)}`);
        console.log(`   Function: ${func.name} | Lines: ${func.lineCount} | Template: ${func.templateUsages}, Code: ${func.codeUsages}`);
        console.log(`   Body: ${func.body.substring(0, 80)}${func.body.length > 80 ? '...' : ''}`);
        console.log('');
      }
    }

    if (unusedCandidates.length > 0) {
      console.log('🗑️  Potentially unused functions:\n');
      for (const candidate of unusedCandidates) {
        console.log(`📁 ${path.relative(process.cwd(), candidate.filePath)}`);
        console.log(`   Function: ${candidate.name}`);
        console.log(`   Lines: ${candidate.lineCount} | Usages: ${candidate.usageCount}`);
        console.log(`   Body preview: ${candidate.body.substring(0, 80)}${candidate.body.length > 80 ? '...' : ''}`);
        console.log('');
      }
    }

    if (indirectionCandidates.length > 0) {
      console.log('🎯 Function indirection candidates (single caller):\n');
      for (const candidate of indirectionCandidates) {
        console.log(`📁 ${path.relative(process.cwd(), candidate.filePath)}`);
        console.log(`   Function: ${candidate.name}`);
        console.log(`   Lines: ${candidate.lineCount} | Usages: ${candidate.usageCount}`);
        console.log(`   Body preview: ${candidate.body.substring(0, 80)}${candidate.body.length > 80 ? '...' : ''}`);
        console.log('');
      }
    }

    if (this.candidates.length === 0) {
      console.log('✅ No function indirection candidates found!');
    } else {
      console.log(`💡 Run 'claude cleanup-indirections' to review and fix these candidates.`);
    }
  }
}

// Main execution
if (require.main === module) {
  const detector = new IndirectionDetector();
  const sourceDir = process.argv[2] || 'src';

  detector.analyze(sourceDir).catch(console.error);
}

module.exports = IndirectionDetector;