# CommBee Desktop

Official desktop beta for [CommBee](https://commbee-beta.onrender.com/).

Windows: run the `.exe` installer. macOS: choose the Apple Silicon (`arm64`) or Intel (`x64`) `.dmg` and drag CommBee to Applications. Linux: use the `.deb`, or mark the `.AppImage` executable and open it. An internet connection is required. This is a dedicated desktop window for the hosted CommBee service; it does not host rooms on your computer.

The Windows beta installer is unsigned. macOS builds use an ad-hoc signature, without Developer ID signing or notarization. Windows/macOS may display an unverified publisher warning. Verify the repository and checksums before opening; no security settings need to be globally disabled. Apple notarization and signed Windows installers require signing credentials that are not configured in this beta.

The app keeps its own sign-in session. Microphone/camera permission is requested when needed. Screen sharing opens a chooser, and only a selected source is shared. Windows supports screen audio; OS capture capabilities differ on macOS/Linux. macOS requires Camera, Microphone and Screen Recording permission in System Settings. Linux Wayland uses the system capture portal.

## Development

Use Node.js 24, run `npm ci`, then `npm start`. `npm test` checks navigation policy. `npm run dist -- --win --x64` creates Windows installers. macOS builds run on macOS; Linux builds run on Linux. GitHub Actions builds native artifacts on each operating system when a version tag (`v0.1.2`) is pushed and publishes their SHA-256 checksums.

No database, password, cloud credential or server source is included in the desktop package. Web features update with the hosted site; desktop runtime updates require installing a newer desktop release.

CommBee is owned by Psyku G.

## Desktop controls (0.1.2)

Settings shows the installed version, Check for updates, Download update and Uninstall. A top notice appears when a newer desktop version is available. Updates download an official installer; installers are not executed automatically. Windows opens the installed uninstaller only after confirmation. macOS shows the app in Finder for moving to Trash. Linux shows the app location and package-removal instructions. Uninstall does not delete the CommBee account.

A sandboxed preload exposes only four fixed actions to the exact production main frame; no filesystem or shell API is exposed to page scripts. The yellow icon matches the web brand.
