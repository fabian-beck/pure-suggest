#!/usr/bin/env node

/**
 * Find potentially unused functions in the codebase
 * 
 * This script searches for function definitions and checks if they appear only once
 * (i.e., only in their definition), which suggests they might be unused.
 * 
 * Usage: node tools/find-unused-functions.js
 */

const fs = require('fs');
const path = require('path');
const { execSync: _execSync } = require('child_process');

// Configuration
const SOURCE_DIRS = ['src', 'tests'];
const FILE_EXTENSIONS = ['.js', '.vue', '.ts'];
const EXCLUDE_PATTERNS = ['node_modules', '.git', 'dist', 'build'];

// Function name patterns to match
const FUNCTION_PATTERNS = [
  // Function declarations: function functionName(), async function functionName()
  /(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  // Arrow functions assigned to variables: const functionName = () =>
  /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
  // Method definitions: methodName() {}, async methodName() {}
  /(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g,
  // Export function: export function functionName()
  /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  // Export const arrow function: export const functionName = () =>
  /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
];

/**
 * Recursively get all files with specified extensions
 */
function getAllFiles(dir, extensions) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Extract function names from file content
 */
function extractFunctionNames(content, filePath) {
  const functions = new Set();
  
  // Remove comments and strings to avoid false positives
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*$/gm, '') // Remove // comments
    .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '""'); // Remove strings
  
  // Apply all function patterns
  for (const pattern of FUNCTION_PATTERNS) {
    let match;
    while ((match = pattern.exec(cleanContent)) !== null) {
      const functionName = match[1];
      
      // Skip common false positives
      if (!isValidFunctionName(functionName)) {
        continue;
      }
      
      functions.add({
        name: functionName,
        file: filePath,
        line: getLineNumber(content, match.index)
      });
    }
  }
  
  return Array.from(functions);
}

/**
 * Check if function name is valid (not a keyword, etc.)
 */
function isValidFunctionName(name) {
  // Skip JavaScript keywords and common non-function identifiers
  const KEYWORDS = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'try', 'catch', 'finally', 'throw', 'return', 'break', 'continue',
    'var', 'let', 'const', 'class', 'extends', 'import', 'export',
    'from', 'as', 'new', 'this', 'super', 'static', 'get', 'set',
    'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
    'console', 'window', 'document', 'process', 'require', 'module'
  ];
  
  return !KEYWORDS.includes(name) && 
         name.length > 1 && 
         /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Get line number for a character index in content
 */
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

/**
 * Count occurrences of a function name across all files
 */
function countFunctionUsage(functionName, sourceFiles) {
  let totalCount = 0;
  
  // Search through all files manually (cross-platform compatible)
  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Create regex to find word boundaries around function name
      const regex = new RegExp(`\\b${functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        totalCount += matches.length;
      }
    } catch {
      // Skip files that can't be read
      continue;
    }
  }
  
  return totalCount;
}

/**
 * Main function to find unused functions
 */
function findUnusedFunctions() {
  console.log('🔍 Searching for potentially unused functions...\n');
  
  // Get all source files
  const allFiles = [];
  for (const dir of SOURCE_DIRS) {
    if (fs.existsSync(dir)) {
      allFiles.push(...getAllFiles(dir, FILE_EXTENSIONS));
    }
  }
  
  console.log(`📁 Scanning ${allFiles.length} files in [${SOURCE_DIRS.join(', ')}]`);
  
  // Extract all function names
  const allFunctions = [];
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const functions = extractFunctionNames(content, file);
      allFunctions.push(...functions);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read ${file}: ${error.message}`);
    }
  }
  
  console.log(`🎯 Found ${allFunctions.length} function definitions\n`);
  
  // Check usage count for each function
  const potentiallyUnused = [];
  const usageCache = new Map(); // Cache to avoid duplicate searches
  
  for (const func of allFunctions) {
    if (usageCache.has(func.name)) {
      continue; // Skip if we already checked this function name
    }
    
    const usageCount = countFunctionUsage(func.name, allFiles);
    usageCache.set(func.name, usageCount);
    
    // If function appears only once, it might be unused (only definition, no calls)
    if (usageCount === 1) {
      potentiallyUnused.push({
        ...func,
        usageCount
      });
    }
  }
  
  // Display results
  console.log('📋 POTENTIALLY UNUSED FUNCTIONS:');
  console.log('=' .repeat(50));
  
  if (potentiallyUnused.length === 0) {
    console.log('✅ No potentially unused functions found!');
  } else {
    // Group by file for better readability
    const byFile = potentiallyUnused.reduce((acc, func) => {
      if (!acc[func.file]) acc[func.file] = [];
      acc[func.file].push(func);
      return acc;
    }, {});
    
    for (const [file, functions] of Object.entries(byFile)) {
      console.log(`\n📄 ${file}:`);
      for (const func of functions) {
        console.log(`  • ${func.name} (line ${func.line})`);
      }
    }
    
    console.log(`\n📊 Summary: ${potentiallyUnused.length} potentially unused functions found`);
    console.log('\n⚠️  Note: These results need manual verification:');
    console.log('   - Functions might be called dynamically (string references)');
    console.log('   - Functions might be used in templates or external files');
    console.log('   - Functions might be part of public APIs');
    console.log('   - Test functions are often only defined once');
  }
}

// Run the script
if (require.main === module) {
  findUnusedFunctions();
}

module.exports = { findUnusedFunctions };