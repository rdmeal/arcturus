import { defineConfig } from "vite-plus";

const ignorePatterns = ["scratchpad/**"];

export default defineConfig({
  fmt: {
    ignorePatterns,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns,
    options: {
      typeAware: true,
      typeCheck: true,
      // Oxlint reports most rules as warnings; fail `vp check` on them too.
      denyWarnings: true,
    },
  },
  test: {
    // The workspace has no tests yet. Remove this once the first test exists.
    passWithNoTests: true,
  },
});
