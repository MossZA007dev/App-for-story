"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Users,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Bot,
  AlertCircle,
  HelpCircle,
  Scroll,
} from "lucide-react";
import { DEFAULT_STORY_RULES } from "@/lib/templates/defaultStoryRules";
import { toast } from "sonner";

interface CharacterForm {
  id: string;
  characterType: "self" | "friend";
  realNickname: string;
  name: string;
  gender: string;
  startMbti: string;
  faction: string;
  roleWishOrForbidden: string;
  background: string;
  // AI proposed roles state
  isProposingRoles: boolean;
  proposedRoles: Array<{
    roleTitle: string;
    roleConcept: string;
    narrativeFunction: string;
    innerConflict: string;
    suggestedAbility: {
      name: string;
      origin: string;
      cost: string;
    };
    visualPromptTrait: string;
  }>;
  aiRecommendedIndex: number;
  recommendationReason: string;
  chosenRoleIndex: number | null;
  chosenRoleCustom: string;
  chosenAbility: {
    name: string;
    origin: string;
    cost: string;
  };
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Project Information
  const [title, setTitle] = useState("");
  const [universe, setUniverse] = useState("Game of Thrones");
  const [timelineScope, setTimelineScope] = useState("Season 2 AU (ช่วงสงครามห้ากษัตริย์)");
  const [theme, setTheme] = useState("ความเสื่อมทรามของอำนาจ การทรยศ และการเอาชีวิตรอดในเงามืด");
  const [worldNotes, setWorldNotes] = useState(
    "จุดหักเหจาก Canon: Ned Stark ไม่ได้ถูกประหารชีวิต แต่ถูกขังและหลบหนีไปตั้งหลักที่ Dragonstone"
  );
  const [storyRules, setStoryRules] = useState(DEFAULT_STORY_RULES);
  const [styleGuide, setStyleGuide] = useState(
    "dark fantasy cinematic painting, muted palette, dramatic lighting, film still, highly detailed"
  );
  const [showRulesEditor, setShowRulesEditor] = useState(false);

  // Step 2: Characters (You & Your Squad)
  const [charactersList, setCharactersList] = useState<CharacterForm[]>([
    {
      id: "char-1",
      characterType: "self",
      realNickname: "มอส",
      name: "Lord Moss of House Blackwood",
      gender: "ชาย",
      startMbti: "INTJ",
      faction: "อิสระ / พันธมิตรลับของฝ่ายเหนือ",
      roleWishOrForbidden: "ต้องการเป็นผู้วางแผนเอาชีวิตรอดและผู้ถือความลับโบราณ ห้ามตายง่ายหรือเป็นหมากไร้ประโยชน์",
      background: "ตัวฉันเองที่หลุดเข้ามาในโลกนี้พร้อมความทรงจำเดิม และต้องหาทางรอดในสงคราม",
      isProposingRoles: false,
      proposedRoles: [],
      aiRecommendedIndex: 0,
      recommendationReason: "",
      chosenRoleIndex: null,
      chosenRoleCustom: "",
      chosenAbility: { name: "", origin: "", cost: "" },
    },
    {
      id: "char-2",
      characterType: "friend",
      realNickname: "นนท์",
      name: "Sir Nont the Ironbound",
      gender: "ชาย",
      startMbti: "ISTP",
      faction: "Night's Watch / อัศวินเร่ร่อน",
      roleWishOrForbidden: "ต้องการเป็นยอดนักดาบที่สู้เก่งแต่มีปมบาดแผลในใจ ห้ามทรยศเพื่อน",
      background: "เพื่อนสนิทที่หลุดมิติมาด้วยกัน ถูกพลัดพรากไปอยู่แถบชายแดน",
      isProposingRoles: false,
      proposedRoles: [],
      aiRecommendedIndex: 0,
      recommendationReason: "",
      chosenRoleIndex: null,
      chosenRoleCustom: "",
      chosenAbility: { name: "", origin: "", cost: "" },
    },
  ]);

