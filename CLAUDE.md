# PUREsuggest Project Overview

## Project Description
PUREsuggest is a Vue 3 scientific literature search tool that suggests publications through citation-based recommendations. Users start with seed papers and receive ranked suggestions based on citations, references, and keyword boosting. Features a responsive design with network visualization, filtering capabilities, and BibTeX export.

## Architecture
- **Framework**: Vue 3 with Composition API
- **State Management**: Pinia stores (`session.js`, `interface.js`)
- **UI Framework**: Vuetify 3 + Bulma CSS hybrid approach
- **Visualization**: D3.js for network diagrams
- **Build Tool**: Vite
- **Testing**: Vitest with Happy DOM

## Key Components
- `App.vue`: Main application layout with grid-based responsive design
- `NetworkVisComponent.vue`: D3-powered citation network visualization
- `SelectedPublicationsComponent.vue`: User's selected publications list
- `SuggestedPublicationsComponent.vue`: Ranked publication suggestions
- `PublicationComponent.vue`: Individual publication display with metadata
- `FilterMenuComponent.vue`: Advanced filtering interface

## Core Business Logic
- `Publication.js`: Publication model with metadata fetching and scoring
- `Author.js`: Author aggregation and scoring algorithms
- `Filter.js`: Publication filtering logic
- `Cache.js`: IndexedDB-based caching system
- `PublicationSearch.js`: DOI-based search functionality

## Composables (Vue 3)
- `useGraphData.js`: Graph data management for network visualization
- `useNetworkSimulation.js`: D3 force simulation management
- `networkForces.js`: Force calculation algorithms
- `publicationNodes.js`, `authorNodes.js`, `keywordNodes.js`: Node management
- `networkLinks.js`: Link relationship management
- `usePublicationHeaders.js`: Publication header data management

## Testing Strategy
- **Unit Tests**: `tests/unit/` - Component and utility testing
- **Performance Tests**: `tests/performance/` - Load and rendering benchmarks
- **Test Commands**: 
  - `npm test` - Run unit tests
  - `npm run test:perf` - Run performance tests
  - `npm run test:all` - Run both test suites

## Development Commands
- `npm run dev` - Development server (port 8080)
- `npm run build` - Production build
- `npm run lint` - ESLint code checking
- `npm run preview` - Preview production build

## Data Flow
1. **Selection**: Users select publications via DOI or search
2. **Citation Fetching**: Publications fetch citation/reference metadata
3. **Suggestion Generation**: Algorithm computes ranked suggestions based on citation overlap
4. **Keyword Boosting**: Users can boost rankings with keywords
5. **Filtering**: Advanced filters applied to both selected and suggested publications
6. **Visualization**: Network diagram shows citation relationships
7. **Export**: Session state and BibTeX export capabilities

## State Management
- **Session Store**: Publications, suggestions, filters, queues, boost keywords
- **Interface Store**: UI state, modals, loading states, mobile responsiveness

## Performance Features
- Lazy loading of publication metadata
- Pagination for suggestions (`PAGINATION.LOAD_MORE_INCREMENT`)
- IndexedDB caching with LZ-string compression
- Performance monitoring with timing logs
- Memory usage tracking

## API Integration
- Multiple publication databases via DOI resolution
- Fallback strategies for metadata fetching
- Rate limiting and error handling
- Cache-first data loading strategy

## Best Practices

- Keep commit or PR messages short and concise
- Avoid functions of minimal size and unnecessary redirection layers
- Don't add comments if something is fixed or not done anymore
- Keep commit messages short and concise, avoid to comment on things that were tested but then not considered
- Add tests whenever appropriate, but try to keep them concise and focused on the most important issues
- Keep commit messages minimal, with small changes only having short messages
- Always clean up obsolete code or unnecessary comments
- Act on failing tests immediately to prevent technical debt and maintain code quality
- For a bug, try to first write a test to reproduce it, then fix it
- Generate commit messages based on actual diffs (not memory)
- Always test and lint before committing any bigger changes

## Design Principles

- "selected" identifies through primary color (turquoise), "suggested" through info color (cyan)
- Avoid functions of minimal lenght and logic (unecessary indirection)