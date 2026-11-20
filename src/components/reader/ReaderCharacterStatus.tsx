"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ChevronRight,
  RefreshCw,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { RelationshipGraph } from "./RelationshipGraph";
import type {
  ReaderStatusEnvelope,
} from "@/lib/story/readerStatus";
type Evidence = { sceneId: string; block: number; quote: string };
type Props = {
  projectId: string;
  sceneId: string;
  index: number;
  sceneTitles: Record<string, string>;
};
export function ReaderCharacterStatus(p: Props) {
  const [data, setData] = useState<ReaderStatusEnvelope | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"overview" | "abilities" | "relationships">(
      "overview",
    ),
    [selected, setSelected] = useState("");
  const key = `${p.projectId}:${p.sceneId}:${p.index}`;
  const alive = useRef(true), flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    fetch(
      `/api/projects/${p.projectId}/reader-status?sceneId=${encodeURIComponent(p.sceneId)}&index=${p.index}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "เปิดสรุปไม่สำเร็จ");
        return body;
      })
      .then((body) => {
        if (!controller.signal.aborted) setData(body);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [key]);
  const analyze = async () => {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/projects/${p.projectId}/reader-status`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sceneId:p.sceneId,index:p.index})});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "วิเคราะห์ไม่สำเร็จ");
      if (alive.current) setData(body);
    } catch(e) {if (alive.current) setError(e instanceof Error?e.message:"วิเคราะห์ไม่สำเร็จ");}
    finally {flight.current=false;if(alive.current)setBusy(false);}
  };
  const summary = data?.summary,
    characters = summary?.characters || [],
    person = characters.find((c) => c.name === selected) || characters[0];
  const evidence = (items: Evidence[]) =>
    items.length ? (
      <details className="ir-status-evidence">
        <summary>
          ดูหลักฐานจากบท <span>{items.length}</span>
        </summary>
        {items.map((e, i) => (
          <blockquote key={i}>
            <p>“{e.quote}”</p>
            <cite>
              {p.sceneTitles[e.sceneId] || "ฉากก่อนหน้า"} · บท {e.block}
            </cite>
          </blockquote>
        ))}
      </details>
    ) : null;
  const avatar = (name: string) =>
    data?.roster.find((c) => c.name === name)?.avatarUrl;
  return (
    <section className="ir-character-status" aria-label="สรุปตัวละคร ณ จุดที่อ่าน">
      <div className="ir-status-checkpoint">
        <Shield size={16} />
        <div>
          <strong>สรุปถึงจุดที่คุณอ่าน</strong>
          <p>
            {data?.checkpoint.sceneTitle ||
              p.sceneTitles[p.sceneId] ||
              "ฉากปัจจุบัน"}{" "}
            · บท {p.index + 1}
          </p>
        </div>
      </div>
      <p className="ir-status-scope">
        ใช้เฉพาะเหตุการณ์ถึงบทนี้ ไม่ใช้ข้อมูลอนาคตหรือความรู้จากต้นฉบับนอกเรื่องที่แต่ง
      </p>
      <div className="ir-status-generate">
        {data?.mode === "ai" ? <p>✓ วิเคราะห์ด้วย AI ฟรีแล้ว{data.cached ? " · เปิดผลที่บันทึกไว้" : ""}</p> : <>
          <p className="ir-status-free-badge">AI ฟรี · ไม่ใช้เครดิต OpenAI</p>
          <p>ให้ AI อ่านเหตุการณ์เพื่อสรุปพัฒนาการ พลัง และสายสัมพันธ์ พร้อมหลักฐาน</p>
          <button type="button" disabled={busy || loading || !data?.configured} onClick={analyze}>
            {busy ? <RefreshCw className="ir-status-spin" size={16}/> : <Zap size={16}/>}
            {busy ? "กำลังวิเคราะห์ด้วย AI ฟรี…" : "วิเคราะห์ด้วย AI ฟรี"}
          </button>
          <p>เมื่อกด จะส่งบทถึงจุดอ่านไปยัง OpenRouter และผู้ให้บริการโมเดลฟรี มีโควตาจำกัด · ไม่สลับไปโมเดลเสียเงิน</p>
          {data && !data.configured && <a href="/settings#reader-ai" className="ir-status-connect">เชื่อม OpenRouter ฟรีในหน้าตั้งค่า →</a>}
        </>}
        {data && <p>อ้างอิง {data.coverage.scenes} ฉาก / {data.coverage.blocks} บท ถึงจุดที่อ่าน</p>}
      </div>
      {loading && (
        <p className="ir-status-loading" role="status">
          <RefreshCw size={15} />
          กำลังรวบรวมข้อมูลจากบท…
        </p>
      )}
      {data?.coverage.partial && (
        <p className="ir-status-warning">
          เนื้อเรื่องยาว: ผลนี้อ้างอิง {data.coverage.scenes} ฉากล่าสุดถึงจุดที่อ่านเท่านั้น
          ไม่ใช่การจัดอันดับทั้งจักรวาล
        </p>
      )}
      {error && (
        <div className="ir-status-error" role="alert">
          {error}
        </div>
      )}
      {summary ? (
        <>
          <div
            className="ir-status-tabs"
            role="group"
            aria-label="หัวข้อสถานะตัวละคร"
          >
            <button
              aria-pressed={tab === "overview"}
              onClick={() => setTab("overview")}
            >
              <Activity size={14} />
              ภาพรวม
            </button>
            <button
              aria-pressed={tab === "abilities"}
              onClick={() => setTab("abilities")}
            >
              <Zap size={14} />
              พลังและทักษะ
            </button>
            <button
              aria-pressed={tab === "relationships"}
              onClick={() => setTab("relationships")}
            >
              <Users size={14} />
              สายสัมพันธ์
            </button>
          </div>
          {tab === "overview" ? (
            <>
              <div className="ir-status-comparison">
                <span className="ir-status-eyebrow">
                  ใครโดดเด่นด้านความสามารถ
                </span>
                <h3>
                  {summary.comparison.verdict === "insufficient"
                    ? (data.mode === "ai" ? "ยังเปรียบเทียบไม่ได้" : "ข้อมูลเบื้องต้นจากข้อความ")
                    : summary.comparison.leaders.join(" · ")}
                </h3>
                <p>{summary.comparison.reason}</p>
                {summary.comparison.verdict === "tentative" && (
                  <small>ประเมินจากเหตุการณ์ที่มี ไม่ใช่อันดับพลังตายตัว</small>
                )}
                {evidence(summary.comparison.evidence)}
              </div>
              <p className="ir-status-overview">{summary.overview}</p>
              <div className="ir-status-cast">
                {characters.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setSelected(c.name);
                      setTab("abilities");
                    }}
                  >
                    {avatar(c.name) ? (
                      <img src={avatar(c.name)!} alt="" />
                    ) : (
                      <span className="ir-status-avatar">
                        {c.name.slice(0, 1)}
                      </span>
                    )}
                    <div>
                      <strong>{c.name}</strong>
                      <p>{c.summary}</p>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
              {!characters.length && (
                <p className="ir-status-empty">
                  ยังไม่มีเหตุการณ์ที่ยืนยันสถานะตัวละครในช่วงนี้
                </p>
              )}
            </>
          ) : tab === "relationships" ? (
            <RelationshipGraph summary={summary} roster={data.roster} evidence={evidence} />
          ) : (
            <>
              <label className="ir-status-select">
                ตัวละคร
                <select
                  aria-label="เลือกตัวละครเพื่อดูสถานะ"
                  value={person?.name || ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {characters.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              {person && (
                <>
                  <div className="ir-status-person">
                    <strong>{person.name}</strong>
                    <p>{person.summary}</p>
                    {evidence(person.evidence)}
                  </div>
                  {person.abilities.length ? (
                      person.abilities.map((a, i) => (
                        <article className="ir-status-fact" key={i}>
                          <div>
                            <h3>{a.name}</h3>
                            <span>
                              {a.state === "used"
                                ? "แสดงให้เห็นแล้ว"
                                : a.state === "learning"
                                  ? "กำลังเรียนรู้"
                                  : "พบในข้อความ · ยังไม่ยืนยันว่าใช้ได้"}
                            </span>
                          </div>
                          <p>{a.detail}</p>
                          {evidence(a.evidence)}
                        </article>
                      ))
                    ) : (
                      <p className="ir-status-empty">
                        ยังตรวจไม่พบข้อความเกี่ยวกับพลังหรือทักษะของตัวละครนี้
                        ไม่ได้แปลว่าไม่มีความสามารถ
                      </p>
                    )
                  }
                </>
              )}
            </>
          )}
          <p className="ir-status-footnote">
            {data.mode === "ai" ? "ผลวิเคราะห์จาก AI ฟรี อาจตีความคลาดเคลื่อน อ่านหลักฐานประกอบเสมอ" : "ข้อมูลเบื้องต้นจากการค้นหาคำ ยังไม่ได้วิเคราะห์ด้วย AI จึงอาจเก็บรายละเอียดไม่ครบ"}
          </p>
        </>
      ) : (
        !loading && (
          <div className="ir-status-start">
            <Activity size={28} />
            <h3>ตัวละครเป็นอย่างไร ณ ตอนนี้?</h3>
            <p>
              สรุปคนที่โดดเด่น พลังหรือทักษะที่ใช้ได้ และความสัมพันธ์ จากเนื้อเรื่องที่อ่านผ่านมาแล้ว
              รองรับทุกจักรวาล
            </p>
          </div>
        )
      )}
    </section>
  );
}
