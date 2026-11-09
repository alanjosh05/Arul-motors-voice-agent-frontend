# Arul Motors ERP desktop app (Tauri 2)

A desktop window around https://crm.arulmotors.com. The website stays the
single source: upload a new frontend zip to GoDaddy and the app shows it on
next launch, so the app itself only needs rebuilding for icon or window changes.

- `dist/`: offline splash page (checks the connection, then opens the ERP).
- `src-tauri/src/lib.rs`: only crm.arulmotors.com opens inside the app; other
  links open in the browser. Job cards open in their own window, downloads go
  to Downloads, and only the microphone permission is granted.

## Build (on a Mac)

    npm install
    npm run build:mac   # universal .dmg  → src-tauri/target/universal-apple-darwin/release/bundle/dmg/
    PATH="/opt/homebrew/opt/llvm/bin:$PATH" npm run build:win
                        # Windows installer → src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/

One-time setup for the Windows build: `brew install nsis llvm`,
`rustup target add x86_64-pc-windows-msvc aarch64-apple-darwin x86_64-apple-darwin`,
`cargo install --locked cargo-xwin`.

Builds are unsigned: macOS asks you to right-click → Open on first launch, and
Windows SmartScreen shows "More info → Run anyway". The Windows installer
installs WebView2 if it's missing (needs internet).

Bump `version` in `src-tauri/tauri.conf.json` before each new release.
