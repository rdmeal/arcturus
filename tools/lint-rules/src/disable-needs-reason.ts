import { defineRule } from "vite-plus/lint/plugins";

// Anchored at the start, after any block-comment `*`, so prose that mentions a directive isn't one.
const directive = /^[\s*]*(?:oxlint|eslint)-(?:disable|enable)(?:-line|-next-line)?(?:\s|$)/u;
const reason = /\s--\s*\S/u;

export function isDirectiveWithoutReason(commentText: string): boolean {
  return directive.test(commentText) && !reason.test(commentText);
}

export const disableNeedsReason = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require `-- <reason>` on every lint disable or enable comment." },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (isDirectiveWithoutReason(comment.value)) {
            context.report({
              loc: comment.loc,
              message:
                "Say why the rule doesn't apply, as `-- <reason>` (docs/develop/linting.md).",
            });
          }
        }
      },
    };
  },
});
