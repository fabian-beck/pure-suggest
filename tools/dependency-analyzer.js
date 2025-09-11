#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Find all project files - Windows compatible
function findProjectFiles(dir, extensions = ['.vue', '.js', '.ts', '.mjs']) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findProjectFiles(fullPath, extensions))
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (extensions.includes(ext)) {
        files.push(fullPath)
      }
    }
  }
  return files
}

// Get file type for categorization
function getFileType(filePath) {
  const ext = path.extname(filePath)
  const dir = path.dirname(filePath)

  if (ext === '.vue') return 'Vue Component'
  if (dir.includes('stores')) return 'Store'
  if (dir.includes('composables')) return 'Composable'
  if (dir.includes('constants')) return 'Constants'
  if (dir.includes('utils')) return 'Utilities'
  if (filePath.includes('main.js')) return 'Entry Point'

  return 'Module'
}

const projectFiles = findProjectFiles(path.join(__dirname, '../src'))

console.log('=== Complete Project Dependency Analysis ===\n')

const dependencies = new Map()
const fileTypes = new Map()

// Analyze all project files
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const fileType = getFileType(filePath)
    fileTypes.set(filePath, fileType)

    const analysis = {
      type: fileType,
      lineCount: content.split('\n').length,
      imports: [],
      exports: [],
      templateComponents: [],
      stores: [],
      functions: [],
      classes: []
    }

    // Extract imports (works for both Vue and JS files, handles multi-line imports)
    const importMatches = content.match(/import[\s\S]*?from\s+['"]([^'"]+)['"]/g)
    if (importMatches) {
      analysis.imports = importMatches
        .map((match) => {
          const pathMatch = match.match(/from\s+['"]([^'"]+)['"]/)
          return pathMatch ? pathMatch[1] : null
        })
        .filter(Boolean)
    }

    // Extract dynamic imports
    const dynamicImports = content.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)
    if (dynamicImports) {
      const dynamicPaths = dynamicImports
        .map((match) => {
          const pathMatch = match.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)
          return pathMatch ? `${pathMatch[1]} (dynamic)` : null
        })
        .filter(Boolean)
      analysis.imports.push(...dynamicPaths)
    }

    // Extract exports
    const exportMatches = content.match(
      /(export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)|export\s*{\s*([^}]+)\s*})/g
    )
    if (exportMatches) {
      analysis.exports = exportMatches
        .map((match) => {
          if (match.includes('export default')) return 'default'
          if (match.includes('export {')) {
            const namedExports = match.match(/export\s*{\s*([^}]+)\s*}/)
            return namedExports ? namedExports[1].split(',').map((e) => e.trim()) : []
          }
          const namedMatch = match.match(/export\s+(?:function|class|const|let|var)\s+(\w+)/)
          return namedMatch ? namedMatch[1] : null
        })
        .flat()
        .filter(Boolean)
    }

    // Vue-specific analysis
    if (fileType === 'Vue Component') {
      // Extract template component usage - find the MAIN template block (not nested v-slot templates)
      const lines = content.split('\n')
      let templateStart = -1
      let templateEnd = -1
      let depth = 0

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes('<template') && templateStart === -1) {
          templateStart = i
          depth++
        } else if (line.includes('<template')) {
          depth++
        } else if (line.includes('</template>')) {
          depth--
          if (depth === 0 && templateStart !== -1) {
            templateEnd = i
            break
          }
        }
      }

      if (templateStart !== -1 && templateEnd !== -1) {
        const template = lines.slice(templateStart + 1, templateEnd).join('\n')
        const componentMatches = template.match(/<([A-Z][a-zA-Z]*)/g)
        if (componentMatches) {
          analysis.templateComponents = [
            ...new Set(componentMatches.map((match) => match.slice(1)))
          ]
        }
      }
    }

    // Extract store usage (Pinia stores)
    const storeMatches = content.match(/(\w+Store)\./g)
    if (storeMatches) {
      analysis.stores = [...new Set(storeMatches.map((match) => match.slice(0, -1)))]
    }

    // Extract function definitions
    const functionMatches = content.match(
      /(?:function\s+(\w+)|const\s+(\w+)\s*=.*?(?:function|=>)|(\w+)\s*\([^)]*\)\s*{)/g
    )
    if (functionMatches) {
      analysis.functions = functionMatches
        .map((match) => {
          const funcName = match.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\()/)
          return funcName ? funcName[1] || funcName[2] || funcName[3] : null
        })
        .filter(Boolean)
        .slice(0, 5) // Limit to first 5 functions
    }

    // Extract class definitions
    const classMatches = content.match(/class\s+(\w+)/g)
    if (classMatches) {
      analysis.classes = classMatches
        .map((match) => {
          const className = match.match(/class\s+(\w+)/)
          return className ? className[1] : null
        })
        .filter(Boolean)
    }

    dependencies.set(filePath, analysis)
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message)
  }
}

