# CLAUDE.md — Drag & Drop File Uploader

This file documents the codebase structure, development conventions, and workflows for AI assistants working on this project.

---

## Project Overview

A lightweight, dependency-free drag-and-drop file uploader built with vanilla HTML/CSS/JavaScript on the frontend and PHP on the backend. The UI is in **Polish**. Users can drag files or entire folder trees onto the upload zone; the server preserves the original folder structure inside timestamped upload directories.

There are **no build tools, no package manager, and no framework**. The project is deployed by serving its files with any PHP-capable web server.

---

## Repository Structure

```
Drag_drop/
├── index.html        # Single-page UI (Polish, HTML5)
├── script.js         # All frontend logic (vanilla JS, 214 lines)
├── style.css         # All styles (vanilla CSS, 134 lines)
├── upload.php        # Backend upload handler (PHP, 76 lines)
├── plugins/          # Plugin skeleton directory
│   ├── README.md     # Plugin conventions (in Polish)
│   ├── encryption.php # Skeleton: file encryption plugin
│   ├── zip.php        # Skeleton: ZIP compression plugin
│   └── links.php      # Skeleton: download token generator plugin
├── uploads/          # Runtime upload destination (git-ignored contents)
│   └── .gitignore
├── drag_upload.zip   # Distribution archive (do not modify)
└── README.md         # Minimal project description
```

---

## Tech Stack

| Layer     | Technology                             |
|-----------|----------------------------------------|
| Frontend  | HTML5, Vanilla JavaScript (ES6+), CSS3 |
| Backend   | PHP (no framework, no Composer)        |
| APIs used | File System Access API (`webkitGetAsEntry`), XMLHttpRequest, `webkitdirectory` input attribute |
| Storage   | Local filesystem under `uploads/`     |

**No Node.js, no npm, no Composer, no database.**

---

## Key Files in Detail

### `index.html`
- Language attribute: `lang="pl"` (Polish)
- Contains a hidden `<input type="file" multiple webkitdirectory directory>` for folder picking
- Table columns (Polish labels): Nazwa pliku, Format, Rozmiar (kB), Ścieżka, Postęp, Status
- The `<tbody>` is populated dynamically by `script.js`

### `script.js`
All frontend logic lives here. Key functions:

| Function | Purpose |
|---|---|
| `addFiles(files)` | Adds `File` objects to the internal `fileList` array and table; triggers upload immediately if auto-upload is enabled |
| `addFileRow(fileEntry)` | Creates a `<tr>` in the file table; stores the index in `data-index` |
| `getFormat(filename)` | Returns the lowercase file extension |
| `uploadFile(fileEntry)` | POSTs a single file via `XMLHttpRequest` to `upload.php`; updates the progress bar and status cell |
| `handleDataTransferItems(items)` | Entry point for drag-drop; delegates to `traverseFileTree` for folder entries |
| `traverseFileTree(entry, path)` | Recursively walks `FileSystemEntry` trees; attaches `file.relativePath` so folder structure is preserved |

**State model for each file entry:**
```
{ file, path, status: 'ready'|'uploading'|'done'|'error', progress: 0-100 }
```

Upload flow:
1. Drop or click → `handleDataTransferItems` or `fileInput.change`
2. `addFiles` → pushes entries, renders rows, optionally starts upload
3. `uploadFile` → XHR POST with `files[]` (the `File` blob) and `paths[]` (relative path string)
4. Progress events update the green bar; `readyState === 4` sets final status

### `style.css`
- System font stack (`-apple-system`, `BlinkMacSystemFont`, etc.)
- Accent color: `#007bff` (blue) for the drop zone border and primary button
- Progress bar color: `#28a745` (green)
- Drop zone hover state: class `.dragover` added/removed by JS
- No preprocessor — plain CSS only

### `upload.php`
**Request format expected:**
- Method: `POST`
- `$_FILES['files']` — multi-file upload array
- `$_POST['paths']` — parallel array of relative paths from the frontend

