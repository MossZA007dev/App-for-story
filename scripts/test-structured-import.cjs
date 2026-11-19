const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,...args);};
Module._extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {parseStoryStructure}=require('../src/lib/story/structuredImport.ts');
const source=fs.readFileSync(path.join(root,'scripts/fixtures/prisoner-and-promise.txt'),'utf8');
const draft=parseStoryStructure(source);
assert.equal(draft.parts.length,1);const p=draft.parts[0];assert.equal(p.number,3);assert.equal(p.title,'The Prisoner and the Promise');assert.equal(p.episodes.length,12);
const ep=p.episodes[0];assert.equal(ep.title,p.episodes[0].scenes[0].title);assert(ep.inferred);const allScenes=p.episodes.flatMap(e=>e.scenes);assert.equal(allScenes.length,12);assert.equal(ep.scenes[0].title,'ความเย็นที่กินความทรงจำ');assert.equal(allScenes[11].title,'ความกล้าหาญที่ไม่ต้องมีผู้ชม');assert.equal(ep.scenes[0].location,'Hogwarts Express — Compartment 7');assert(ep.summary.includes('ปี 1993'));
// Preserve every non-heading line, in order, across intro and scene bodies.
const expected=source.split(/\r?\n/).filter(l=>!/^ปีที่ 3:|^ฉากที่ \d+:/.test(l)).map(l=>l.trim()).filter(Boolean);
const actual=[ep.summary,...allScenes.map(s=>s.contentMarkdown)].join('\n').split('\n').map(l=>l.trim()).filter(Boolean);assert.deepEqual(actual,expected);
const multi=parseStoryStructure('## ภาคที่ ๑: First\n### EP 1: One\nฉาก 1: A\nMoss: Hello\nEP 2: Two\nฉาก 1: B\nEve: Hi\nภาค 2: Second\nฉาก 1: C\nปี 1993\nจบ');assert.equal(multi.parts.length,2);assert.equal(multi.parts[0].episodes.length,2);assert.equal(multi.parts[1].episodes[0].scenes[0].contentMarkdown,'ปี 1993\nจบ');
assert.equal(parseStoryStructure('บรรยายสั้น\nMoss: ข้อความ').parts[0].episodes[0].scenes.length,1);
assert.throws(()=>parseStoryStructure('x'.repeat(160001)));
const original=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'saga-structured-import-'));
(async()=>{try{process.chdir(temp);
const {createImportedStory}=require('../src/lib/story/createImportedStory.ts'),{db}=require('../src/lib/db/index.ts'),schema=require('../src/lib/db/schema.ts'),{eq}=require('drizzle-orm'),route=require('../src/app/api/projects/[id]/import-structure/route.ts');
const id=crypto.randomUUID();createImportedStory({requestId:id,sourceText:'Existing',draft:{title:'Test',universe:'HP',parts:[{title:'Existing',scenes:[{title:'Keep',contentMarkdown:'Original unchanged'}]}]}});
const old=db.select().from(schema.scenes).all();
const requestId=crypto.randomUUID(),params={params:Promise.resolve({id})},req=(structure=draft,key=requestId)=>new Request('http://localhost/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:key,structure})});
const response=await route.POST(req(),params);assert.equal(response.status,200);const result=await response.json();
assert.equal(db.select().from(schema.scenes).where(eq(schema.scenes.partId,result.partId)).all().length,12);
const createdEps=db.select().from(schema.episodes).where(eq(schema.episodes.partId,result.partId)).all();assert.equal(createdEps.length,12);for(const episode of createdEps){const assigned=db.select().from(schema.scenes).where(eq(schema.scenes.episodeId,episode.id)).all();assert.equal(assigned.length,1);assert.equal(assigned[0].title,episode.title);}
assert.equal(db.select().from(schema.sceneVersions).where(eq(schema.sceneVersions.sceneId,result.firstSceneId)).all().length,1);
assert.equal(db.select().from(schema.episodes).where(eq(schema.episodes.id,result.episodeId)).get().summary,ep.summary);
for(const scene of old)assert.deepEqual(db.select().from(schema.scenes).where(eq(schema.scenes.id,scene.id)).get(),scene);
const before=db.select().from(schema.scenes).all().length;assert.equal((await(await route.POST(req(),params)).json()).reused,true);assert.equal(db.select().from(schema.scenes).all().length,before);
const changed=structuredClone(draft);changed.parts[0].title='Changed';assert.equal((await route.POST(req(changed),params)).status,400);
assert.equal((await route.POST(req(),{params:Promise.resolve({id:'missing'})})).status,400);
const invalid=structuredClone(draft);invalid.parts[0].episodes[0].scenes[0].title='';assert.equal((await route.POST(req(invalid,crypto.randomUUID()),params)).status,400);assert.equal(db.select().from(schema.scenes).all().length,before);
// A second new import uses a free part number and creates complete episode ownership.
const another=await(await route.POST(req(multi,crypto.randomUUID()),params)).json();const createdPart=db.select().from(schema.parts).where(eq(schema.parts.id,another.partId)).get();assert.notEqual(createdPart.number,1);
console.log('PASS: real year-3 sample → 1 part / 12 inferred EPs / 12 scenes; all non-heading text preserved; Markdown, Thai digits, multiple EPs, prose years, fallback, limits, scene versions, existing manuscripts, retry safety and validation. Temporary database only.');
}finally{if(global.__sqlite_db){global.__sqlite_db.close();delete global.__sqlite_db;}process.chdir(original);fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