projectFiles.forEach(analyzeFile)

// Group files by type
const filesByType = new Map()
dependencies.forEach((deps, filePath) => {
  const type = deps.type
  if (!filesByType.has(type)) {
    filesByType.set(type, [])
  }
  filesByType.get(type).push([filePath, deps])
})

// Output results by file type
console.log('📊 Project Overview:\n')
filesByType.forEach((files, type) => {
  console.log(`\n=== ${type}s (${files.length}) ===\n`)

  files.forEach(([filePath, deps]) => {
    const fileName = path.basename(filePath)
    console.log(`📁 ${fileName} (${filePath})`)

    if (deps.imports && deps.imports.length > 0) {
      const localImports = deps.imports.filter(
        (imp) => imp.startsWith('./') || imp.startsWith('@/')
      )
      const externalImports = deps.imports.filter(
        (imp) => !imp.startsWith('./') && !imp.startsWith('@/')
      )

      if (localImports.length > 0) {
        console.log(`  📦 Local: ${localImports.join(', ')}`)
      }
      if (externalImports.length > 0) {
        console.log(`  📚 External: ${externalImports.join(', ')}`)
      }
    }

    if (deps.exports && deps.exports.length > 0) {
      console.log(`  📤 Exports: ${deps.exports.join(', ')}`)
    }

    if (deps.templateComponents && deps.templateComponents.length > 0) {
      console.log(`  🧩 Components: ${deps.templateComponents.join(', ')}`)
    }

    if (deps.stores && deps.stores.length > 0) {
      console.log(`  🏪 Stores: ${deps.stores.join(', ')}`)
    }

    if (deps.functions && deps.functions.length > 0) {
      console.log(`  ⚡ Functions: ${deps.functions.join(', ')}`)
    }

    if (deps.classes && deps.classes.length > 0) {
      console.log(`  🏗️ Classes: ${deps.classes.join(', ')}`)
    }

    console.log(`  📏 Lines: ${deps.lineCount}`)
    console.log('')
  })
})

// Generate comprehensive dependency graph
console.log('\n=== Complete Dependency Graph ===\n')
dependencies.forEach((deps, filePath) => {
  const fileName = path.basename(filePath)

  // Local imports
  if (deps.imports) {
    deps.imports.forEach((imp) => {
      if (imp.startsWith('./') || imp.startsWith('@/')) {
        const impType = imp.includes('(dynamic)') ? 'dynamic import' : 'import'
        console.log(`${fileName} → ${imp} (${impType})`)
      }
    })
  }

  // Template component usage
  if (deps.templateComponents) {
    deps.templateComponents.forEach((comp) => {
      console.log(`${fileName} → <${comp}> (template)`)
    })
  }

  // Store usage
  if (deps.stores) {
    deps.stores.forEach((store) => {
      console.log(`${fileName} → ${store} (store)`)
    })
  }
})

// Summary statistics
console.log('\n=== Summary Statistics ===\n')
const stats = {
  totalFiles: projectFiles.length,
  fileTypes: {},
  totalDependencies: 0,
  mostConnectedFiles: []
}

filesByType.forEach((files, type) => {
  stats.fileTypes[type] = files.length
})

// Find most connected files
const connectionCounts = new Map()
dependencies.forEach((deps, filePath) => {
  const connections =
    (deps.imports?.length || 0) +
    (deps.templateComponents?.length || 0) +
    (deps.stores?.length || 0)
  connectionCounts.set(path.basename(filePath), connections)
  stats.totalDependencies += connections
})

