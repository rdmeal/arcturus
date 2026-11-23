import { describe, expect, test } from "vite-plus/test";

import { isDirectiveWithoutReason } from "./disable-needs-reason.ts";

// Comment text as the parser gives it: without the `//` or `/* */` delimiters.
describe("isDirectiveWithoutReason", () => {
  test("rejects a disable-next-line directive with no reason", () => {
    expect(isDirectiveWithoutReason(" oxlint-disable-next-line no-debugger")).toBe(true);
  });

  test("accepts a directive with `-- <reason>`", () => {
    expect(
      isDirectiveWithoutReason(
        " oxlint-disable-next-line no-debugger -- a debugger is wanted here",
      ),
    ).toBe(false);
  });

  test("rejects `--` with nothing after it", () => {
    expect(isDirectiveWithoutReason(" oxlint-disable-next-line no-debugger --")).toBe(true);
    expect(isDirectiveWithoutReason(" oxlint-disable-next-line no-debugger --   ")).toBe(true);
  });

  test("covers oxlint- and eslint- disable, enable, -line and -next-line forms", () => {
    const forms = [
      "oxlint-disable",
      "oxlint-enable",
      "oxlint-disable-line",
      "oxlint-disable-next-line",
      "eslint-disable",
      "eslint-enable",
      "eslint-disable-line",
      "eslint-disable-next-line",
    ];

    expect(forms.filter((form) => !isDirectiveWithoutReason(` ${form} no-debugger`))).toStrictEqual(
      [],
    );
    expect(
      forms.filter((form) => isDirectiveWithoutReason(` ${form} no-debugger -- wanted`)),
    ).toStrictEqual([]);
    expect(isDirectiveWithoutReason("\n * oxlint-disable no-debugger\n ")).toBe(true);
  });

  test("ignores ordinary comments that mention oxlint-disable mid-sentence", () => {
    expect(isDirectiveWithoutReason(" Use oxlint-disable-next-line sparingly.")).toBe(false);
    expect(isDirectiveWithoutReason(" an ordinary comment")).toBe(false);
  });
});
