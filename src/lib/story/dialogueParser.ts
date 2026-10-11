export interface CharacterMeta {
  id?: string;
  name: string;
  characterType?: "self" | "friend" | "canon";
  realNickname?: string;
  avatarUrl?: string;
  currentMbti?: string;
  faction?: string;
  chosenRole?: string;
}

export interface DialogueBlock {
  id: string;
  type: "dialogue" | "narration" | "sound";
  speaker?: CharacterMeta | null;
  speakerName?: string;
  isNarrator?: boolean;
  side: "left" | "right";
  text: string;
  originalIndex: number;
}

export interface SceneImageMeta {
  id: string;
  prompt: string;
  filePath: string;
  kind: "portrait" | "scene" | "cover" | "movie_still" | "reference";
  approved?: number;
  caption?: string;
}

/**
 * Parses raw scene markdown into structured dialogue beats for the Visual Novel reader.
 */
export function parseSceneToDialogueBlocks(
  contentMarkdown: string,
  characters: CharacterMeta[] = []
): DialogueBlock[] {
  if (!contentMarkdown) return [];

  const lines = contentMarkdown
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: DialogueBlock[] = [];
  const selfChar = characters.find((c) => c.characterType === "self") || null;
  const friendChars = characters.filter((c) => c.characterType === "friend");

  let dialogueTurn = 0;

  lines.forEach((line, index) => {
    // 1. Check if line is Sound Effect / Atmospheric stage direction
    const isSound =
      line.startsWith("เสียง") ||
      line.includes("..........") ||
      line.includes(".....") ||
      (line.startsWith("*") && line.endsWith("*")) ||
      (line.startsWith("(") && line.endsWith(")"));

    if (isSound) {
      blocks.push({
        id: `sound-${index}`,
        type: "sound",
        side: "left",
        text: line.replace(/^\*+|\*+$/g, ""),
        originalIndex: index,
      });
      return;
    }

    // 2. Check if line is Dialogue (quoted with "..." or “...”) or Speaker Prefix
    const quoteMatch = line.match(/^["“](.+?)["”](.*)$/);
    const speakerPrefixMatch = line.match(/^([^:：]+)[:：]\s*["“]?(.*?)["”]?$/);

    if (quoteMatch || speakerPrefixMatch) {
      dialogueTurn++;
      const isOdd = dialogueTurn % 2 !== 0;

      let speakerName = "";
      let speechText = line;
      let speakerObj: CharacterMeta | null = null;

      if (speakerPrefixMatch) {
        speakerName = speakerPrefixMatch[1].trim();
        speechText = speakerPrefixMatch[2] || line;
        speakerObj =
          characters.find(
            (c) =>
              c.name.toLowerCase() === speakerName.toLowerCase() ||
              (c.realNickname && c.realNickname.toLowerCase() === speakerName.toLowerCase())
          ) || null;
      } else if (quoteMatch) {
        speechText = line;
        if (isOdd && selfChar) {
          speakerObj = selfChar;
          speakerName = selfChar.realNickname || selfChar.name;
        } else if (!isOdd && friendChars.length > 0) {
          speakerObj = friendChars[(Math.floor(dialogueTurn / 2) - 1) % friendChars.length];
          speakerName = speakerObj.realNickname || speakerObj.name;
        }
      }

      const isSelf = speakerObj?.characterType === "self" || (!speakerObj && isOdd);
      const side = isSelf ? "left" : "right";

      blocks.push({
        id: `dialogue-${index}`,
        type: "dialogue",
        speaker: speakerObj || (isSelf ? selfChar : friendChars[0] || null),
        speakerName: speakerName || (isSelf ? selfChar?.realNickname || "ฉัน" : "เพื่อน"),
        isNarrator: false,
        side,
        text: speechText,
        originalIndex: index,
      });
    } else {
      // 3. Descriptive scene narration: Voiced by User's Character as the Narrator
      const narratorName = selfChar?.realNickname || selfChar?.name || "ฉัน";

      blocks.push({
        id: `narr-${index}`,
        type: "narration",
        speaker: selfChar,
        speakerName: narratorName,
        isNarrator: true,
        side: "left",
        text: line,
        originalIndex: index,
      });
    }
  });

  return blocks;
}

/**
 * Resolves which image should be displayed for a given active dialogue index.
 * If the current index has a direct binding, uses it.
 * Otherwise, scans backwards to find the most recent bound image.
 * Falls back to images[0] or null if no images are bound.
 */
export function resolveImageForDialogueIndex(
  activeIndex: number,
  bindings: Record<string, string>,
  images: SceneImageMeta[]
): { image: SceneImageMeta | null; imageIndex: number; isDirectBinding: boolean; boundBlockIndex?: number } {
  if (!images || images.length === 0) {
    return { image: null, imageIndex: -1, isDirectBinding: false };
  }

  if (activeIndex < 0) {
    return { image: images[0], imageIndex: 0, isDirectBinding: false };
  }

  // 1. Direct binding on activeIndex
  const directImageId = bindings[String(activeIndex)];
  if (directImageId) {
    const idx = images.findIndex((img) => img.id === directImageId);
    if (idx !== -1) {
      return {
        image: images[idx],
        imageIndex: idx,
        isDirectBinding: true,
        boundBlockIndex: activeIndex,
      };
    }
  }

  // 2. Look backwards for the most recent bound image
  for (let i = activeIndex - 1; i >= 0; i--) {
    const imageId = bindings[String(i)];
    if (imageId) {
      const idx = images.findIndex((img) => img.id === imageId);
      if (idx !== -1) {
        return {
          image: images[idx],
          imageIndex: idx,
          isDirectBinding: false,
          boundBlockIndex: i,
        };
      }
    }
  }

  // 3. Fallback to the first image in the scene
  return { image: images[0], imageIndex: 0, isDirectBinding: false };
}

/**
 * Automatically distributes scene images evenly across dialogue blocks.
 */
export function autoDistributeDialogueImages(
  totalBlocks: number,
  images: SceneImageMeta[]
): Record<string, string> {
  const result: Record<string, string> = {};
  if (totalBlocks <= 0 || !images || images.length === 0) return result;

  const numImages = images.length;
  if (numImages === 1) {
    result["0"] = images[0].id;
    return result;
  }

  const step = Math.max(1, Math.floor(totalBlocks / numImages));
  images.forEach((img, idx) => {
    const targetBlockIndex = Math.min(idx * step, totalBlocks - 1);
    result[String(targetBlockIndex)] = img.id;
  });

  return result;
}
