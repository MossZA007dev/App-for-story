const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename,load=Module._load;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,...args);};
Module._extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
let calls=[],output={status:'completed',output_text:'Narrator: New scene draft.'},failure=null;
class APIError extends Error {constructor(status){super('private error');this.status=status;}}
class FakeOpenAI {static APIError=APIError;constructor(options){assert.equal(options.maxRetries,0);this.responses={create:async(body)=>{calls.push(body);if(failure)throw failure;return output;}};}}
Module._load=function(request,...args){return request==='openai'?FakeOpenAI:load.call(this,request,...args);};
const previous=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'saga-openai-test-'));
(async()=>{try{
 process.chdir(temp);
 const {NextRequest}=require('next/server');const request=body=>new NextRequest('http://localhost/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const api=require('../src/lib/ai/openaiStory.ts'),settings=require('../src/app/api/openai-story/settings/route.ts');
 assert.throws(()=>api.responseText({status:'incomplete',output_text:'cut off'}));assert.throws(()=>api.responseText({status:'completed',output_text:''}));
 await assert.rejects(api.runOpenAIStory('system','input','analyze'),api.StoryAssistantError);assert.equal(calls.length,0);
 assert.equal((await settings.POST(request({apiKey:'test-key-not-real-secret',model:'test-model'}))).status,200);
 const safe=await (await settings.GET()).json();assert.deepEqual(safe,{configured:true,model:'test-model'});assert(!JSON.stringify(safe).includes('secret'));
 assert.equal(fs.statSync(path.join(temp,'data/audio/.private/openai-story.json')).mode&0o777,0o600);
 const {createImportedStory}=require('../src/lib/story/createImportedStory.ts');
 const id=crypto.randomUUID();createImportedStory({requestId:id,sourceText:'original',draft:{title:'Test story',universe:'Test universe',characters:[{name:'Moss',gender:'male',background:'A cautious explorer'}],parts:[{title:'Part',scenes:[{title:'Test scene',contentMarkdown:'Moss: Original dialogue.'}]}]}});
 const {db}=require('../src/lib/db/index.ts'),schema=require('../src/lib/db/schema.ts'),{eq}=require('drizzle-orm');
 const part=db.select().from(schema.parts).where(eq(schema.parts.projectId,id)).get();const scene=db.select().from(schema.scenes).where(eq(schema.scenes.partId,part.id)).get();
 const route=require('../src/app/api/projects/[id]/scenes/[sceneId]/assistant/route.ts');const params={params:Promise.resolve({id,sceneId:scene.id})};
 assert.equal((await route.POST(request({action:'analyze',content:''}),params)).status,400);
 assert.equal((await route.POST(request({action:'analyze',content:'draft'}),{params:Promise.resolve({id:'wrong-project',sceneId:scene.id})})).status,404);
 assert.equal((await route.POST(request({action:'analyze',content:'draft',targetWords:9999}),params)).status,400);
 const analysis=await route.POST(request({action:'analyze',content:'Moss: Unsaved latest dialogue.'}),params);assert.equal(analysis.status,200);assert.equal(calls.length,1);assert(calls[0].input.includes('Unsaved latest dialogue'));assert((calls[0].instructions+calls[0].input).includes('Test universe'));assert.equal(calls[0].store,false);
 const generated=await route.POST(request({action:'generate',content:'Existing scene',direction:'A tense meeting',targetWords:500}),params);assert.equal(generated.status,200);assert.equal((await generated.json()).text,'Narrator: New scene draft.');assert(calls.at(-1).input.includes('A tense meeting'));
 assert.deepEqual(db.select().from(schema.scenes).where(eq(schema.scenes.id,scene.id)).get(),scene,'Analysis and generation must never write to the scene');
 output={status:'incomplete',output_text:'Partial story'};assert.equal((await route.POST(request({action:'generate',content:'Original'}),params)).status,400);
 output={status:'completed',output_text:''};assert.equal((await route.POST(request({action:'generate',content:'Original'}),params)).status,400);
 failure=new APIError(429);const error=await (await route.POST(request({action:'generate',content:'Original'}),params)).json();assert(!JSON.stringify(error).includes('private error'));assert(!JSON.stringify(error).includes('test-key'));
 console.log('PASS: private key storage, safe settings responses, scene ownership, current unsaved context, analysis and generation, no scene writes, incomplete/refused responses and sanitized API errors. No real OpenAI requests or credits used.');
}finally{if(global.__sqlite_db){global.__sqlite_db.close();delete global.__sqlite_db;}process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});Module._load=load;}})().catch(error=>{console.error(error);process.exitCode=1;});
