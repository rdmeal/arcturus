import { definePlugin } from "vite-plus/lint/plugins";
import { disableNeedsReason } from "./disable-needs-reason.ts";

export default definePlugin({
  meta: { name: "arcturus" },
  rules: { "disable-needs-reason": disableNeedsReason },
});
