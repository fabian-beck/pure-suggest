#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path')

const CONSTANTS_DIR = 'src/constants'
const SRC_DIR = 'src'
const TESTS_DIR = 'tests'

async function getAllFiles(dir, extensions = ['.js', '.vue']) {
  const files = []

  async function traverse(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await traverse(fullPath)
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}:`, error.message)
    }
  }

  await traverse(dir)
  return files
}

async function extractConstantsFromFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const constants = []

  // Match export const CONSTANT_NAME = ...
  const exportConstRegex = /export\s+const\s+([A-Z_][A-Z0-9_]*)\s*=/g
  let match

  while ((match = exportConstRegex.exec(content)) !== null) {
    constants.push({
      name: match[1],
      file: filePath
    })
  }

  return constants
}

async function findConstantUsages(constantName, files) {
  const usages = []

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8')

      // Count occurrences (excluding the definition itself)
      const regex = new RegExp(`\\b${constantName}\\b`, 'g')
      const matches = content.match(regex) || []

      // Check if this is the defining file
      const isDefiningFile = content.includes(`export const ${constantName}`)

      // Check if this is a test file
      const isTestFile = file.includes('test') || file.includes('spec')

      if (matches.length > 0) {
        usages.push({
          file,
          count: matches.length,
          isDefiningFile,
          isTestFile
        })
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error.message)
    }
  }

  return usages
}

async function main() {
  console.log('🔍 Analyzing constant usage patterns...\n')

  // Get all constant files
  const constantFiles = await getAllFiles(CONSTANTS_DIR)
  console.log(
    `Found ${constantFiles.length} constant files:`,
    constantFiles.map((f) => path.basename(f)).join(', ')
  )

  // Get all source and test files to search through
  const allFiles = [...(await getAllFiles(SRC_DIR)), ...(await getAllFiles(TESTS_DIR))]
  console.log(`Searching through ${allFiles.length} files for usage patterns\n`)

  // Extract all constants
  const allConstants = []
  for (const file of constantFiles) {
    const constants = await extractConstantsFromFile(file)
    allConstants.push(...constants)
  }

  console.log(`Found ${allConstants.length} constants to analyze\n`)

  // Analyze usage for each constant
  const analysisResults = []

  for (const constant of allConstants) {
    const usages = await findConstantUsages(constant.name, allFiles)

    // Filter out the defining file and test files from usage count
    const actualUsages = usages.filter((usage) => !usage.isDefiningFile && !usage.isTestFile)
    const testUsages = usages.filter((usage) => usage.isTestFile && !usage.isDefiningFile)
    const usageCount = actualUsages.reduce((sum, usage) => sum + usage.count, 0)
    const testUsageCount = testUsages.reduce((sum, usage) => sum + usage.count, 0)
    const fileCount = actualUsages.length
    const testFileCount = testUsages.length

    analysisResults.push({
      constantName: constant.name,
      constantFile: constant.file,
      usageCount,
      fileCount,
      testUsageCount,
      testFileCount,
      usages: actualUsages,
      testUsages
    })
  }

  // Sort by usage count
  analysisResults.sort((a, b) => a.usageCount - b.usageCount)

  // Generate report
  console.log('📊 CONSTANT USAGE ANALYSIS REPORT')
  console.log('=====================================\n')

  const singleUseConstants = analysisResults.filter((result) => result.fileCount === 1)
  const multiUseConstants = analysisResults.filter((result) => result.fileCount > 1)
  const unusedConstants = analysisResults.filter((result) => result.fileCount === 0)

  console.log(`📈 SUMMARY:`)
  console.log(`  • Total constants: ${analysisResults.length}`)
  console.log(`  • Used in single file (excluding tests): ${singleUseConstants.length}`)
  console.log(`  • Used in multiple files (excluding tests): ${multiUseConstants.length}`)
  console.log(`  • Unused constants (excluding tests): ${unusedConstants.length}\n`)

  if (unusedConstants.length > 0) {
    console.log('❌ UNUSED CONSTANTS (candidates for removal):')
    unusedConstants.forEach((result) => {
      console.log(`  • ${result.constantName} (${path.basename(result.constantFile)})`)
    })
    console.log('')
  }

  if (singleUseConstants.length > 0) {
    console.log('🎯 SINGLE-USE CONSTANTS (candidates for decentralization):')
    singleUseConstants.forEach((result) => {
      const usage = result.usages[0]
      console.log(`  • ${result.constantName}`)
      console.log(`    From: ${path.basename(result.constantFile)}`)
      console.log(`    Used in: ${path.relative(process.cwd(), usage.file)} (${usage.count} times)`)
      if (result.testFileCount > 0) {
        console.log(
          `    Also used in ${result.testFileCount} test file(s) (${result.testUsageCount} times) - not counted for decentralization`
        )
      }
    })
    console.log('')
  }

  if (multiUseConstants.length > 0) {
    console.log('🌐 MULTI-USE CONSTANTS (keep centralized):')
    multiUseConstants.forEach((result) => {
      console.log(
        `  • ${result.constantName}: ${result.fileCount} files, ${result.usageCount} total uses`
      )
      result.usages.forEach((usage) => {
        console.log(`    - ${path.relative(process.cwd(), usage.file)} (${usage.count}x)`)
      })
      if (result.testFileCount > 0) {
        console.log(
          `    + ${result.testFileCount} test file(s) (${result.testUsageCount} test uses)`
        )
      }
    })
  }

  // Write detailed results to file
  const outputPath = 'tools/output/constant-usage-analysis.json'
  await fs.writeFile(outputPath, JSON.stringify(analysisResults, null, 2))
  console.log(`\n📄 Detailed results saved to: ${outputPath}`)
}

main().catch(console.error)
