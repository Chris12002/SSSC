# SSSC Schema Compare - Implementation Progress

## Overview
This document tracks the progress of implementing Red Gate SQL Compare-like functionality in SSSC (Simple SQL Source Control).

## Status: Feature Complete

Core Schema Compare functionality is fully implemented with comprehensive object support. The implementation now supports **all major SQL Server object types** including tables, views, procedures, functions, triggers, indexes, sequences, synonyms, and user-defined types.

### Recent Enhancements (January 2026)
- **Full table comparison**: Detects column datatype changes, CHECK/UNIQUE constraints, computed columns
- **Index support**: Non-clustered indexes extracted and compared as separate objects
- **Additional object types**: Sequences, Synonyms, User-defined Types now supported
- **Transaction support**: Script execution wrapped in transactions with rollback (industry standard)
- **HTML reports**: Comprehensive comparison reports with diff views

### Remaining Caveats
- **No dependency analysis**: Scripts execute without checking for dependent objects
- **Risk classification is basic**: "Safe" changes should still be reviewed before execution

---

## Completed Features

### 1. Home Screen Navigation
- [x] Mode selection cards: "Schema Compare" and "History Compare"
- [x] Clean navigation between modes
- [x] Back button to return from any mode

### 2. Source/Target Selection
- [x] Support for database sources (SQL Server)
- [x] Support for script folder sources
- [x] Any combination: DB-to-DB, Folder-to-Folder, DB-to-Folder, Folder-to-DB
- [x] Isolated credential storage per source (prevents connection conflicts)
- [x] Database dropdown after successful connection
- [x] Folder browser dialog for script selection

### 3. Database Schema Extraction
- [x] Tables (full column definitions with datatypes, constraints, defaults)
- [x] Views (full CREATE VIEW statements)
- [x] Stored Procedures (full CREATE PROCEDURE statements)
- [x] Functions (scalar, table-valued, inline)
- [x] Triggers (DML triggers on tables)
- [x] Non-clustered Indexes (with included columns and filters)
- [x] Sequences (with all properties)
- [x] Synonyms
- [x] User-defined Types (alias and table types)
- [x] CHECK constraints
- [x] UNIQUE constraints
- [x] Computed columns

### 4. Folder Parser
- [x] Parse .sql files from directories
- [x] Detect object type from CREATE statements
- [x] Extract schema and object name
- [x] Handle common SQL patterns

### 5. Comparison Engine
- [x] Hash-based comparison to detect changes
- [x] Identify added objects (in source, not in target)
- [x] Identify removed objects (in target, not in source)
- [x] Identify modified objects (different definitions)
- [x] Risk classification system:
  - **Safe** (green): New objects, modifications to procs/views/functions *(review recommended)*
  - **Warning** (yellow): Table modifications that need review
  - **Destructive** (red): Object deletions, column drops

### 6. Results Display
- [x] Summary statistics (total changes, by risk level)
- [x] Color-coded change chips (green/yellow/red)
- [x] Side-by-side diff view with syntax highlighting
- [x] Expandable/collapsible change details
- [x] Selection checkboxes for applying changes

### 7. Filtering & Search
- [x] Filter by object type (Tables, Views, Procs, Functions, Triggers)
- [x] Filter by risk level (Safe, Warning, Destructive)
- [x] Text search by object name
- [x] Select All / Deselect All controls

### 8. Script Generation
- [x] CREATE OR ALTER for procedures, views, functions (SQL Server 2016+)
- [x] ALTER TABLE for safe table changes
- [x] Commented scripts for warning-level changes
- [x] Blocked/excluded scripts for destructive changes

### 9. Apply Changes
- [x] Execute selected scripts directly to target database
- [x] Filter out destructive changes automatically
- [x] Success/error feedback with snackbar notifications
- [x] Batch execution with error collection
- [x] Transaction wrapping with rollback on failure (industry standard, enabled by default)
- [x] Stop on error option
- [x] UI toggles for transaction and error handling options
- [ ] Dependency analysis (not implemented - review scripts before execution)

### 10. Save Scripts
- [x] Export selected changes to .sql files
- [x] SQL-specific file dialog with proper extension
- [x] Timestamped default filename
- [x] Header comments with object info and risk level

