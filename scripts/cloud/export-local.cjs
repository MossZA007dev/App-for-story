const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),Database=require('better-sqlite3');
const root='/Users/moss/App-for-story',destination=path.resolve(process.argv[2]||'/private/tmp/saga-cloud-migration');
const tables=['projects','characters','abilities','parts','episodes','scenes','scene_versions','relationships','change_logs','continuity_ledgers','images','collaborators','sound_effects'];
(async()=>{fs.mkdirSync(destination,{recursive:true,mode:0o700});const source=new Database(path.join(root,'data/saga_forge.db'),{readonly:true});const snapshot=path.join(destination,'source.db');if(fs.existsSync(snapshot))throw new Error('Snapshot exists: choose a new export directory');await source.backup(snapshot);source.close();const db=new Database(snapshot,{readonly:true});const data={};for(const table of tables)data[table]=db.prepare(`SELECT * FROM ${table}`).all();db.close();
const assets=new Map(),narrations=[];
function scan(value){if(typeof value==='string'){
 for(const m of value.matchAll(/(?:\/api\/(images|audio)\/|(?:data\/(images|audio)\/))([^\s"'<>?#\\]+)|(?:\/images\/)([^\s"'<>?#\\]+)/g)){
  const kind=m[1]||m[2]||'images',raw=m[3]||m[4];let filename;try{filename=decodeURIComponent(raw);}catch{continue;}if(path.basename(filename)!==filename||filename.startsWith('.'))continue;
  const sourcePath=m[4]?path.join(root,'public/images',filename):path.join(root,'data',kind,filename);if(fs.existsSync(sourcePath)&&fs.statSync(sourcePath).isFile())assets.set(kind+'/'+filename,{kind,filename,sourcePath,bytes:fs.statSync(sourcePath).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')});
 }
 try{if(value.startsWith('{')||value.startsWith('['))scan(JSON.parse(value));}catch{}
}else if(Array.isArray(value))value.forEach(scan);else if(value&&typeof value==='object')Object.values(value).forEach(scan);}
scan(data);
const partProject=new Map(data.parts.map(p=>[p.id,p.project_id]));for(const scene of data.scenes){const projectId=partProject.get(scene.part_id),key=crypto.createHash('sha256').update(projectId+':'+scene.id).digest('hex'),file=path.join(root,'data/audio/.private/scenes',key+'.json');if(fs.existsSync(file)){const manifest=JSON.parse(fs.readFileSync(file,'utf8'));narrations.push({projectId,sceneId:scene.id,manifest});scan(manifest);}}
const result={format:'saga-cloud-v1',createdAt:new Date().toISOString(),data,assets:[...assets.values()],narrations};fs.writeFileSync(path.join(destination,'export.json'),JSON.stringify(result),{mode:0o600});console.log(JSON.stringify({exportDirectory:destination,counts:Object.fromEntries(tables.map(t=>[t,data[t].length])),assets:assets.size,bytes:[...assets.values()].reduce((n,a)=>n+a.bytes,0),narrations:narrations.length,sourceUnchanged:true}));
})().catch(()=>{console.error('Export failed; source unchanged.');process.exitCode=1;});
