// gen-import.config.js
// Run: npx gen-import --packages --app-config
module.exports = {
  srcDir: 'src',
  skipPatterns: [
    'src/app.ts',          // app factory — not part of the barrel
    '/Controller/',        // controllers are module-internal; never imported cross-module
  ],
}
