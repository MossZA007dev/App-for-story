import { seedDemoProject } from "../lib/db/seed";

try {
  const id = seedDemoProject();
  console.log("Seeded project ID:", id);
  process.exit(0);
} catch (err) {
  console.error("Seed error:", err);
  process.exit(1);
}
