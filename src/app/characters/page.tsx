"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Users, Search, Edit3, Trash2, ArrowUpRight, Globe2, UserRound, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { CharacterHouseBanner } from "@/components/characters/CharacterHouseBanner";
import { CreateCharacterModal } from "@/components/characters/CreateCharacterModal";

type CharacterType = "self" | "friend" | "canon";
interface CharacterItem {
  id: string;
  projectId: string;
  name: string;
  realNickname?: string;
  characterType: CharacterType;
  projectTitle?: string;
  projectUniverse?: string;
  startMbti?: string;
  currentMbti?: string;
  gender?: string;
  faction?: string;
  chosenRole?: string;
  background?: string;
  avatarUrl?: string;
}
interface ProjectItem { id: string; title: string; universe: string; }
const typeLabels: Record<CharacterType, string> = { self: "ตัวฉันเอง", friend: "เพื่อน", canon: "ตัวละครต้นฉบับ" };

export default function CharactersDashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [universe, setUniverse] = useState("");
  const [projectId, setProjectId] = useState("");
  const [kind, setKind] = useState<"squad" | "canon">("squad");
  const [personType, setPersonType] = useState("");
  const [faction, setFaction] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CharacterType>("self");
  const [editing, setEditing] = useState<CharacterItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectRes, characterRes] = await Promise.all([fetch("/api/projects"), fetch("/api/characters?includeCanon=true")]);
      if (!projectRes.ok || !characterRes.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
      const [projectData, characterData] = await Promise.all([projectRes.json(), characterRes.json()]);
      setProjects(projectData);
      setCharacters(characterData.characters.filter((c: CharacterItem) => ["self", "friend", "canon"].includes(c.characterType)));
    } catch (err) { setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    setProjectId(new URLSearchParams(window.location.search).get("project") || "");
    void load();
  }, [load]);

  const universes = Array.from(new Set(projects.map(p => p.universe))).sort((a,b) => a.localeCompare(b, "th"));
  const availableProjects = projects.filter(p => !universe || p.universe === universe);
  const scoped = characters.filter(c => (!universe || c.projectUniverse === universe) && (!projectId || c.projectId === projectId));
  const squadCount = scoped.filter(c => c.characterType !== "canon").length;
  const canonCount = scoped.filter(c => c.characterType === "canon").length;
  const inTab = scoped.filter(c => kind === "canon" ? c.characterType === "canon" : c.characterType !== "canon");
  const factions = Array.from(new Set(inTab.map(c => c.faction).filter((value): value is string => Boolean(value)))).sort();
  const query = search.trim().toLocaleLowerCase();
  const filtered = inTab.filter(c => (!personType || c.characterType === personType) && (!faction || c.faction === faction) && (!query || [c.name, c.realNickname, c.faction, c.chosenRole, c.projectTitle, c.projectUniverse].some(v => v?.toLocaleLowerCase().includes(query))));
  const groups = projects.map(p => ({ project: p, items: filtered.filter(c => c.projectId === p.id).sort((a,b) => Number(b.characterType === "self") - Number(a.characterType === "self")) })).filter(g => g.items.length);
  const selectedProject = projects.find(p => p.id === projectId);
  const reset = () => { setUniverse(""); setProjectId(""); setPersonType(""); setFaction(""); setSearch(""); };
  const create = (type: CharacterType) => { setEditing(null); setModalType(type); setModalOpen(true); };
  const remove = async (c: CharacterItem) => {
    if (!confirm(`ลบ "${c.name}" จากเรื่อง "${c.projectTitle}" ถาวร? ตัวละครเวอร์ชันในเรื่องอื่นจะยังอยู่`)) return;
    try {
      const res = await fetch(`/api/projects/${c.projectId}/characters/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบตัวละครไม่สำเร็จ");
      setCharacters(prev => prev.filter(item => item.id !== c.id));
      toast.success("ลบตัวละครจากเรื่องนี้แล้ว");
    } catch (err) { toast.error(err instanceof Error ? err.message : "ลบตัวละครไม่สำเร็จ"); }
  };

  return (
    <div className="character-hub workspace-page">
      <header className="workspace-heading">
        <div><p className="workspace-eyebrow">คุณและเพื่อน ในทุกโลกที่อยากไป</p><h1>ตัวละครและจักรวาล</h1><p>จัดบทบาทของแต่ละคนในแต่ละเรื่อง และรวมตัวละครต้นฉบับไว้ในจักรวาลของเขา</p></div>
        <Link href="/projects/new" className="workspace-secondary"><Plus size={17} /> เริ่มเรื่องในจักรวาลใหม่</Link>
      </header>
      <section className="world-context" aria-label="เลือกจักรวาลและเรื่อง">
        <div className="world-context-title"><Globe2 size={22} /><div><h2>กำลังดู {selectedProject ? selectedProject.title : universe || "ทุกจักรวาล"}</h2><p>{selectedProject ? selectedProject.universe : "หนึ่งคนมีบทบาทต่างกันได้ในแต่ละเรื่อง"}</p></div></div>
        <div className="world-selectors">
          <label>จักรวาล<select value={universe} onChange={e => {setUniverse(e.target.value); setProjectId(""); setFaction("");}}><option value="">ทุกจักรวาล</option>{universes.map(u => <option key={u}>{u}</option>)}</select></label>
          <label>เรื่องที่แต่ง<select value={projectId} onChange={e => {setProjectId(e.target.value); setFaction("");}}><option value="">ทุกเรื่อง</option>{availableProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        </div>
      </section>
      <div className="hub-tab-row">
        <div className="hub-tabs" role="group" aria-label="ประเภทตัวละคร">
          <button aria-pressed={kind === "squad"} onClick={() => {setKind("squad"); setPersonType(""); setFaction("");}}><Users size={18} /> ฉันและเพื่อน <span>{squadCount}</span></button>
          <button aria-pressed={kind === "canon"} onClick={() => {setKind("canon"); setPersonType(""); setFaction("");}}><Clapperboard size={18} /> ตัวละครต้นฉบับ <span>{canonCount}</span></button>
        </div>
        <button className="reader-primary" onClick={() => create(kind === "canon" ? "canon" : "friend")} disabled={loading || projects.length === 0}><Plus size={17} /> เพิ่ม{kind === "canon" ? "ตัวละครต้นฉบับ" : "ตัวละคร"}</button>
      </div>
      <div className="hub-explanation"><p>{kind === "squad" ? "แต่ละการ์ดคือเวอร์ชันของคุณหรือเพื่อนในเรื่องนั้น ชื่อ บทบาท และฝ่ายจึงต่างกันได้ เมื่อต้องการใช้ในเรื่องใหม่ เลือก “นำเข้าตัวละคร” ในขั้นตอนสร้างเรื่อง" : "ตัวละครจากหนัง ซีรีส์ หนังสือ หรือโลกต้นฉบับ แยกตามเรื่องที่นำมาใช้ ฝ่ายและสังกัดมาจากข้อมูลที่คุณกรอก"}</p></div>
      <section className="hub-toolbar" aria-label="ค้นหาและกรองตัวละคร">
        <label className="library-search"><Search size={18} /><span className="sr-only">ค้นหาตัวละคร</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ บทบาท เรื่อง หรือจักรวาล…" /></label>
        {kind === "squad" && <label className="hub-select"><span className="sr-only">กรองฉันหรือเพื่อน</span><select value={personType} onChange={e => setPersonType(e.target.value)}><option value="">ฉันและเพื่อนทั้งหมด</option><option value="self">ตัวฉันเอง</option><option value="friend">เพื่อน</option></select></label>}
        <label className="hub-select"><span className="sr-only">กรองฝ่ายหรือสังกัด</span><select value={faction} onChange={e => setFaction(e.target.value)}><option value="">ทุกฝ่าย / สังกัด</option>{factions.map(f => <option key={f}>{f}</option>)}</select></label>
        <span className="hub-result-count" aria-live="polite">{filtered.length} เวอร์ชันตัวละคร</span>
      </section>
      {error ? <div className="library-empty" role="alert"><h2>โหลดตัวละครไม่สำเร็จ</h2><p>{error}</p><button onClick={load} className="reader-primary">ลองอีกครั้ง</button></div> : loading ? <div className="character-grid" aria-busy="true" aria-label="กำลังโหลดตัวละคร">{[1,2,3].map(i => <div key={i} className="h-96 bg-card rounded-xl animate-pulse" />)}</div> : filtered.length === 0 ? <div className="library-empty"><Users size={36} className="mx-auto text-amber-300" /><h2>{projects.length ? "ยังไม่มีตัวละครที่ตรงกับมุมมองนี้" : "เริ่มจากเลือกโลกของเรื่องราว"}</h2><p>{projects.length ? "ลองเปลี่ยนตัวกรอง หรือเพิ่มตัวละครลงในเรื่องที่ต้องการ" : "สร้างเรื่องในจักรวาลที่คุณชอบ แล้วพาคุณและเพื่อนเข้าไปอยู่ในนั้น"}</p>{projects.length ? <button className="workspace-secondary" onClick={reset}>ดูทุกจักรวาลและล้างตัวกรอง</button> : <Link className="reader-primary" href="/projects/new">สร้างเรื่องแรก</Link>}</div> : groups.map(({project, items}) => (
        <section key={project.id} className="character-story-group">
          <header><div><p className="workspace-eyebrow">{project.universe}</p><h2>{project.title} <span>{items.length} ตัวละคร</span></h2></div><Link href={`/projects/${project.id}/characters`} className="workspace-text-link">จัดการในเรื่อง <ArrowUpRight size={16} /></Link></header>
          <div className="character-grid">{items.map(c => <article className="character-card" key={c.id}>
            <div className="character-portrait">{c.avatarUrl ? <img src={c.avatarUrl} alt={c.name} loading="lazy" onError={e => {e.currentTarget.style.display = "none";}} /> : <UserRound size={68} strokeWidth={1} className="portrait-placeholder" />}<span className={`character-kind character-kind-${c.characterType}`}>{typeLabels[c.characterType]}</span><CharacterHouseBanner universe={project.universe} faction={c.faction} characterName={c.name} /></div>
            <div className="character-details"><p className="character-nickname">{c.realNickname && c.realNickname !== c.name ? c.realNickname : typeLabels[c.characterType]}</p><h3>{c.name}</h3><p className="character-role">{c.chosenRole || "ยังไม่ได้กำหนดบทบาท"}</p><dl><div><dt>ฝ่าย / สังกัด</dt><dd>{c.faction || "ยังไม่ระบุ"}</dd></div><div><dt>บุคลิกภาพ</dt><dd>{c.currentMbti || c.startMbti || "ยังไม่ระบุ"}</dd></div></dl>{c.background && <p className="character-background">{c.background}</p>}<div className="character-actions"><button className="workspace-secondary" onClick={() => {setEditing(c); setModalType(c.characterType); setModalOpen(true);}}><Edit3 size={16} /> แก้ไขเวอร์ชันนี้</button><button className="character-delete" aria-label={`ลบ ${c.name} จาก ${project.title}`} onClick={() => remove(c)}><Trash2 size={17} /></button></div></div>
          </article>)}</div>
        </section>
      ))}
      <aside className="hub-next-step"><BookOpen size={25} /><div><h2>แก๊งเดิม เรื่องราวใหม่</h2><p>สร้างเรื่องใหม่ เลือกจักรวาล แล้วนำเข้าคุณและเพื่อนจากเรื่องเดิมเพื่อปรับบทบาทใหม่</p></div><Link href="/projects/new" className="workspace-secondary">สร้างเรื่องใหม่ <ArrowUpRight size={16} /></Link></aside>
      <CreateCharacterModal isOpen={modalOpen} onClose={() => setModalOpen(false)} initialType={modalType} initialProjectId={projectId || undefined} editCharacter={editing} onSuccess={load} />
    </div>
  );
}
