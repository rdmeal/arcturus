// Graphile Migrate loads only .gmrc, .gmrc.js or .gmrc.cjs, so this loads the
// typed configuration in gmrc.ts (Node strips its types).
module.exports = require("./gmrc.ts").settings;