  const addCharacter = () => {
    const newId = `char-${Date.now()}`;
    const friendNum = charactersList.length;
    setCharactersList((prev) => [
      ...prev,
      {
        id: newId,
        characterType: "friend",
        realNickname: `เพื่อนคนที่ ${friendNum}`,
        name: "",
        gender: "ชาย",
        startMbti: "ENTP",
        faction: "ตามสถานการณ์",
        roleWishOrForbidden: "อยากให้มีบทบาทเด่นในแก๊ง",
        background: "เพื่อนในแก๊งที่หลุดเข้ามาในโลกนี้ด้วยกัน",
        isProposingRoles: false,
        proposedRoles: [],
        aiRecommendedIndex: 0,
        recommendationReason: "",
        chosenRoleIndex: null,
        chosenRoleCustom: "",
        chosenAbility: { name: "", origin: "", cost: "" },
      },
    ]);
  };

  const removeCharacter = (id: string) => {
    if (charactersList.length <= 1) {
      toast.error("ต้องมีตัวละครอย่างน้อย 1 ตัว");
      return;
    }
    setCharactersList((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCharacter = (id: string, updates: Partial<CharacterForm>) => {
    setCharactersList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // AI Propose Roles for a single character
  const handleProposeRoles = async (charId: string) => {
    const char = charactersList.find((c) => c.id === charId);
    if (!char) return;

    const effectiveName = char.name.trim() || char.realNickname.trim();
    if (!effectiveName) {
      toast.error("กรุณาระบุชื่อเล่นหรือชื่อตัวละครก่อนให้ AI เสนอบทบาท");
      return;
    }

    try {
      updateCharacter(charId, { isProposingRoles: true });
      const res = await fetch("/api/ai/propose-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universe,
          theme,
          timelineScope,
          worldNotes,
          character: {
            name: effectiveName,
            characterType: char.characterType,
            realNickname: char.realNickname,
            gender: char.gender,
            startMbti: char.startMbti,
            roleWishOrForbidden: char.roleWishOrForbidden,
            faction: char.faction,
            background: char.background,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการเรียก AI");

      const { roles, aiSelectionRecommendationIndex, recommendationReason } = data.data;

      updateCharacter(charId, {
        name: char.name.trim() || effectiveName,
        proposedRoles: roles,
        aiRecommendedIndex: aiSelectionRecommendationIndex,
        recommendationReason,
        chosenRoleIndex: aiSelectionRecommendationIndex, // Auto-select recommended by default
        chosenRoleCustom: roles[aiSelectionRecommendationIndex].roleTitle,
        chosenAbility: roles[aiSelectionRecommendationIndex].suggestedAbility,
      });

      toast.success(`AI ได้เสนอ 3 บทบาทสำหรับ ${effectiveName} เรียบร้อยแล้ว`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เรียก AI ล้มเหลว";
      toast.error(msg);
    } finally {
      updateCharacter(charId, { isProposingRoles: false });
    }
  };

  const handleSelectRole = (charId: string, roleIndex: number) => {
    const char = charactersList.find((c) => c.id === charId);
    if (!char || !char.proposedRoles[roleIndex]) return;

    const selectedRole = char.proposedRoles[roleIndex];
    updateCharacter(charId, {
      chosenRoleIndex: roleIndex,
      chosenRoleCustom: selectedRole.roleTitle,
      chosenAbility: selectedRole.suggestedAbility,
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("กรุณาระบุชื่อเรื่องของโปรเจกต์");
      setStep(1);
      return;
    }

    if (charactersList.some((c) => !c.name.trim() && !c.realNickname.trim())) {
      toast.error("กรุณาระบุชื่อหรือชื่อเล่นของสมาชิกในแก๊งให้ครบทุกตัว");
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);

      const formattedCharacters = charactersList.map((c) => {
        let visualTrait = "";
        let roleReason = "";
        if (c.chosenRoleIndex !== null && c.proposedRoles[c.chosenRoleIndex]) {
          visualTrait = c.proposedRoles[c.chosenRoleIndex].visualPromptTrait;
          roleReason = c.proposedRoles[c.chosenRoleIndex].narrativeFunction;
        }

        const resolvedName = c.name.trim() || c.realNickname.trim() || "ตัวละครในแก๊ง";

        return {
          name: resolvedName,
          characterType: c.characterType || "friend",
          realNickname: c.realNickname || "",
          gender: c.gender,
          startMbti: c.startMbti,
          currentMbti: c.startMbti,
          roleOptions: JSON.stringify(c.proposedRoles),
          chosenRole: c.chosenRoleCustom || "สมาชิกแก๊งผู้ข้ามมิติ",
          roleReason: roleReason || c.recommendationReason || "",
          faction: c.faction,
          background: c.background,
          visualSheet: {
            age: "วัยหนุ่มสาว",
            build: "สมส่วน",
            hair_eyes: "ผมสีเข้ม ดวงตาเด็ดเดี่ยว",
            facial_traits: visualTrait || "แววตากร้าว มีเสน่ห์แบบมืดมน",
            clothing: "ชุดผ้าและเกราะตามสังกัด",
            scars_marks: "ไม่มีในตอนเริ่มเรื่อง",
          },
          ability: c.chosenAbility.name
            ? {
                name: c.chosenAbility.name,
                origin: c.chosenAbility.origin,
                cost: c.chosenAbility.cost,
              }
            : undefined,
        };
      });

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          universe,
          timelineScope,
          theme,
          worldNotes,
          storyRules,
          styleGuide,
          targetSceneWords: 1200,
          characters: formattedCharacters,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างโปรเจกต์ไม่สำเร็จ");

      toast.success("สร้างโปรเจกต์มหากาพย์เรียบร้อยแล้ว!");
      router.push(`/projects/${data.projectId}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างโปรเจกต์";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Wizard Step Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
            <span>PROJECT SETUP WIZARD</span>
          </h1>
          <p className="text-xs text-slate-400 font-thai">
            ขั้นตอนการสร้างโลก นิยามกฎของเรื่อง และออกแบบตัวละครด้วย AI Diversity Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-thai transition-colors ${
              step === 1
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. ข้อมูลเรื่อง & กฎหลัก</span>
          </button>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-thai transition-colors ${
              step === 2
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. ตัวละคร & AI Role Proposal</span>
          </button>
        </div>
      </div>

      {/* STEP 1: Main Project Details & Story Rules */}
      {step === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="cinematic-card rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
              <Scroll className="w-5 h-5 text-amber-400" />
              <span>MAIN PROJECT INPUT</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  ชื่อโปรเจกต์ / ชื่อนิมิตเรื่อง <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น บัลลังก์เลือดแห่งเงามังกร (Game of Thrones AU)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  จักรวาลตั้งต้น (Universe) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น Game of Thrones, Harry Potter, Cyberpunk, หรือ Original"
                  value={universe}
                  onChange={(e) => setUniverse(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  ขอบเขตไทม์ไลน์ (Timeline Scope)
                </label>
                <input
                  type="text"
                  placeholder="เช่น Season 2-4 AU, หลังศึก Blackwater"
                  value={timelineScope}
                  onChange={(e) => setTimelineScope(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-thai">
                  ธีมหลัก (Theme & Atmosphere)
                </label>
                <input
                  type="text"
                  placeholder="เช่น Dark Fantasy, การทรยศหักหลัง, ชะตากรรมที่ต้องแลก"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 font-thai">
                จุดหักเหจาก Canon & บันทึกโลก (World Notes & Deviations)
              </label>
              <textarea
                rows={3}
                placeholder="ระบุจุดที่เรื่องนี้ต่างจากเรื่องเดิม เช่น Ned Stark รอดชีวิต, Robb แต่งงานกับสาว Frey..."
                value={worldNotes}
                onChange={(e) => setWorldNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 font-thai">
                Style Guide ภาพวาดประกอบ (Visual Style Guide)
              </label>
              <input
                type="text"
                placeholder="dark fantasy cinematic painting, muted palette, dramatic lighting, film still"
                value={styleGuide}
                onChange={(e) => setStyleGuide(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Story Rules Accordion */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-300 font-thai">
                    กฎหลักการเขียนของเรื่อง (Story Rules Template - ชั้น 1)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Diversity, MBTI Evolution, Show Don&apos;t Tell, Ability Rules
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRulesEditor(!showRulesEditor)}
                  className="text-xs text-amber-400 hover:underline font-thai"
                >
                  {showRulesEditor ? "ซ่อนตัวแก้ไขกฎ" : "ดู/ปรับแต่งกฎของเรื่อง"}
                </button>
              </div>

              {showRulesEditor && (
                <div className="mt-3">
                  <textarea
                    rows={10}
                    value={storyRules}
                    onChange={(e) => setStoryRules(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * กฎนี้จะถูกส่งไปยัง AI ทุกครั้งในการเขียนฉากและควบคุมการเปลี่ยน MBTI
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!title.trim()) {
                  toast.error("กรุณาระบุชื่อเรื่องก่อนไปขั้นตอนถัดไป");
                  return;
                }
                setStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors font-thai"
            >
              <span>ต่อไป: กำหนดตัวละคร & AI Role Proposal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Character Brief & AI Propose Roles */}
      {step === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
                <Users className="w-5 h-5 text-amber-400" />
                <span>YOU & YOUR SQUAD CASTING (แก๊งของเราที่จะข้ามมิติไป)</span>
              </h2>
              <p className="text-xs text-slate-400 font-thai">
                กรอกตัวละครของคุณและเพื่อนๆ เพื่อให้ AI แปลงบุคลิกเป็นบทบาทในจักรวาล {universe}
              </p>
            </div>

            <button
              onClick={addCharacter}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors font-thai whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มเพื่อนในแก๊งอีกคน</span>
            </button>
          </div>

          {/* Canon Characters Explanatory Banner */}
          <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
              ⚔️
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                ตัวละครดั้งเดิมในจักรวาล {universe} (CANON CHARACTERS)
              </h4>
              <p className="text-xs text-slate-300 font-thai leading-relaxed">
                ตัวละครต้นฉบับในเรื่อง <span className="text-white font-semibold">{universe}</span> (เช่น Jon Snow, Daenerys Targaryen, Tyrion Lannister, Cersei, Arya...) <strong className="text-amber-400 font-semibold">ไม่ต้องกรอกในหน้านี้ครับ!</strong> AI จะดึงตัวละครต้นฉบับในจักรวาลมาร่วมดำเนินเรื่อง เป็นมิตร/ศัตรู และมีบทสนทนากับแก๊งของคุณโดยอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Character Cards list */}
          <div className="space-y-6">
            {charactersList.map((char, index) => (
              <div
                key={char.id}
                className="cinematic-card rounded-xl p-6 border-slate-800 space-y-5 relative"
              >
                {/* Character Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xs font-bold font-mono">
                      {index + 1}
                    </span>

                    {/* Self vs Friend Toggle */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateCharacter(char.id, { characterType: "self" })}
                        className={`px-2 py-0.5 rounded text-[11px] font-thai font-semibold transition-all ${
                          char.characterType === "self"
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        👑 ตัวฉันเอง (Me)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCharacter(char.id, { characterType: "friend" })}
                        className={`px-2 py-0.5 rounded text-[11px] font-thai font-semibold transition-all ${
                          char.characterType === "friend"
                            ? "bg-sky-600 text-white font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        🧑‍🤝‍🧑 เพื่อนในแก๊ง (Friend)
                      </button>
                    </div>

                    <h3 className="font-bold text-white text-base font-heading">
                      {char.realNickname ? `${char.realNickname}` : `สมาชิกคนที่ ${index + 1}`}
                      {char.name && (
                        <span className="text-xs font-normal text-slate-400 font-thai ml-2">
                          ({char.name})
                        </span>
                      )}
                    </h3>

                    {char.chosenRoleCustom && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        บทบาท: {char.chosenRoleCustom}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => removeCharacter(char.id)}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-800/80 transition-colors"
                    title="ลบสมาชิกนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Character Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-thai">
                      ชื่อเล่นจริงในชีวิตจริง <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น มอส, นนท์, ก้อย, บาส"
                      value={char.realNickname}
                      onChange={(e) => updateCharacter(char.id, { realNickname: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-thai">
                      ชื่อ/ฉายาในจักรวาล {universe}
                    </label>
                    <input
                      type="text"
                      placeholder={`เช่น Lord ${char.realNickname || "Moss"} of Blackwood (เว้นว่างได้)`}
                      value={char.name}
                      onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-thai">เพศ</label>
                    <select
                      value={char.gender}
                      onChange={(e) => updateCharacter(char.id, { gender: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                    >
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                      <option value="ไม่ระบุ">ไม่ระบุ / อื่นๆ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-thai">
                      MBTI ตั้งต้น
                    </label>
                    <select
                      value={char.startMbti}
                      onChange={(e) => updateCharacter(char.id, { startMbti: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      {[
                        "INTJ",
                        "INTP",
                        "ENTJ",
                        "ENTP",
                        "INFJ",
                        "INFP",
                        "ENFJ",
                        "ENFP",
                        "ISTJ",
                        "ISFJ",
                        "ESTJ",
                        "ESFJ",
                        "ISTP",
                        "ISFP",
                        "ESTP",
                        "ESFP",
                      ].map((mbti) => (
                        <option key={mbti} value={mbti}>
                          {mbti}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-thai">
                      ฝ่าย / ตระกูลที่อยากสังกัดใน {universe}
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น House Stark, Night's Watch, กลุ่มอิสระ"
                      value={char.faction}
                      onChange={(e) => updateCharacter(char.id, { faction: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 font-thai">
                      บทบาทที่อยากได้ / ห้ามเป็น (Role Wish or Forbidden)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น อยากเป็นจอมวางแผนที่เอาตัวรอดเก่ง ห้ามตายไว, อยากมีพลังที่แลกด้วยสายตา"
                      value={char.roleWishOrForbidden}
                      onChange={(e) =>
                        updateCharacter(char.id, { roleWishOrForbidden: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-thai">
                    ปูมหลังย่อ / สภาพตอนหลุดเข้ามาในโลกนี้ (Background Brief)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น หลุดเข้ามาพร้อมความทรงจำในโลกปัจจุบัน ตื่นขึ้นมาริมชายหาด..."
                    value={char.background}
                    onChange={(e) => updateCharacter(char.id, { background: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-thai"
                  />
                </div>

                {/* AI Propose Roles Trigger Button */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-thai text-slate-300">
                      {char.proposedRoles.length > 0
                        ? `AI เสนอแล้ว 3 บทบาท (เลือก: ${char.chosenRoleCustom || "ยังไม่ได้เลือก"})`
                        : "ยังไม่ได้ให้ AI เสนอบทบาท"}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={char.isProposingRoles}
                    onClick={() => handleProposeRoles(char.id)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-all font-thai disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {char.isProposingRoles
                        ? "AI กำลังคิดบทบาท 3 แบบ..."
                        : "✨ ให้ AI เสนอ 3 บทบาท (Diversity Rules)"}
                    </span>
                  </button>
                </div>

                {/* Display 3 Proposed Roles from AI */}
                {char.proposedRoles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400 font-thai flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ตัวเลือกบทบาททั้ง 3 แบบ (คลิกที่การ์ดเพื่อเลือกบทบาทนี้):</span>
                      </span>

                      {char.recommendationReason && (
                        <span className="text-[11px] text-slate-400 italic">
                          คำแนะนำจาก AI: {char.recommendationReason}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {char.proposedRoles.map((role, rIndex) => {
                        const isSelected = char.chosenRoleIndex === rIndex;
                        const isAiRecommended = char.aiRecommendedIndex === rIndex;

                        return (
                          <div
                            key={rIndex}
                            onClick={() => handleSelectRole(char.id, rIndex)}
                            className={`cursor-pointer rounded-lg p-3.5 border transition-all text-left flex flex-col justify-between ${
                              isSelected
                                ? "bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-400"
                                : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="font-bold text-sm text-white font-heading">
                                  {role.roleTitle}
                                </h4>
                                {isAiRecommended && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/80 whitespace-nowrap">
                                    AI แนะนำ
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-300 font-thai line-clamp-3">
                                {role.roleConcept}
                              </p>

                              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                                <p className="text-slate-400">
                                  <span className="text-amber-400/80 font-semibold">หน้าที่:</span>{" "}
                                  {role.narrativeFunction}
                                </p>
                                <p className="text-slate-400">
                                  <span className="text-red-400/80 font-semibold">ปมในใจ:</span>{" "}
                                  {role.innerConflict}
                                </p>
                                <p className="text-slate-400">
                                  <span className="text-emerald-400/80 font-semibold">พลัง:</span>{" "}
                                  {role.suggestedAbility.name} (ราคา:{" "}
                                  {role.suggestedAbility.cost})
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 font-thai">
                                {isSelected ? "✓ บทบาทที่เลือก" : "คลิกเพื่อเลือก"}
                              </span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-amber-400 bg-amber-400 text-slate-950"
                                    : "border-slate-600"
                                }`}
                              >
                                {isSelected && <span className="text-[10px] font-bold">✓</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-thai"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ย้อนกลับไปแก้ไขข้อมูลเรื่อง</span>
            </button>

            <button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition-all font-thai shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSubmitting ? "กำลังสร้างมหากาพย์และบันทึก..." : "เสร็จสิ้น: สร้างโปรเจกต์ Saga Forge"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
