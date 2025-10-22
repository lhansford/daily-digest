# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Digest is a Node.js application that pulls bookmarks from Raindrop.io, converts them to EPUB format using Percollate, and uploads them to Dropbox for e-reader consumption (specifically targeting Kobo devices).

## Commands

### Build and Run
```bash
npm run build          # Compile TypeScript to dist/
npm start              # Build and run the application
npm run dev            # Run the pre-built application (requires prior build)
```

### Authentication Setup
```bash
npm run refresh-tokens  # Interactive script to obtain Dropbox refresh token
```

## Architecture

### Core Workflow (src/index.ts)

The main application follows this sequence:
1. Fetches bookmarks from Raindrop.io "For Daily Digest" collection (limited to 5)
2. Generates a `.kepub.epub` file using Percollate with custom styling
3. Uploads the EPUB to Dropbox at `/Apps/Rakuten Kobo/`
4. Moves successfully processed bookmarks to "In Daily Digest" collection

### Client Modules

**RaindropClient (src/raindrop-client.ts)**
- Wrapper around Raindrop.io REST API v1
- Key methods:
  - `getBookmarkUrls()`: Fetch bookmarks from a collection by title
  - `moveBookmarksToCollection()`: Move processed bookmarks to another collection
  - `findOrCreateCollection()`: Ensures target collection exists
- Handles both root and child collections via separate API endpoints

**DropboxClient (src/dropbox-client.ts)**
- OAuth2-based authentication using refresh tokens
- Hardcoded upload path: `/Apps/Rakuten Kobo` (specific to Kobo sync)
- Auto-creates folders and overwrites existing files with autorename

**Percollate Integration (src/percollate.ts)**
- Type definitions for the `percollate` package
- Key options used: `no-amp`, `bundle-images`, `sandbox: false`, `timeout: 60000`
- Returns URLs that were successfully converted

### Configuration

**Environment Variables (.env)**
Required variables:
- `RAINDROP_TOKEN`: Get from https://app.raindrop.io/settings/integrations
- `DROPBOX_CLIENT_ID`: From Dropbox App Console
- `DROPBOX_CLIENT_SECRET`: From Dropbox App Console
- `DROPBOX_REFRESH_TOKEN`: Obtain via `npm run refresh-tokens`

**Custom Styling (index.css)**
- Applied to generated EPUBs via `style: "index.css"` option
- Customizes fonts (Bitter serif, Ubuntu sans-serif), colors (navy headings), spacing
- Optimized for e-reader display with page break controls

### TypeScript Configuration

- Target: ES2022 with CommonJS modules
- Strict mode enabled with additional checks (noUnusedLocals, noImplicitReturns)
- Output directory: `dist/`
- Source directory: `src/`

## Important Implementation Details

1. **Kepub Format**: Output files use `.kepub.epub` extension, which is specific to Kobo e-readers and enables enhanced features
2. **Error Handling**: Application exits with error codes if critical operations fail, but continues if only bookmark moving fails
3. **Collection Names**: Hardcoded collection names ("For Daily Digest", "In Daily Digest") - changes require code modification
4. **Timestamp-based Naming**: Generated files include ISO date format (YYYY-MM-DD)
5. **Percollate Sandboxing**: Disabled (`sandbox: false`) for compatibility - this affects browser security context
