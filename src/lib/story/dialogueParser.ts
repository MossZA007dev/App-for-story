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

export interface ParsedScriptResult {
  partTitle?: string;
  sceneTitle?: string;
  location?: string;
  time?: string;
  detectedCharacters: string[];
  blocks: DialogueBlock[];
  rawCleanMarkdown: string;
}

/**
 * Intelligent parser tailored for Claude / LLM scripts and Thai novel screenplay formats.
 * Automatically extracts scene headers, locations, sound FX, characters, and dialogue lines.
 */
export function parseClaudeScript(
  contentMarkdown: string,
  characters: CharacterMeta[] = []
): ParsedScriptResult {
  if (!contentMarkdown) {
    return {
      detectedCharacters: [],
      blocks: [],
      rawCleanMarkdown: "",
    };
  }

  const lines = contentMarkdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let partTitle = "";
  let sceneTitle = "";
  let location = "";
  let time = "";
  const detectedCharacters = new Set<string>();
  const blocks: DialogueBlock[] = [];

  const selfChar = characters.find((c) => c.characterType === "self") || null;
  const friendChars = characters.filter((c) => c.characterType === "friend");

  let dialogueTurn = 0;

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const line = rawLine.replace(/^[-*•]\s+/, "").trim();

    // 1. Metadata Headers
    // E.g. "ภาค 1: จุดเริ่มต้นแห่งเงามืด", "Part 1: ...", "# ภาค 1"
    const partMatch = line.match(/^(?:#+\s*)?(?:ภาค|Part|บทที่|Chapter|ตอนที่)\s*\d*[:：\s-]*(.*)$/i);
    if (partMatch) {
      if (partMatch[1]) partTitle = partMatch[1].trim();
      continue;
    }

    // E.g. "ฉากที่ 1: คนทรยศแห่งกำแพง", "Scene 1: ..."
    const sceneMatch = line.match(/^(?:#+\s*)?(?:ฉากที่|ฉาก|Scene)\s*\d*[:：\s-]*(.*)$/i);
    if (sceneMatch) {
      if (sceneMatch[1]) sceneTitle = sceneMatch[1].trim();
      continue;
    }

    // E.g. "สถานที่: ลานประหาร วินเทอร์เฟลล์", "Location: ..."
    const locationMatch = line.match(/^(?:\*{0,2})(?:สถานที่|Location|Place)(?:\*{0,2})[:：]\s*(.*)$/i);
    if (locationMatch) {
      if (locationMatch[1]) location = locationMatch[1].trim();
      continue;
    }

    // E.g. "เวลา: เช้าตรู่", "Time: ..."
    const timeMatch = line.match(/^(?:\*{0,2})(?:เวลา|Time)(?:\*{0,2})[:：]\s*(.*)$/i);
    if (timeMatch) {
      if (timeMatch[1]) time = timeMatch[1].trim();
      continue;
    }

    // E.g. "ตัวละคร: เน็ด, มอส", "Characters: ..."
    const charListMatch = line.match(/^(?:\*{0,2})(?:ตัวละคร|ตัวละครในฉาก|Characters?)(?:\*{0,2})[:：]\s*(.*)$/i);
    if (charListMatch) {
      continue;
    }

    // Markdown horizontal rule: "---", "***", "___"
    if (/^[-*_]{3,}$/.test(line)) {
      continue;
    }

    // 2. Sound Effects / Stage FX
    const soundMatch = line.match(/^(?:\*{0,2})(?:เสียง|เสียงประกอบ|SFX|Sound)(?:\*{0,2})[:：]\s*(.*)$/i);
    const isEnclosedSound =
      (line.startsWith("*") && line.endsWith("*") && !line.slice(1, -1).includes("*")) ||
      (line.startsWith("(") && line.endsWith(")") && (line.includes("เสียง") || line.includes("SFX") || line.includes("....."))) ||
      line.includes("..........") ||
      line.includes(".....");

    if (soundMatch || isEnclosedSound) {
      const soundText = soundMatch ? soundMatch[1].trim() : line.replace(/^\*+|\*+$/g, "").trim();
      blocks.push({
        id: `sound-${index}`,
        type: "sound",
        side: "left",
        text: soundText || line,
        originalIndex: index,
      });
      continue;
    }

    // 3. Explicit Narration lines: "ผู้บรรยาย: ...", "บรรยาย: ..."
    const narrMatch = line.match(/^(?:\*{0,2})(?:ผู้บรรยาย|บรรยาย|คำบรรยาย|Narrator)(?:\*{0,2})[:：]\s*(.*)$/i);
    if (narrMatch) {
      const narrText = narrMatch[1].trim().replace(/^["“]|["”]$/g, "");
      blocks.push({
        id: `narr-${index}`,
        type: "narration",
        speaker: selfChar,
        speakerName: selfChar?.realNickname || selfChar?.name || "ผู้บรรยาย",
        isNarrator: true,
        side: "left",
        text: narrText,
        originalIndex: index,
      });
      continue;
    }

    // 4. Character Dialogue with speaker prefix: e.g. "เน็ด: ท่านรู้โทษ...", "มอส (พึมพำ): ..."
    const speakerPrefixMatch = line.match(/^(?:\*{0,2})([^:：\n\r]+?)(?:\*{0,2})\s*[:：]\s*["“]?(.*?)["”]?$/);

    if (speakerPrefixMatch) {
      const rawSpeaker = speakerPrefixMatch[1].trim();
      let speechText = speakerPrefixMatch[2] ? speakerPrefixMatch[2].trim() : "";

      // Check if speaker has inline emotion or stage direction like "มอส (พึมพำ)"
      const stageDirMatch = rawSpeaker.match(/^([^\(\[（]+)(?:[\(\[（](.*?)[\)\]）])?$/);
      let cleanSpeakerName = rawSpeaker;
      if (stageDirMatch) {
        cleanSpeakerName = stageDirMatch[1].trim();
        if (stageDirMatch[2] && !speechText.startsWith("(") && !speechText.startsWith("（")) {
          speechText = `(${stageDirMatch[2].trim()}) ${speechText}`;
        }
      }

      if (cleanSpeakerName.length > 0 && cleanSpeakerName.length < 50) {
        dialogueTurn++;
        const speakerLower = cleanSpeakerName.toLowerCase();

        // Find match in existing characters (by name or realNickname)
        const speakerObj = characters.find((c) => {
          const cName = c.name.toLowerCase();
          const cNick = (c.realNickname || "").toLowerCase();
          return (
            cName === speakerLower ||
            cNick === speakerLower ||
            (cName.length > 2 && speakerLower.includes(cName)) ||
            (speakerLower.length > 2 && cName.includes(speakerLower))
          );
        }) || null;

        // Is protagonist / self character?
        const isSelf = speakerObj
          ? speakerObj.characterType === "self"
          : /^(ฉัน|ผม|ข้า|เรา|ตัวเอง|me|i)$/i.test(cleanSpeakerName);

        let finalSpeaker: CharacterMeta;
        if (speakerObj) {
          finalSpeaker = speakerObj;
        } else {
          // Detect as new character
          detectedCharacters.add(cleanSpeakerName);
          finalSpeaker = {
            id: `temp-${encodeURIComponent(cleanSpeakerName)}`,
            name: cleanSpeakerName,
            realNickname: cleanSpeakerName,
            characterType: isSelf ? "self" : "friend",
          };
        }

        const side = isSelf ? "left" : "right";

        blocks.push({
          id: `dialogue-${index}`,
          type: "dialogue",
          speaker: finalSpeaker,
          speakerName: finalSpeaker.realNickname || finalSpeaker.name || cleanSpeakerName,
          isNarrator: false,
          side,
          text: speechText,
          originalIndex: index,
        });
        continue;
      }
    }

    // 5. Quoted dialogue without explicit speaker name: e.g. "ระวังตัวด้วย!"
    const quoteMatch = line.match(/^["“](.+?)["”]$/);
    if (quoteMatch) {
      dialogueTurn++;
      const isOdd = dialogueTurn % 2 !== 0;
      let speakerObj: CharacterMeta | null = null;
      let speakerName = "";

      if (isOdd && selfChar) {
        speakerObj = selfChar;
        speakerName = selfChar.realNickname || selfChar.name;
      } else if (!isOdd && friendChars.length > 0) {
        speakerObj = friendChars[(Math.floor(dialogueTurn / 2) - 1) % friendChars.length];
        speakerName = speakerObj.realNickname || speakerObj.name;
      }

      const isSelf = speakerObj?.characterType === "self" || (!speakerObj && isOdd);
      blocks.push({
        id: `dialogue-${index}`,
        type: "dialogue",
        speaker: speakerObj || (isSelf ? selfChar : friendChars[0] || null),
        speakerName: speakerName || (isSelf ? selfChar?.realNickname || "ฉัน" : "เพื่อน"),
        isNarrator: false,
        side: isSelf ? "left" : "right",
        text: quoteMatch[1],
        originalIndex: index,
      });
      continue;
    }

    // 6. Descriptive scene narration (pure descriptive line without colons)
    const narratorName = selfChar?.realNickname || selfChar?.name || "ผู้บรรยาย";
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

  return {
    partTitle,
    sceneTitle,
    location,
    time,
    detectedCharacters: Array.from(detectedCharacters),
    blocks,
    rawCleanMarkdown: blocksToMarkdown(blocks),
  };
}

/**
 * Splits a bulk script that might contain multiple scenes (e.g. "ฉากที่ 1: ...", "ฉากที่ 2: ...")
 */
export function splitMultiSceneScript(
  bulkScript: string
): { sceneNumber: number; title: string; location: string; content: string }[] {
  if (!bulkScript) return [];

  const lines = bulkScript.split(/\r?\n/);
  const sceneRegex = /^(?:#+\s*)?(?:ฉากที่|ฉาก|Scene)\s*(\d+)?[:：\s-]*(.*)$/i;

  const scenes: { sceneNumber: number; title: string; location: string; contentLines: string[] }[] = [];
  let currentScene: { sceneNumber: number; title: string; location: string; contentLines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(sceneRegex);

    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : scenes.length + 1;
      const title = match[2] ? match[2].trim() : `ฉากที่ ${num}`;
      currentScene = {
        sceneNumber: num,
        title,
        location: "",
        contentLines: [],
      };
      scenes.push(currentScene);
      continue;
    }

    if (currentScene) {
      const locMatch = trimmed.match(/^(?:\*{0,2})(?:สถานที่|Location|Place)(?:\*{0,2})[:：]\s*(.*)$/i);
      if (locMatch && !currentScene.location) {
        currentScene.location = locMatch[1].trim();
      }
      currentScene.contentLines.push(line);
    }
  }

  if (scenes.length === 0) {
    return [
      {
        sceneNumber: 1,
        title: "ฉากที่ 1",
        location: "",
        content: bulkScript,
      },
    ];
  }

  return scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    title: s.title,
    location: s.location,
    content: s.contentLines.join("\n").trim(),
  }));
}

/**
 * Parses raw scene markdown into structured dialogue beats for the Visual Novel reader.
 */
export function parseSceneToDialogueBlocks(
  contentMarkdown: string,
  characters: CharacterMeta[] = []
): DialogueBlock[] {
  return parseClaudeScript(contentMarkdown, characters).blocks;
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

/**
 * Converts an array of DialogueBlock items back into clean markdown text.
 */
export function blocksToMarkdown(blocks: DialogueBlock[]): string {
  return blocks
    .map((b) => {
      const text = b.text.trim();
      if (!text) return "";

      if (b.type === "sound") {
        return text.startsWith("*") && text.endsWith("*") ? text : `*${text}*`;
      }

      if (b.type === "narration" || b.isNarrator) {
        return text;
      }

      // Dialogue line
      const cleanText = text.replace(/^["“]|["”]$/g, "").trim();
      const speakerName = b.speaker?.realNickname || b.speaker?.name || b.speakerName;
      if (speakerName) {
        return `${speakerName}: "${cleanText}"`;
      }
      return `"${cleanText}"`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export interface AudioBindingResult {
  action: "play_ambient" | "play_scene_bgm" | "play_url" | "stop" | "none";
  value: string;
  label: string;
  isDirectBinding: boolean;
  boundBlockIndex?: number;
}

export const AUDIO_MOOD_OPTIONS: { id: string; label: string; group: string }[] = [
  { id: "wildfire", label: "🔥 เพลิงป่า / ระทึกขวัญ (Wildfire Drone)", group: "บรรยากาศ" },
  { id: "winter", label: "❄️ ลมเหมันต์ / เงียบเหงา (Winter Winds)", group: "บรรยากาศ" },
  { id: "war", label: "⚔️ มหากาพย์ศึก / ตื่นเต้น (War Drums)", group: "บรรยากาศ" },
  { id: "shadows", label: "🌑 เงาทมิฬ / ลึกลับ (Shadows Ethereal)", group: "บรรยากาศ" },
  { id: "heartbeat", label: "💓 หัวใจเต้น / ตึงเครียด (Heartbeat Tension)", group: "บรรยากาศ" },
  { id: "rain", label: "🌧️ สายฝน / หม่นหมอง (Rain & Melancholy)", group: "บรรยากาศ" },
  { id: "thunder", label: "⚡ ฟ้าผ่า / สะเทือนขวัญ (Thunder Impact)", group: "เอฟเฟกต์" },
  { id: "blade", label: "🗡️ ชักดาบ / คมดาบ (Blade Unsheathe)", group: "เอฟเฟกต์" },
  { id: "scene_bgm", label: "🎶 กลับไปเล่นเพลงประจำฉาก", group: "เพลง" },
  { id: "stop", label: "🔇 ดับเพลง / เงียบกริบ (Cut to Silence)", group: "เพลง" },
];

export function getAudioMoodLabel(value: string): string {
  if (!value) return "";
  if (value.startsWith("url:")) {
    const urlStr = value.replace(/^url:/, "");
    return `🎵 ลิงก์เพลง: ${urlStr.slice(0, 24)}...`;
  }
  const found = AUDIO_MOOD_OPTIONS.find((opt) => opt.id === value);
  return found ? found.label : value;
}

/**
 * Resolves which audio/mood should be playing at a given active dialogue index.
 * If the current index has an audio binding, activates it.
 * Otherwise, scans backwards to find the most recent audio binding.
 * Falls back to scene BGM if available.
 */
export function resolveAudioForDialogueIndex(
  activeIndex: number,
  bindings: Record<string, string>,
  sceneBgmUrl?: string | null
): AudioBindingResult {
  if (activeIndex < 0) {
    return { action: "none", value: "", label: "", isDirectBinding: false };
  }

  // 1. Direct binding on activeIndex
  const directVal = bindings[`audio_${activeIndex}`];
  if (directVal) {
    return {
      action:
        directVal === "stop"
          ? "stop"
          : directVal === "scene_bgm"
          ? "play_scene_bgm"
          : directVal.startsWith("url:")
          ? "play_url"
          : "play_ambient",
      value: directVal,
      label: getAudioMoodLabel(directVal),
      isDirectBinding: true,
      boundBlockIndex: activeIndex,
    };
  }

  // 2. Look backwards for the most recent audio binding
  for (let i = activeIndex - 1; i >= 0; i--) {
    const val = bindings[`audio_${i}`];
    if (val) {
      return {
        action:
          val === "stop"
            ? "stop"
            : val === "scene_bgm"
            ? "play_scene_bgm"
            : val.startsWith("url:")
            ? "play_url"
            : "play_ambient",
        value: val,
        label: getAudioMoodLabel(val),
        isDirectBinding: false,
        boundBlockIndex: i,
      };
    }
  }

  // 3. Fallback: scene BGM if available
  if (sceneBgmUrl) {
    return {
      action: "play_scene_bgm",
      value: "scene_bgm",
      label: "เพลงประจำฉาก",
      isDirectBinding: false,
    };
  }

  return { action: "none", value: "", label: "", isDirectBinding: false };
}
