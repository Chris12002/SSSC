# SSSC (Simple SQL Source Control)

## Overview
SSSC is an Electron desktop application designed to help developers manage and version control their SQL database schemas. It functions like Red Gate SQL Compare, allowing users to compare database schemas, view differences, and synchronize changes between environments.

## Project Type
- **Desktop Application**: Electron-based GUI application
- **Frontend**: React with Material-UI components
- **Backend**: Node.js with Electron main process
- **Database**: Connects to external Microsoft SQL Server databases

## Project Structure
- `src/main/` - Electron main process (backend logic)
  - `services/` - Database, schema extraction, folder parsing, and comparison services
  - `utils/` - File utilities and helpers
  - `config/` - Database and store configuration
- `src/renderer/` - React frontend application
  - `components/` - React UI components (HomeScreen, SchemaCompare, HistoryCompare, etc.)
  - `types/` - TypeScript type definitions
- `src/preload/` - Electron preload scripts (IPC bridge)
- `src/shared/` - Shared types and utilities
- `out/` - Build output directory

## Key Features

### Schema Compare Mode
- Compare database-to-database, folder-to-folder, or mixed comparisons
- Extract full DDL from SQL Server: tables, views, stored procedures, functions, triggers
- Parse SQL script folders for schema objects
- Color-coded diff display:
  - **Green**: Safe changes (additions, modifications to procs/views/functions)
  - **Yellow**: Warning changes (table modifications that may need review)
  - **Red**: Destructive changes (deletions, dropping columns)
- Filter by object type, name search, and risk level
- Script generation using CREATE OR ALTER (SQL Server 2016+ compatible)
- Apply Changes: Execute safe scripts directly to target database
- Save Scripts: Export to .sql files for git workflows

### History Compare Mode
- View and compare stored procedure snapshots over time
- Track changes to database objects with timestamps
- Generate diff reports in HTML format

## Build System
- **Build Tool**: electron-vite
- **TypeScript**: For type safety
- **Bundler**: Vite for the renderer process, Rollup for main process
- **Package Manager**: npm

## Development Setup

### Environment Requirements
This application runs as a desktop app with VNC display in Replit. The following system dependencies are required:
- X11 libraries (libX11, libxcb, etc.)
- Mesa (for OpenGL/graphics support including libgbm)
- GTK3 (for UI rendering)
- libxkbcommon (for keyboard support)

### Running the Application
```bash
npm run dev
```

The dev script includes:
- `LD_LIBRARY_PATH` configuration for Nix libraries
- `ELECTRON_DISABLE_SANDBOX=1` for containerized environments

### Building for Production
```bash
npm run build
```

## Replit Configuration

### Workflow
- **Name**: Electron App
- **Command**: `npm run dev`
- **Output**: VNC (desktop window display)

### System Dependencies
The following Nix packages are installed:
- xorg.libX11, xorg.libXcomposite, xorg.libXdamage, xorg.libXext
- xorg.libXfixes, xorg.libXrandr, xorg.libxcb
- mesa (includes libgbm for graphics buffer management)
- gtk3, glib, pango, cairo, gdk-pixbuf
- atk, at-spi2-atk
- cups, dbus, expat, libdrm, nspr, nss, alsa-lib
- libxkbcommon

### Special Configuration
The application requires special library path configuration to run in Replit:
- `LD_LIBRARY_PATH` includes `$HOME/.nix-profile/lib` for mesa libraries
- `ELECTRON_DISABLE_SANDBOX=1` to run without SUID sandbox

## Database Configuration
The application connects to external Microsoft SQL Server databases. Connection credentials are stored securely using electron-store with keychain service.

## Architecture Notes
- **Isolated Credentials**: Each source/target in Schema Compare maintains its own credential state to prevent connection conflicts during database-to-database comparisons
- **Script Generation**: Uses CREATE OR ALTER for procedures/views/functions; ALTER TABLE for safe table changes; destructive changes are blocked/commented
- **Risk Classification**: Changes are classified as safe, warning, or destructive based on the type of modification

## Recent Changes
- **2025-12-04**: Schema Compare Feature Complete
  - Home screen with Schema Compare and History Compare modes
  - Full database schema extraction (tables, views, procs, functions, triggers)
  - Folder parser for SQL script files
  - Comparison engine with risk classification
  - Color-coded diff display with filtering
  - Apply Changes to execute scripts on target database
  - Save Scripts to export SQL files for git workflows
  - Refactored History Compare to separate component

- **2025-11-26**: Initial Replit setup
  - Installed all required system dependencies for Electron
  - Configured library paths for mesa/libgbm
  - Set up VNC workflow for desktop display
  - Added sandbox disable flags for containerized environment
  - Successfully launched Electron app in Replit

## User Preferences
None documented yet.

## Notes
- The application displays through VNC, not as a web interface
- Database connections require external SQL Server access
- All credentials are stored locally in electron-store
- Destructive table changes (drop columns/tables) are shown as warnings but not included in executable scripts
