# SSSC Schema Compare - Implementation Progress

## Overview
This document tracks the progress of implementing Red Gate SQL Compare-like functionality in SSSC (Simple SQL Source Control).

## Status: MVP with Limitations

Core Schema Compare functionality is implemented and usable. The implementation works best for **stored procedures, views, and functions**. Table comparison has limited coverage (see Known Limitations below).

### Important Caveats
- **Table comparison is partial**: Only detects added/removed columns, not datatype or constraint changes
- **No dependency analysis**: Scripts execute without checking for dependent objects
- **No transaction wrapping**: Each script executes independently (no rollback on failure)
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
- [x] Tables (basic column definitions - see limitations)
- [x] Views (full CREATE VIEW statements)
- [x] Stored Procedures (full CREATE PROCEDURE statements)
- [x] Functions (scalar, table-valued, inline)
- [x] Triggers (DML triggers on tables)

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
- [ ] Transaction wrapping (not implemented - scripts execute individually)
- [ ] Dependency analysis (not implemented - review scripts before execution)

### 10. Save Scripts
- [x] Export selected changes to .sql files
- [x] SQL-specific file dialog with proper extension
- [x] Timestamped default filename
- [x] Header comments with object info and risk level

### 11. History Compare (Existing)
- [x] View stored procedure snapshots over time
- [x] Compare two snapshots with diff view
- [x] Export diff reports as HTML

---

## Known Limitations

These are acknowledged gaps for future enhancement:

### Table Comparison
- Column datatype changes not detected (only added/removed columns)
- Constraint changes not fully detected
- Index changes not detected
- Foreign key changes limited

### Script Execution
- No dependency analysis before execution
- No transaction wrapping (scripts execute individually)
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

1. **Enhanced Table Comparison**
   - Detect column datatype changes
   - Compare constraints (CHECK, DEFAULT, UNIQUE)
   - Compare indexes and foreign keys

2. **Dependency Analysis**
   - Check object dependencies before execution
   - Order scripts by dependency graph
   - Warn about potential breaking changes

3. **Transaction Support**
   - Wrap script execution in transactions
   - Rollback on failure option

4. **Additional Features**
   - Schema snapshots for version control
   - Scheduled comparisons
   - Report generation (PDF/HTML)
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

*Last Updated: December 4, 2025*
