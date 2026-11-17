/* Run with Node 22: node scripts/test-story-import.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const Module=require('node:module');
const crypto=require('node:crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return originalResolve.call(this,request.startsWith('@/') ? path.join(root,'src',request.slice(2)):request,...args);};
Module._extensions['.ts']=function(module,filename){
 const source=fs.readFileSync(filename,'utf8');
 module._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
};
const {parseStoryImport,mergeStoryImportMetadata,StoryImportDraftSchema,MAX_IMPORT_TEXT}=require('../src/lib/story/storyImport.ts');
const source=`ชื่อเรื่อง: The Hunger Beneath the Lion
จักรวาล: Harry Potter
ธีม: มิตรภาพและความทะเยอทะยาน

| ตัวละคร | House | บุคลิกเริ่มต้น | ความสามารถที่จะพัฒนา |
|---|---|---|---|
| Moss | Gryffindor | ENTJ | Combat Transfiguration |
| Eve | Slytherin | INFP-H | Occlumency |
| Gam | Slytherin | ENFP-T | Potions |
| Tam | Gryffindor | INFP-H | Defensive Dueling |
| Arm | Hufflepuff | ISTP-T | Herbology / Toxicology |
| Pleng | Ravenclaw | ENTJ-T | Divination |

Moss เป็น Muggle-born ที่ต้องการพิสูจน์ตัวเอง

Eve เป็น Pure-blood ที่ถูกสอนให้ปิดบังความจริง ส่วน Gam เป็น Muggle-born ที่ถูกคัดเข้าบ้าน Slytherin

Tam เป็น Pure-blood ผู้เกลียดความรุนแรง Arm เป็น Half-blood ที่รู้จักพืชพิษ ขณะที่ Pleng เป็น Muggle-born ที่อยากเข้าใจอนาคต

## ปีที่ 1: The Hunger Beneath the Lion
1991–1992 | ความหิวโหยใต้หัวใจสิงโต

### ฉากที่ 1: จดหมาย
Moss: จดหมายนี้เป็นของฉัน
Eve: เราจะได้พบกันที่โรงเรียน

### ฉากที่ 2: สถานี
รถไฟออกจากสถานี

## ปีที่ 2: โลกอีกใบ
เนื้อหาปีถัดไป`;
const {draft}=parseStoryImport(source);
assert.equal(draft.title,'The Hunger Beneath the Lion');
assert.equal(draft.universe,'Harry Potter');
assert.equal(draft.characters.length,6);
assert.equal(draft.characters[0].faction,'Gryffindor');
assert.equal(draft.characters[1].startMbti,'INFP-H');
assert.match(draft.characters[0].chosenRole,/แนวทางพัฒนา: Combat/);
assert.match(draft.characters[2].background,/Gam เป็น Muggle-born/);
assert.match(draft.characters[4].background,/Half-blood/);
assert.equal(draft.parts.length,2);
assert(draft.parts[0].scenes.some(s=>s.contentMarkdown.includes('จดหมายนี้เป็นของฉัน')));
assert(draft.parts[1].scenes.some(s=>s.contentMarkdown.includes('เนื้อหาปีถัดไป')));
const tsv='ตัวละคร\tบ้าน\tMBTI\nMoss\tGryffindor\tENTJ\nEve\tSlytherin\tINFP-H';
assert.equal(parseStoryImport(tsv).draft.characters.length,2);
assert.equal(parseStoryImport(tsv).draft.title,'');
assert.equal(parseStoryImport(tsv).draft.universe,'Harry Potter');
const blocks=parseStoryImport('ชื่อเรื่อง: โลกใหม่\nจักรวาล: Original\nตัวละคร: A+B\nสังกัด: นักสำรวจ\nบุคลิก: ENTP\n\nA+B เป็นนักเดินทาง');
assert.equal(blocks.draft.characters[0].name,'A+B');
assert.match(blocks.draft.characters[0].background,/นักเดินทาง/);
const repeated=parseStoryImport(tsv+'\n\n'+tsv);
assert.equal(repeated.draft.characters.length,2);
assert.equal(parseStoryImport('```json\n'+JSON.stringify(draft)+'\n```').draft.characters.length,6);
assert.throws(()=>parseStoryImport('x'.repeat(MAX_IMPORT_TEXT+1)));
assert.throws(()=>parseStoryImport('   '));
assert.equal(StoryImportDraftSchema.safeParse({...draft,characters:Array.from({length:101},()=>draft.characters[0])}).success,false);
console.log('PASS: Markdown, TSV, JSON, prose backgrounds, future skills, duplicate rows, limits.');

const fullSource=fs.readFileSync(path.join(__dirname,'fixtures/price-of-power.md'),'utf8');
const full=parseStoryImport(fullSource).draft;
assert.equal(full.title,'Harry Potter AU: THE PRICE OF POWER');
assert.equal(full.universe,'Harry Potter');
assert.equal(full.timelineScope,'1991–1992');
assert.match(full.theme,/Psychological Drama/);
assert.equal(full.parts.length,2);
assert.equal(full.parts[0].scenes.length,8);
assert.equal(full.parts[1].status,'planned');
assert.equal(full.parts[1].scenes.length,0);
assert.match(full.parts[1].notes,/หนึ่งในหกคน/);
assert.match(full.parts[0].notes,/ความซื่อตรงในมิตรภาพ/);
assert.match(full.parts[0].notes,/1991–1992/);
assert.equal(full.characters.length,10);
const initial=[['Moss','Gryffindor','ENTJ'],['Eve','Slytherin','INFP-H'],['Gam','Slytherin','ENFP-T'],['Tam','Gryffindor','INFP-H'],['Arm','Hufflepuff','ISTP-T'],['Pleng','Ravenclaw','ENTJ-T']];
for(const [name,house,mbti] of initial){const c=full.characters.find(c=>c.name===name);assert.equal(c.faction,house);assert.equal(c.startMbti,mbti);assert.equal(c.characterType,'friend');}
assert.deepEqual(full.characters.filter(c=>c.characterType==='canon').map(c=>c.name).sort(),['Albus Dumbledore','Draco Malfoy','Professor McGonagall','Sorting Hat'].sort());
const headings=[...fullSource.matchAll(/^### ฉากที่ .*$/gm)];
const appendix=fullSource.indexOf('### บันทึกการเปลี่ยนแปลง');
for(let i=0;i<8;i++){
 const expected=fullSource.slice(headings[i].index+headings[i][0].length,i<7 ? headings[i+1].index:appendix).trim();
 assert.equal(full.parts[0].scenes[i].contentMarkdown,expected,`scene ${i+1} must preserve every source character`);
 assert.match(full.parts[0].scenes[i].location,/Hogwarts/);
}
assert(!JSON.stringify(full.parts).includes('ต่อภาคถัดไปได้เลย'));
const enriched=mergeStoryImportMetadata(fullSource,{title:'wrong',characters:[{name:'Moss',startMbti:'ENTJ ที่เปลี่ยนไป'},{name:'Invented Person'}],parts:[{title:'truncated',scenes:[]}]}).draft;
assert.deepEqual(enriched.parts,full.parts);
assert.equal(enriched.characters.find(c=>c.name==='Moss').startMbti,'ENTJ');
assert(!enriched.characters.some(c=>c.name==='Invented Person'));
console.log('PASS: full user source, all 8 verbatim scenes, 6 initial profiles, 4 canon speakers, locations, end-year notes, planned sequel, AI truncation protection.');

// Import the actual database modules only after changing into an isolated temp folder.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'saga-import-test-'));
const previousCwd=process.cwd();
try {
 process.chdir(temp);
 const {db}=require('../src/lib/db/index.ts');
 const {projects,characters,parts,scenes,episodes}=require('../src/lib/db/schema.ts');
 const {eq}=require('drizzle-orm');
 const {createImportedStory,CreateStoryImportSchema}=require('../src/lib/story/createImportedStory.ts');
 const request={requestId:crypto.randomUUID(),draft,sourceText:source};
 assert.equal(CreateStoryImportSchema.safeParse({...request,draft:{...draft,title:''}}).success,false);
 createImportedStory(request);
 assert.equal(db.select().from(characters).where(eq(characters.projectId,request.requestId)).all().length,6);
 assert.equal(db.select().from(parts).where(eq(parts.projectId,request.requestId)).all().length,2);
 assert.equal(db.select().from(episodes).where(eq(episodes.projectId,request.requestId)).all().length,2);
 const stored=db.select().from(projects).where(eq(projects.id,request.requestId)).get();
 assert(stored.worldNotes.includes(source));
 const importedParts=db.select().from(parts).where(eq(parts.projectId,request.requestId)).all();
 const storedScenes=importedParts.flatMap(part=>db.select().from(scenes).where(eq(scenes.partId,part.id)).all());
 assert.equal(storedScenes.length,draft.parts.reduce((n,p)=>n+p.scenes.length,0));
 assert(storedScenes.some(scene=>scene.contentMarkdown.includes('จดหมายนี้เป็นของฉัน')));
 assert(storedScenes.every(scene=>scene.charactersPresent==='[]'));
 assert.equal(db.select().from(characters).where(eq(characters.projectId,request.requestId)).all().find(c=>c.name==='Eve').startMbti,'INFP-H');

 assert.equal(createImportedStory(request).reused,true);
 assert.throws(()=>createImportedStory({...request,draft:{...draft,characters:[]}}));
 assert.equal(db.select().from(characters).where(eq(characters.projectId,request.requestId)).all().length,6);
 const fullRequest={requestId:crypto.randomUUID(),draft:full,sourceText:fullSource};
 createImportedStory(fullRequest);
 const fullParts=db.select().from(parts).where(eq(parts.projectId,fullRequest.requestId)).all().sort((a,b)=>a.number-b.number);
 assert.match(fullParts[0].characterChangeSummary,/ความซื่อตรงในมิตรภาพ/);
 assert.equal(fullParts[1].status,'planned');
 const fullScenes=db.select().from(scenes).where(eq(scenes.partId,fullParts[0].id)).all().sort((a,b)=>a.order-b.order);
 assert.equal(fullScenes.length,8);
 fullScenes.forEach((scene,i)=>{assert.equal(scene.contentMarkdown,full.parts[0].scenes[i].contentMarkdown);assert.equal(scene.location,full.parts[0].scenes[i].location);});
 assert(db.select().from(projects).where(eq(projects.id,fullRequest.requestId)).get().worldNotes.includes(fullSource.trim()));
 // A mid-import database failure must roll back the project, cast and parts together.
 global.__sqlite_db.exec("CREATE TRIGGER fail_test_scene BEFORE INSERT ON scenes WHEN NEW.title='rollback-test' BEGIN SELECT RAISE(ABORT, 'test'); END;");
 const rollbackId=crypto.randomUUID();
 assert.throws(()=>createImportedStory({requestId:rollbackId,sourceText:source,draft:{...draft,parts:[{title:'test',scope:'',scenes:[{title:'rollback-test',location:'',contentMarkdown:'test'}]}]}}));
 assert.equal(db.select().from(projects).where(eq(projects.id,rollbackId)).get(),undefined);
 assert.equal(db.select().from(characters).where(eq(characters.projectId,rollbackId)).all().length,0);
 assert.equal(db.select().from(parts).where(eq(parts.projectId,rollbackId)).all().length,0);
 console.log('PASS: isolated SQLite creation, cast/parts/episodes, source preservation, retry deduplication, atomic rollback.');
} finally {
 if (global.__sqlite_db) {global.__sqlite_db.close();delete global.__sqlite_db;}
 process.chdir(previousCwd);
 fs.rmSync(temp,{recursive:true,force:true});
}
