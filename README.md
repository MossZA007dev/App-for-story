# Saga Forge ⚔️📜

**Saga Forge** คือเว็บแอปพลิเคชันสำหรับเขียนนิยายแนวดาร์กดราม่าแบบหลายภาค (AU / Fan Fiction Multi-Part Engine) พร้อมระบบ AI ช่วยสร้างเนื้อเรื่องทีละฉาก ควบคุมความต่อเนื่องของเรื่อง (Continuity Engine) และสร้างภาพประกอบเชิงภาพยนตร์ที่รักษารูปลักษณ์ตัวละครอย่างสม่ำเสมอ

---

## 🌟 ฟีเจอร์หลัก (Key Features)

- **AI Diversity Role Engine**: ระบบเสนอ 3 บทบาทที่ลึกซึ้งและแตกต่างกันต่อตัวละครตาม Diversity Rules พร้อมปมขัดแย้งในใจและพลังพิเศษที่มีราคาต้องจ่าย
- **Character Bible & Psychological Drift**: ติดตามพัฒนาการทางจิตวิทยาของตัวละคร (MBTI Drift) และ Visual Sheet เพื่อใช้สร้างภาพประกอบ AI
- **Multi-Part & Arc Structure**: จัดการโครงสร้างนิยายแบบหลายภาค (0-9) พร้อมบันทึกจุดพีคและสรุปแต่ละภาค
- **Story Continuity Engine**: บันทึกสถานะข้อเท็จจริงล่าสุด (ใครบาดเจ็บ, ใครตาย, ใครถือความลับอะไร, ใครอยู่ที่ไหน) ป้องกัน AI ลืมหรือแต่งฉากขัดแย้งกับอดีต
- **Pluggable Image Studio**: รองรับ OpenAI (DALL-E 3), Replicate (Flux), Stability AI พร้อมโหมด Mock สำหรับทดสอบโดยไม่เสียเครดิต
- **Local-First & Privacy**: เก็บข้อมูลในเครื่องด้วย SQLite (Drizzle ORM) พร้อมระบบกักเก็บรูปภาพใน Local Storage (`/data/images`)
- **Cinematic Dark UI**: ธีมมืดสไตล์ภาพยนตร์ ออกแบบพิเศษเพื่อประสบการณ์การอ่านและเขียน พร้อมรองรับฟอนต์ไทย (Sarabun)

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons + Sonner Toasts
- **Database**: SQLite ผ่าน Drizzle ORM (`better-sqlite3`)
- **AI Text Engine**: Anthropic Claude 3.5 Sonnet / Haiku
- **AI Image Engine**: OpenAI DALL-E 3 / Replicate / Stability Adapter
- **Image Storage**: Local Storage Adapter (`/data/images`)

---