const sortedConnections = [...connectionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

console.log(`📈 Total Files: ${stats.totalFiles}`)
console.log(`🔗 Total Dependencies: ${stats.totalDependencies}`)
console.log(`📊 File Types:`)
Object.entries(stats.fileTypes).forEach(([type, count]) => {
  console.log(`   ${type}: ${count}`)
})

console.log(`\n🎯 Most Connected Files:`)
sortedConnections.forEach(([fileName, count], index) => {
  console.log(`   ${index + 1}. ${fileName}: ${count} dependencies`)
})

// Generate GraphML export for yEd
function generateGraphML() {
  const nodeMap = new Map()
  const edges = []

  // Create store name mapping (sessionStore -> session, interfaceStore -> interface)
  const storeFileMapping = new Map()
  dependencies.forEach((deps, filePath) => {
    if (deps.type === 'Store') {
      const fileName = path.basename(filePath, path.extname(filePath))
      storeFileMapping.set(`${fileName}Store`, fileName)
    }
  })

  // First pass: collect all actual nodes
  dependencies.forEach((deps, filePath) => {
    const fileName = path.basename(filePath, path.extname(filePath)) // Remove extension
    const nodeType = deps.type

    nodeMap.set(fileName, {
      id: fileName,
      label: `${path.basename(filePath)} (${deps.lineCount})`, // Add line count to label
      type: nodeType,
      path: filePath,
      lineCount: deps.lineCount
    })
  })

  // Second pass: collect edges, only add targets that exist as nodes
  dependencies.forEach((deps, filePath) => {
    const sourceFileName = path.basename(filePath, path.extname(filePath))

    // Keep track of what this file imports to avoid duplicate store edges
    const importedFiles = new Set()

    // Add import edges
    if (deps.imports) {
      deps.imports.forEach((imp) => {
        if (imp.startsWith('./') || imp.startsWith('@/')) {
          let targetName = imp.replace(/^\.\/|^@\//, '')
          targetName = path.basename(targetName, path.extname(targetName))

          const _edgeType = imp.includes('(dynamic)') ? 'dynamic-import' : 'import'

          // Only add edge if target node exists
          if (nodeMap.has(targetName)) {
            importedFiles.add(targetName)
            edges.push({
              source: sourceFileName,
              target: targetName,
              type: 'dependency',
              label: ''
            })
          }
        }
      })
    }

    // Add template component edges - these might reference components not in our file list
    if (deps.templateComponents) {
      deps.templateComponents.forEach((comp) => {
        // Try to find the component in our node list (might be CompactButton.vue -> CompactButton)
        let targetId = comp
        if (!nodeMap.has(comp)) {
          // Try to find by partial match
          for (const [nodeId] of nodeMap) {
            if (nodeId.includes(comp) || comp.includes(nodeId)) {
              targetId = nodeId
              break
            }
          }

          // If still not found, create a virtual node for template components
          if (!nodeMap.has(targetId)) {
            nodeMap.set(comp, {
              id: comp,
              label: comp,
              type: 'Template Reference',
              path: 'virtual'
            })
            targetId = comp
          }
        }

        edges.push({
          source: sourceFileName,
          target: targetId,
          type: 'dependency',
          label: ''
        })
      })
    }

    // Add store usage edges - map to actual store files
    // Skip if already imported (avoid duplicates)
    if (deps.stores) {
      deps.stores.forEach((store) => {
        // Map store reference to actual file (sessionStore -> session)
        let targetId = storeFileMapping.get(store) || store

        // Skip if this file already imports the store file
        if (importedFiles.has(targetId)) {
          return // Already have import edge, skip store access edge
        }

        // Only create virtual node if we can't map to an actual store file
        if (!nodeMap.has(targetId)) {
          // Check if it's a known store pattern we missed
          if (store.endsWith('Store')) {
            const baseStoreName = store.replace('Store', '')
            if (nodeMap.has(baseStoreName)) {
              targetId = baseStoreName
              // Skip if already imported
              if (importedFiles.has(targetId)) {
                return
              }
            } else {
              // Create virtual node as last resort
              nodeMap.set(store, {
                id: store,
                label: store,
                type: 'Store Reference',
                path: 'virtual'
              })
              targetId = store
            }
          } else {
            // Create virtual node for non-standard store references
            nodeMap.set(store, {
              id: store,
              label: store,
              type: 'Store Reference',
              path: 'virtual'
            })
            targetId = store
          }
        }

        edges.push({
          source: sourceFileName,
          target: targetId,
          type: 'dependency',
          label: ''
        })
      })
    }
  })

  // Convert to GraphML format with yEd extensions
  let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  
         xmlns:y="http://www.yworks.com/xml/graphml"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  
  <!-- yEd node graphics -->
  <key for="node" id="d0" yfiles.type="nodegraphics"/>
  <!-- yEd edge graphics -->
  <key for="edge" id="d1" yfiles.type="edgegraphics"/>
  
  <!-- Custom attributes -->
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="path" for="node" attr.name="path" attr.type="string"/>
  <key id="edgeType" for="edge" attr.name="edgeType" attr.type="string"/>
  
  <graph id="dependency-graph" edgedefault="directed">
`

  // Add nodes with colors based on type
  const typeColors = {
    'Vue Component': '#42B883',
    Store: '#FF6B6B',
    Composable: '#4ECDC4',
    Constants: '#FFE66D',
    Utilities: '#A8E6CF',
    'Entry Point': '#FF8B94',
    Module: '#B4A7D6',
    'Template Reference': '#FFA07A',
    'Store Reference': '#FF6B6B'
  }

  // Calculate border width based on line count (1.0 to 5.0 range)
  const lineCounts = Array.from(nodeMap.values())
    .filter((node) => node.lineCount)
    .map((node) => node.lineCount)
  const minLines = Math.min(...lineCounts)
  const maxLines = Math.max(...lineCounts)

  function getBorderWidth(lineCount) {
    if (!lineCount || minLines === maxLines) return 1.0
    // Scale from 1.0 to 5.0 based on line count
    const normalized = (lineCount - minLines) / (maxLines - minLines)
    return 1.0 + normalized * 4.0
  }

  nodeMap.forEach((node) => {
    const color = typeColors[node.type] || '#CCCCCC'
    const cleanLabel = node.label.trim() // Remove any whitespace/tabs
    const borderWidth = getBorderWidth(node.lineCount)

    graphml += `    <node id="${node.id}">
      <data key="d0">
        <y:ShapeNode>
          <y:Geometry height="50.0" width="150.0"/>
          <y:Fill color="${color}" transparent="false"/>
          <y:BorderStyle color="#000000" type="line" width="${borderWidth}"/>
          <y:NodeLabel alignment="center" autoSizePolicy="content" fontFamily="Arial" fontSize="16" fontStyle="plain" hasBackgroundColor="false" hasLineColor="false" modelName="custom" textColor="#000000" visible="true">${cleanLabel}<y:LabelModel>
              <y:SmartNodeLabelModel distance="4.0"/>
            </y:LabelModel>
            <y:ModelParameter>
              <y:SmartNodeLabelModelParameter labelRatioX="0.0" labelRatioY="0.0" nodeRatioX="0.0" nodeRatioY="0.0" offsetX="0.0" offsetY="0.0" upX="0.0" upY="-1.0"/>
            </y:ModelParameter>
          </y:NodeLabel>
          <y:Shape type="rectangle"/>
        </y:ShapeNode>
      </data>
      <data key="type">${node.type}</data>
      <data key="path">${node.path}</data>
    </node>
`
  })

  // Add edges with single black color
  edges.forEach((edge, index) => {
    const color = '#000000' // All edges black
    graphml += `    <edge id="e${index}" source="${edge.source}" target="${edge.target}">
      <data key="d1">
        <y:PolyLineEdge>
          <y:Path sx="0.0" sy="0.0" tx="0.0" ty="0.0"/>
          <y:LineStyle color="${color}" type="line" width="1.0"/>
          <y:Arrows source="none" target="standard"/>
          <y:BendStyle smoothed="false"/>
        </y:PolyLineEdge>
      </data>
      <data key="edgeType">${edge.type}</data>
    </edge>
`
  })

  graphml += `  </graph>
</graphml>`

  return graphml
}

// Export GraphML file
const graphmlContent = generateGraphML()
const outputPath = path.join(__dirname, 'output', 'project-dependencies.graphml')
fs.writeFileSync(outputPath, graphmlContent, 'utf-8')

console.log('\n📊 GraphML Export Complete!')
console.log('   📁 File: tools/output/project-dependencies.graphml')
console.log('   🎨 Open with: yEd, Gephi, or any GraphML-compatible tool')
console.log('   🎯 Node colors represent file types')
console.log('   📏 Node border thickness represents file size (lines of code)')
console.log('   ⚫ All edges are black dependency arrows')
console.log('   📝 16pt Arial font labels show filename and line count')
console.log('\nNode Color Legend:')
console.log('   🟢 Vue Components: #42B883')
console.log('   🔴 Stores: #FF6B6B')
console.log('   🟦 Composables: #4ECDC4')
console.log('   🟡 Constants: #FFE66D')
console.log('   🟢 Utilities: #A8E6CF')
console.log('   🟣 Entry Point: #FF8B94')
console.log('   🟪 Modules: #B4A7D6')
console.log('   🟠 Template References: #FFA07A')
console.log('\nBorder Thickness:')
console.log('   📐 1.0px (thin) = Smallest files')
console.log('   📐 5.0px (thick) = Largest files')
