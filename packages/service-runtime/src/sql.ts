import { createSqlTag } from "slonik";
import { z } from "zod";

/**
 * Slonik's SQL tag. `sql.type(rowSchema)` validates every row a query returns,
 * and `sql.typeAlias("void")` marks a statement that returns no rows.
 */
export const sql = createSqlTag({
  typeAliases: {
    void: z.object({}).strict(),
  },
});