## 🚀 วิธีติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables (ทางเลือก)
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
กำหนดค่า API Key:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
IMAGE_API_KEY=your_openai_or_image_key_here
IMAGE_PROVIDER=openai
```
*(หรือจะไปกรอกผ่านหน้าจอเว็บ `/settings` ภายหลังได้เช่นกัน)*

### 3. ใส่ข้อมูลตัวอย่าง (Seed Demo Data)
```bash
npm run db:seed
```

### 4. รัน Development Server
```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
├── data/                      # ที่เก็บไฟล์ฐานข้อมูล SQLite และโฟลเดอร์ภาพ /data/images
├── src/
│   ├── app/                   # Next.js App Router (Pages & API Routes)
│   │   ├── api/               # Server-side API endpoints (Claude, Settings, Projects)
│   │   ├── projects/          # หน้ารายละเอียดโปรเจกต์, Character Bible, Wizard
│   │   └── settings/          # หน้าตั้งค่าระบบ & API Keys
│   ├── components/            # UI Components (Navbar, ProjectHeader, Cards)
│   ├── lib/
│   │   ├── ai/                # Anthropic Claude Client & Image Provider Adapters
│   │   ├── db/                # Drizzle ORM Schema & SQLite connection
│   │   ├── storage/           # Local Storage Adapter
│   │   └── templates/         # Story Rules Master Templates
│   └── scripts/               # Scripts (Database Seed)
└── package.json
```

---

## 📝 License
MIT License

## นำเข้าเรื่องจากข้อความ AI

ใน `/projects/new` เลือก **วางข้อความจาก ChatGPT / AI** แล้ววางตารางตัวละครหรือข้อความทั้งชุด กดแยกข้อมูล ตรวจชื่อเรื่อง จักรวาล ประเภทตัวละคร และเนื้อหาก่อนกดสร้าง ระบบสร้างเรื่อง ตัวละคร ภาค ตอน และฉากในครั้งเดียว และเก็บต้นฉบับในบันทึกโลก

- ตาราง Markdown, ตารางที่คัดลอกจากเว็บ, TSV และ JSON แยกในเครื่องได้โดยไม่ใช้ API Key
- ข้อความอิสระที่ซับซ้อนใช้ **ใช้ AI ช่วยแยก** ได้ โดยใช้ Claude/Gemini ตามการตั้งค่าและอาจมีค่าบริการ
- ถ้าชื่อเรื่องหรือจักรวาลไม่ชัด ระบบจะเว้นว่างให้ตรวจ ไม่สร้างค่าแทน
- ความสามารถที่จะพัฒนาถูกเก็บเป็นแนวทาง ไม่เพิ่มเป็นพลังปัจจุบัน
- ข้อความสูงสุด 80,000 ตัวอักษร, 100 ตัวละคร, 30 ภาค, 200 ฉากต่อครั้ง
- การสร้างอยู่ใน transaction; การส่งคำขอเดิมซ้ำไม่สร้างข้อมูลซ้ำ

API: `POST /api/projects/import/preview` (`text`, `useAI`) และ `POST /api/projects/import/create` (`requestId`, `sourceText`, `draft`)

ทดสอบด้วย Node 22: `node scripts/test-story-import.cjs` การทดสอบฐานข้อมูลใช้โฟลเดอร์ชั่วคราวและไม่แตะฐานข้อมูลจริง

การแยกเนื้อหารักษาข้อความแต่ละฉากจากต้นฉบับโดยตรง แม้ใช้ AI ช่วยแยกข้อมูลประกอบ ตารางบุคลิกสิ้นปีไม่ทับบุคลิกเริ่มต้น สถานที่แยกเป็นข้อมูลฉาก บันทึกสิ้นปีเก็บในบันทึกภาค (เปิดแก้ไขภาคเพื่ออ่าน/แก้ได้) และภาคถัดไปที่ยังเป็นแผนจะมีสถานะ planned โดยไม่สร้างฉากสมมติ ผู้พูดเพิ่มเติมจะปรากฏในตัวอย่างให้ตรวจประเภทก่อนสร้าง

ชุดทดสอบ `scripts/fixtures/price-of-power.md` ตรวจครบ 8 ฉากแบบเทียบข้อความทุกตัวอักษร รวมการเก็บบันทึกและโครงปีถัดไปในฐานข้อมูลชั่วคราว

## Read aloud

The reader includes device speech with play, pause/resume, stop, voice selection and 0.75-1.5x speed. It starts from the selected paragraph, highlights each paragraph and ends at the end of the current scene. Sound-effect blocks are skipped. Changing scenes, leaving the page or editing the source stops speech. Resume restarts the current short chunk and may repeat a few words.

Music is reduced to 20% of its previous level while speaking and restored on pause/end. No AI API key is needed. Thai voice availability and quality depend on the device; some OS/browser voices require internet. Install a Thai system voice if none is available.

Run speech lifecycle tests with Node 22: `node scripts/test-read-aloud.cjs`.

## ElevenLabs preview and cached narration

In Settings, save an ElevenLabs API key (Text to Speech, Voices, Models and User permissions), or set `ELEVENLABS_API_KEY`. The saved key lives in `data/audio/.private/elevenlabs.json` with mode 0600, under the ignored audio folder. It is not returned to the browser or served by the audio endpoint. Back up that private file separately if needed.

In the reader, select ElevenLabs and expand the narration panel. Choose a stock voice, edit a short sample (up to 300 characters), then prepare the plan to see quota and missing segments. Confirm generation separately. Switch to whole-scene mode after listening to a sample. Existing segments are reused by a hash of text, voice and model; editing one paragraph invalidates only its audio. Reopen the plan after refresh to recover cached audio.

Generation supports the Free and Starter subscription tiers and available stock voices. The backend checks current quota before each missing segment; it does not enable overage, upgrade subscriptions or buy credits. API errors or interruption preserve previously generated files; retries reuse these files. Requests already accepted by the provider may consume credits even if the browser closes or stops. Native audio controls provide pause, seek and playback rate; each clip highlights its source paragraph and ducks music during playback. Preview text has no paragraph mapping.

Model: `eleven_v3` with Thai language code, MP3 44.1 kHz/128 kbps. Model availability, Thai support and the credit multiplier are checked against the provider models endpoint. API reference: https://elevenlabs.io/docs/api-reference/text-to-speech/convert and https://elevenlabs.io/docs/api-reference/user/subscription/get

Test with Node 22: `node scripts/test-elevenlabs.cjs`. It uses a temporary database and mocked provider responses, never real API credentials or credits. Real voice quality and account eligibility require a configured account and a user-confirmed sample generation.

## Scene voice casting and attachments

The narration panel now defaults to whole-scene mode. The server identifies the narrator and actual dialogue speakers from the scene. Default male/female voices are selected using ElevenLabs gender labels; character genders come from stored character records. Unknown gender uses narrator voice until the author chooses a voice explicitly. Speaker overrides can select the default male, default female, narrator, or a specific stock voice. Narrator defaults to Brian when available, male dialogue to George, and female dialogue to Sarah.

Generation plans include each segment's resolved voice. Hashes include voice, model and text, so recasting one speaker regenerates only that speaker's uncached segments. Complete scene generation automatically attaches the playlist to the scene. Existing cached playlists and short samples can also be attached explicitly. Attached audio, casting and source fingerprints live under `data/audio/.private/scenes/` and load automatically on reopening the scene. Nothing is stored in background-music bindings, preserving existing music and SFX. Partial generation never replaces the previous scene attachment.

Source or character changes mark attached audio as an older version; it remains playable without highlighting the wrong paragraph. Replanning reuses unchanged audio. The source fingerprint is rechecked before generating or attaching, even when only character metadata changed. API: GET/POST `/api/projects/:id/scenes/:sceneId/narration`, actions `plan`, `generate`, `attach`.

`node scripts/test-elevenlabs.cjs` also checks male/female/unknown casting, character overrides, automatic-ready attachment primitives, preview attachment, refresh restoration, per-speaker invalidation and source/character conflicts with a mocked provider.

## OpenAI scene assistant

Settings contains a separate OpenAI API key and model field (default `gpt-5.4-mini`). `OPENAI_API_KEY` and `OPENAI_STORY_MODEL` can also be configured server-side. Saved credentials are private, ignored files under `data/audio/.private/openai-story.json`, mode 0600, and are never returned to the browser. This key is independent of image-provider keys and a ChatGPT subscription.

In the writing room, expand the OpenAI assistant. Analyze the current unsaved manuscript for dialogue voice, emotional pacing and continuity, or provide a direction and generate a full scene draft. The existing story-context assembler supplies universe, rules, characters, ledger and preceding scenes. OpenAI Responses API requests use `store:false`, bounded output tokens and no automatic retries. Analysis and generation are read-only: neither endpoint modifies the scene. The author reviews/edits the draft and explicitly applies it through the existing manuscript import flow. Changed manuscript/title/location blocks applying an outdated draft. Switching scenes aborts the UI request.

Test with Node 22: `node scripts/test-openai-story.cjs`. Tests mock the SDK and use an isolated SQLite database; they cover private settings, ownership, unsaved source context, both actions, incomplete/refused output, sanitized errors and no scene writes. Live model access requires a configured OpenAI account and credits and was not exercised automatically.

Official implementation reference: https://developers.openai.com/api/reference/resources/responses/methods/create

## Manuscript Undo/Redo and recovery

The manuscript toolbar supports Undo/Redo with Ctrl+Z or Cmd+Z, Ctrl+Shift+Z or Cmd+Shift+Z, and Ctrl+Y. It retains up to 60 local snapshots per active scene, coalesces short typing bursts and restores manuscript blocks, title/location, director notes and media bindings together. Undo restores are eligible for the existing autosave. Switching scenes or receiving a conflicting remote revision starts a new history boundary. Inputs in dialogs and AI prompts retain their native text undo. Reloading clears local undo; use the saved-version dialog for older persisted content.

The history dialog previews saved versions before explicit restoration. Scene saves preserve the initial baseline as well as subsequent revisions. AI continuation now decodes SSE events, accepts text only, requires a completion marker, and rejects error or truncated responses without changing the manuscript. Continuations append to existing content; successful regeneration is one undoable action. Local edits or navigation while AI is running block applying the delayed response.

Test with Node 22: `node scripts/test-editor-undo.cjs`. Coverage includes typing groups, redo branches, immutable/bounded snapshots, stream chunks and failure handling, first-version preservation and safe recovery using isolated SQLite and mocked AI.


### One-click scene images with OpenAI

In the writer, open “ปรับภาพและสร้างด้วย AI” → “สร้างภาพด้วย AI”. The new dialog uses the current manuscript, including unsaved edits, to analyze the scene and generate a cinematic image. No prompt is required; 16:9 is selected by default. Optional controls allow direction, aspect ratio, and manual character selection.

The server uses the existing private OpenAI configuration for text analysis and `gpt-image-2` for images (`OPENAI_SCENE_IMAGE_MODEL` overrides the image model). Relevant local character photos are sent directly as references when enabled. Credentials remain server-side. Successful images are attached to the scene without replacing or reloading the manuscript. Failed analysis, provider errors, and duplicate requests do not create image records.

Validation: `scripts/test-scene-image.cjs` uses mocked OpenAI responses and temporary storage; it does not spend API credits. The new dialog was checked in the browser. Live image generation has not been exercised as part of this change.


### Paste a complete part into an existing project

The writer’s “นำเข้าบท” dialog previews an editable Part → EP → Scene hierarchy from plain text or Markdown. It recognizes Thai/English numbered headings and Thai numerals, preserves all scene text and locations, and keeps introductory text in the EP summary. When EP headings are absent, it creates one EP named after the part. Missing scene names use a short content excerpt; the parser does not invent plot-based titles or require an AI API.

Imports create new parts without replacing existing manuscripts. Occupied part numbers use the next available number. Existing characters are reused by name/nickname, dialogue speakers can be added, initial scene versions are recorded, and all records commit in a single transaction. Stable request IDs prevent duplicate writes on retries. The writer saves pending changes before importing and navigates to the first new scene.

Validation: `node scripts/test-structured-import.cjs` (Node 22). The year-three fixture produces one part, one inferred EP, and all 12 scenes with every non-heading line preserved. Database tests use temporary storage.
