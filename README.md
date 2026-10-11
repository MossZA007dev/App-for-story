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
