# Windows classroom release gate — 2026-11-19

## Student distribution contract
- Blog Arduino link opens a stable download landing page with a clearly labeled **Windows installer** (not a Bridge-only ZIP).
- Fresh installation installs or launches the full CubeLink Starter UI and required local Arduino Bridge; no manual GitHub repository navigation.
- Existing classroom installation upgrades in place. Keep local projects, AI sessions, settings, Arduino CLI cores, and downloaded runtime. Never uninstall or clear browser/app storage as part of upgrade.
- Windows download must be signed or carry an honest publisher/security warning, a version number, SHA-256 checksum, and rollback instructions.
- Keep current public web deployment and current classroom installers unchanged until validation.

## Mandatory acceptance checks before release
1. Identify the exact app/installer used on 2026-11-18; record install path, package identity, version and storage location. Do not assume Bridge ZIP is a complete app installer.
2. Build the complete Windows package and upgrade it over that existing install on **one** test PC. Confirm existing projects and preferences survive.
3. Fresh-install on a clean Windows profile; verify UI, Blockly, code generation, simulation, Live Bridge startup and Arduino COM discovery.
4. Verify one-click Live mode with a physical UNO (first browser USB permission may still be required), and compile/upload. Confirm no regressions.
5. Run automated tests and validate AI custom project behavior, visual hints, and breadboard wiring electrical connectivity; correct any failures.
6. Publish versioned installer and checksum; only then update the blog Arduino download link. Confirm the actual download works from a non-admin student Windows PC.
7. If any release gate fails, keep the old stable download available and clearly label the new build as a test candidate, not a student-ready release.

## Current known state
- Existing Bridge installer: bridge/setup-bridge.cmd (Bridge only, not verified full Windows UI).
- Current physical breadboard SVG: prototype, not electrically verified.
- Existing installed Windows package identity: unknown.
- Full Windows installer: not yet verified or published.
