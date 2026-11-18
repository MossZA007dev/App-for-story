/** Immutable scene snapshots; typing can coalesce, structural edits stay separate. */
export class UndoTimeline<T> {
  private items:T[];
  private cursor=0;
  private group:string|undefined;
  private changedAt=0;
  constructor(initial:T,private equal:(a:T,b:T)=>boolean,private limit=60){this.items=[structuredClone(initial)];}
  get current(){return this.items[this.cursor];}
  get canUndo(){return this.cursor>0;}
  get canRedo(){return this.cursor<this.items.length-1;}
  record(value:T,group?:string,now=Date.now()){
    if(this.equal(value,this.current))return;
    const coalesce=Boolean(group && group===this.group && now-this.changedAt<600 && this.cursor>0 && !this.canRedo);
    this.items=this.items.slice(0,this.cursor+1);
    if(coalesce)this.items[this.cursor]=structuredClone(value);
    else {this.items.push(structuredClone(value));if(this.items.length>this.limit)this.items.shift();this.cursor=this.items.length-1;}
    this.group=group;this.changedAt=now;
  }
  undo():T|null{if(!this.canUndo)return null;this.group=undefined;return structuredClone(this.items[--this.cursor]);}
  redo():T|null{if(!this.canRedo)return null;this.group=undefined;return structuredClone(this.items[++this.cursor]);}
}