### 11. HTML Report Generation
- [x] Export comparison results to comprehensive HTML report
- [x] Summary statistics with visual cards
- [x] Breakdown by object type (added/modified/removed)
- [x] Collapsible change cards with scripts
- [x] Unified diff view for modified objects
- [x] Print-friendly styles
- [x] Responsive design

### 12. History Compare (Existing)
- [x] View stored procedure snapshots over time
- [x] Compare two snapshots with diff view
- [x] Export diff reports as HTML

---

## Known Limitations

These are acknowledged gaps for future enhancement:

### Table Comparison
- ~~Column datatype changes not detected~~ ✅ Now implemented
- ~~Constraint changes not fully detected~~ ✅ CHECK and UNIQUE now supported
- ~~Index changes not detected~~ ✅ Non-clustered indexes now extracted
- Foreign key changes - multi-column FKs with ON DELETE/UPDATE actions now supported

### Script Execution
- No dependency analysis before execution
- ~~No transaction wrapping~~ ✅ Transaction support with rollback now implemented
- No pre-execution validation

### Comparison Algorithm
- Whitespace-normalized comparison may miss some edge cases
- No semantic SQL parsing (text-based comparison)

---

## File Structure

```
src/
├── main/
│   ├── main.ts                          # IPC handlers for all features
│   ├── services/
│   │   ├── databaseService.ts           # Database connection management
│   │   ├── schemaExtractorService.ts    # Extracts DDL from SQL Server
│   │   ├── folderParserService.ts       # Parses SQL files from folders
│   │   └── schemaComparisonService.ts   # Comparison and script generation
│   └── utils/
│       └── fileutils.ts                 # File save operations
├── renderer/src/
│   ├── components/
│   │   ├── App.tsx                      # Main app container
│   │   ├── HomeScreen.tsx               # Mode selection screen
│   │   ├── SchemaCompare.tsx            # Schema compare workflow
│   │   ├── ComparisonResults.tsx        # Results display with filtering
│   │   ├── SourceSelector.tsx           # Source/target configuration
│   │   └── HistoryCompare.tsx           # History comparison mode
│   └── types/
│       └── global.d.ts                  # TypeScript declarations
├── preload/
│   └── preload.ts                       # IPC bridge to renderer
└── shared/
    └── types.ts                         # Shared type definitions
```

---

## API Reference

### IPC Channels

| Channel | Description |
|---------|-------------|
| `extract-schema` | Extract all DDL objects from a database |
| `parse-folder` | Parse SQL files from a folder |
| `compare-schemas` | Compare source and target, return differences |
| `execute-scripts` | Execute SQL scripts against target database |
| `saveTextFile` | Save text content to file |
| `show-save-sql-dialog` | Show save dialog for SQL files |
| `show-folder-dialog` | Show folder browser dialog |

---

## Next Steps (Future Improvements)

1. ~~**Enhanced Table Comparison**~~ ✅ Completed
   - ~~Detect column datatype changes~~ ✅
   - ~~Compare constraints (CHECK, DEFAULT, UNIQUE)~~ ✅
   - ~~Compare indexes and foreign keys~~ ✅

2. **Dependency Analysis**
   - Check object dependencies before execution
   - Order scripts by dependency graph
   - Warn about potential breaking changes

3. ~~**Transaction Support**~~ ✅ Completed
   - ~~Wrap script execution in transactions~~ ✅
   - ~~Rollback on failure option~~ ✅

4. **Additional Features**
   - Schema snapshots for version control
   - Scheduled comparisons
   - ~~Report generation (HTML)~~ ✅ Completed
   - Report generation (PDF) - pending
   - Sync status dashboard

---

## Testing

To test the Schema Compare feature:

1. Launch the app via VNC
2. Select "Schema Compare" from home screen
3. Configure source (database or folder)
4. Configure target (database or folder)
5. Click "Compare" to run comparison
6. Use filters to narrow results
7. Select changes to apply or save
8. Click "Apply Changes" or "Save Scripts"

---

*Last Updated: January 17, 2026*