**What it does:**
1. Creates `uploads/` if absent (mode `0755`)
2. Creates a timestamped subdirectory: `uploads/YYYYMMDD_HHMMSS/`
3. For each file, reconstructs subdirectories from the relative path
4. Moves temp file with `move_uploaded_file()`
5. Writes one line per file to `uploads/YYYYMMDD_HHMMSS/file_list.txt` (`relative/path | size kB`)
6. Returns `{"status":"success","path":"YYYYMMDD_HHMMSS"}` or HTTP 400 on no files

**Response format:** JSON (`Content-Type: application/json; charset=utf-8`)

---

## Plugin Architecture

Plugins live in `plugins/` and are **currently skeletons only** — none are wired into `upload.php` yet.

### Existing skeletons

| File | Class | Interface |
|---|---|---|
| `encryption.php` | `EncryptionPlugin` | `encrypt(string $data): string` |
| `zip.php` | `ZipPlugin` | `createZip(array $filePaths, string $archivePath): bool` |
| `links.php` | `LinksPlugin` | `generateToken(string $filePath): string`, `validateToken(string $token): string\|false` |

### How to add a plugin

1. Copy a skeleton from `plugins/` (or create a new PHP file there).
2. Implement the class methods.
3. `require_once` the plugin file at the top of `upload.php`.
4. Instantiate and call the plugin inside the upload loop (after `move_uploaded_file` succeeds).
5. Plugins may be toggled via a future `config.php` or admin panel.

No autoloader exists; use explicit `require_once` statements.

---

## Development Workflow

### Running locally

Serve the project root with any PHP-capable server:

```bash
# PHP built-in server (PHP 5.4+)
php -S localhost:8080

# Apache/Nginx: point document root at the project directory
```

Then open `http://localhost:8080` in a browser. Uploads will appear under `uploads/`.

### There are no build steps

- No transpilation, no bundling, no minification
- Edit `.js`, `.css`, `.html`, or `.php` files directly and reload the browser
- No `npm install`, `composer install`, or similar commands needed

### No automated tests

There is no test framework (PHPUnit, Jest, etc.). Manual browser testing is the current approach.

---

## Code Conventions

### JavaScript
- **ES6+ features are used**: `const`/`let`, arrow functions, template literals, `Array.from`, `forEach`
- **No modules**: everything is in a single file with global scope
- **Comments are in Polish** (matching the project's language)
- DOM references are grabbed once at the top and reused
- The `fileList` array is the single source of truth for upload state
- Row lookup uses `tr[data-index='N']` selector pattern

### PHP
- **No namespaces, no autoloading** — plain procedural style in `upload.php`, class-based only in plugins
- `basename()` is used on filenames before constructing paths
- `is_uploaded_file()` validates temp files before moving
- Directories are created with `mkdir($path, 0755, true)` (recursive)
- Output is always JSON; set via `header('Content-Type: application/json; charset=utf-8')`

### CSS
- All styles are in one flat file — no nesting, no variables, no `@import`
- Class names use BEM-adjacent conventions: `.drop-zone`, `.drop-zone.dragover`, `.progress-bar`, `.primary-btn`

### General
- **Polish language throughout** — UI strings, code comments, and README content are in Polish
- Keep files small and self-contained; avoid splitting logic across multiple files
- No external CDN dependencies — everything is local

---

## Security Considerations (Known Gaps)

The following limitations exist and should be addressed before production deployment:

- **No file type restrictions** — any file type is accepted
- **No file size enforcement** in PHP (only browser/server PHP config limits apply)
- **No authentication or authorization** — uploads endpoint is publicly accessible
- **No CSRF protection**
- **No rate limiting**
- **No filename sanitization beyond `basename()`** — path traversal via `paths[]` is a risk; validate and sanitize `$relativePath` before using in `mkdir`/file path construction
- **Uploads are publicly accessible** — files saved under a web-accessible `uploads/` directory
- **Plugin system is not yet integrated** — encryption and access control plugins are stubs only

---

## Git Branch Convention

Active development branch: `claude/claude-md-mly9el13otmbi9t7-OF3ZG`

All feature work should be committed to a `claude/`-prefixed branch and pushed with:
```bash
git push -u origin <branch-name>
```
