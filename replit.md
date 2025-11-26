# SSSC (Simple SQL Source Control)

## Overview
SSSC is an Electron desktop application designed to help developers manage and version control their SQL database schemas and data. It provides an easy way to track changes, compare snapshots, and ensure consistency across different environments.

## Project Type
- **Desktop Application**: Electron-based GUI application
- **Frontend**: React with Material-UI components
- **Backend**: Node.js with Electron main process
- **Database**: Connects to external Microsoft SQL Server databases

## Project Structure
- `src/main/` - Electron main process (backend logic)
- `src/renderer/` - React frontend application
- `src/preload/` - Electron preload scripts (IPC bridge)
- `src/shared/` - Shared types and utilities
- `out/` - Build output directory

## Key Features
- Version control for SQL schemas and data
- Snapshot comparison and diff generation
- Integration with SQL Server databases
- User-friendly Material-UI interface
- HTML export for diff reports

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
The application connects to external Microsoft SQL Server databases. Connection credentials are stored securely using electron-store.

## Recent Changes
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
