import { db } from "../lib/db";
import { images } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const allImages = db.select().from(images).all();
console.log("Found images to update:", allImages.length);

const fantasyImages = [
  {
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    caption: "เพลิงสีมรกตผลาญกองทัพเรือ ณ ศึก Blackwater (Canon Reference)",
    kind: "movie_still" as const,
  },
  {
    url: "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=1200&q=80",
    caption: "ป้อมปราการ Red Keep และผาหินริมทะเล King's Landing",
    kind: "movie_still" as const,
  },
  {
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
    caption: "การตื่นขึ้นท่ามกลางซากปรักหักพังของสงคราม (AI Scene Illustration)",
    kind: "scene" as const,
  },
];

for (let i = 0; i < allImages.length && i < fantasyImages.length; i++) {
  db.update(images)
    .set({
      filePath: fantasyImages[i].url,
      caption: fantasyImages[i].caption,
      kind: fantasyImages[i].kind,
      approved: 1,
    })
    .where(eq(images.id, allImages[i].id))
    .run();
}

console.log("Updated images successfully!");
