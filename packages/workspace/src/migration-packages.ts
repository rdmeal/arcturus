import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

// The workspace folders that can hold a service, from `pnpm-workspace.yaml`.
const servicePackages = async (root: string): Promise<string[]> => {
  const services = await subfolders(root, "services");
  const games = await subfolders(root, "games");
  return [
    ...services.map((name) => join("services", name)),
    ...games.map((name) => join("games", name, "service")),
  ];
};

const subfolders = async (root: string, folder: string): Promise<string[]> => {
  try {
    const entries = await readdir(join(root, folder), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw error;
  }
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissing(error)) {
      return false;
    }
    throw error;
  }
};

const isMissing = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

// Every configuration file name Graphile Migrate looks for.
const configFiles = [".gmrc", ".gmrc.js", ".gmrc.cjs"];

const hasConfig = async (folder: string): Promise<boolean> => {
  const found = await Promise.all(configFiles.map((file) => exists(join(folder, file))));
  return found.includes(true);
};

/** The service packages, relative to `root` and sorted, that manage a database with Graphile Migrate. */
export const findMigrationPackages = async (root: string): Promise<string[]> => {
  const packages = await servicePackages(root);
  const withConfig = await Promise.all(
    packages.map(async (folder) => ((await hasConfig(join(root, folder))) ? folder : null)),
  );
  return withConfig.filter((folder) => folder !== null).toSorted();
};
