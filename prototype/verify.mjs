import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { validateResearch } from './verify-research.mjs';

// Exercise data and the actual routing functions without third-party dependencies.
const listeners=new Map(),entries=[{url:'http://localhost:4317/',state:null}];let pointer=0;
const location=new URL(entries[0].url);
const element={innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},querySelector(){return null},querySelectorAll(){return []},insertAdjacentHTML(){},setAttribute(){},focus(){}};
const document={title:'',body:{style:{}},documentElement:{dataset:{prototype:'true'}},querySelector:s=>s==='#app'||s==='#switcher'||s==='#app main'?element:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}};
const navigate=(url)=>{const u=new URL(url,location.href);location.href=u.href};
const history={get state(){return entries[pointer].state},replaceState(state,_,url){entries[pointer]={state,url:new URL(url,location.href).href};navigate(url)},pushState(state,_,url){entries.splice(pointer+1);entries.push({state,url:new URL(url,location.href).href});pointer++;navigate(url)}};
const context={window:{scrollY:0,scrollTo(x,y){this.scrollY=y},addEventListener(n,f){listeners.set(n,f)}},document,history,location,URL,URLSearchParams,console,clearInterval,setInterval,clearTimeout,setTimeout,requestAnimationFrame:f=>f(),innerWidth:1440};
vm.createContext(context);
for(const file of ['app.js','marin-data.js','marin-research.js','integration.js','review.js','lessons.js','reading.js'])vm.runInContext(fs.readFileSync(new URL(file,import.meta.url),'utf8'),context,{filename:file});
const evaluate=s=>vm.runInContext(s,context);
const a=evaluate('archive');
const research=JSON.parse(JSON.stringify(context.window.MARIN_RESEARCH));
validateResearch(research);
assert.equal(a.chapters.length,38);assert.ok(a.updates.length>=83);assert.ok(a.sources.length>=115);
assert.equal(new Set(a.chapters.map(c=>c.number)).size,38);
assert.ok(Object.keys(a.references).length>=131);
for(const s of Object.values(a.references))assert.match(s.url,/^https:\/\//);
for(const e of a.updates){assert.ok(e.sourceIds.length);for(const id of e.sourceIds)assert.ok(a.references[id],id)}
for(const c of a.chapters){
 assert.ok(c.html.length>0);
 for(const [,id] of c.html.matchAll(/\[([MPOF]\d+)\]/g))assert.ok(a.references[id],id);
 assert.doesNotMatch(c.html,/href="undefined"|src="marin_tutorial_assets/);
}
assert.equal(evaluate('new Set(courses.flatMap(c=>c.chapters)).size'),38);
assert.equal(evaluate('events.length'),evaluate('new Set(events.map(e=>e.key)).size'));
assert.match(evaluate('timeline()'), /Follow the evidence/);
assert.ok(evaluate('timeline()').includes(research.updates[0].title.en));
assert.match(evaluate('eventCard(events[0])'), /Imported historical record|Sources checked/);
assert.match(evaluate('eventCard(events.find(e=>e.reviewStatus==="imported"))'), /Original classification/);

// Future daily writes must fail on gaps, unresolved citations, duplicates and unsupported deployment labels.
for (const mutate of [
  r => { r.updates = r.updates.filter(u => u.date !== '2026-08-30'); },
  r => { r.updates[0].sourceIds.push('M999999'); },
  r => { r.sources.push({ ...r.sources[0], id: 'M999999' }); },
  r => { r.sources.push({ ...r.sources[0], url: 'https://example.com/new' }); },
  r => { r.updates.reverse(); },
  r => { delete r.updates[0].title.en; },
  r => { r.updates[0].productionChange = true; },
]) {
  const invalid = structuredClone(research); mutate(invalid);
  assert.throws(() => validateResearch(invalid));
}

// An English-only next-day entry must render, search and link to lessons without Chinese placeholders.
const nextDay = new Date(`${research.snapshot}T00:00:00Z`); nextDay.setUTCDate(nextDay.getUTCDate()+1);
const nextDate = nextDay.toISOString().slice(0,10);
const future = structuredClone(research);
const fresh = {id:`event-${nextDate}-gc-review`,date:nextDate,status:'planned',reviewStatus:'reviewed',checkedAt:`${nextDate}T14:00:00Z`,title:{en:'GC checkpoint review'},detail:{en:'Repository changes await a production handoff.'},concept:{en:'A merged change needs a separate deployment check.'},exercise:{en:'Find the run identity in a handoff record.'},sourceIds:['M113']};
future.snapshot=nextDate;future.updates.unshift(fresh);validateResearch(future);
context.fresh=fresh;
evaluate('events.unshift({...fresh,key:fresh.id,sourceItems:fresh.sourceIds.map(id=>srcById.get(id)),tags:["github"],courseIds:relateEvent(fresh)})');
assert.match(evaluate('eventCard(events[0])'), /GC checkpoint review/);
assert.match(evaluate('eventCard(events[0])'), /Find the run identity/);
assert.doesNotMatch(evaluate('eventCard(events[0])'), /undefined|Original classification/);
evaluate('timelineState.query="Repository changes await"');
assert.equal(evaluate('timelineFiltered().length'),1);
assert.equal(evaluate('timelineFiltered()[0].id'),fresh.id);
evaluate('events.shift();timelineState.query=""');
for(let i=1;i<=18;i++)assert.match(evaluate(`coursePager(${i})`),/课程翻页/);
for(let i=2;i<=18;i++){
 const lesson=evaluate(`courseTopic(${i})`);
 assert.match(lesson,/lesson-explanation/);assert.match(lesson,/worked-example/);assert.match(lesson,/answer-explanation/);
 assert.doesNotMatch(lesson,/data-go="chapter-/);
 const ids=evaluate(`courses.find(c=>c.id===${i}).chapters`);
 for(const id of ids)assert.ok(lesson.includes(`data-inline-chapter="${id}"`));
 for(const key of evaluate(`lessonReadings[${i}].sources`))assert.ok(evaluate(`!!(lessonSources[${JSON.stringify(key)}]||archive.references[${JSON.stringify(key)}])`));
}
assert.doesNotMatch(evaluate('header()'),/教材全文/);
assert.doesNotMatch(evaluate('learn()'),/data-go="chapter-/);
for(let i=1;i<=38;i++)assert.match(evaluate(`chapterReader(${i})`),/本章目录/);
assert.doesNotMatch(a.chapters[9].html,/却可能放大 gradient/);
assert.doesNotMatch(a.chapters[28].html,/19\.13MB/);
assert.match(a.chapters[19].html,/384 与 96/);
assert.equal(Math.round((84.02/10.17-1)*100),726);
assert.ok(Math.abs((1-10.17/84.02)*100-87.9)<.1);
const softmax=z=>z.map(x=>Math.exp(x-Math.max(...z))).map((v,_,all)=>v/all.reduce((s,x)=>s+x,0));
assert.deepEqual(softmax([1,2,3]),softmax([101,102,103]));

// Browser history: navigating into a chapter, going back, and restoring filter state.
evaluate('go("course-12")');evaluate('window.scrollY=450;go("chapter-25",12)');
assert.equal(location.search.includes('from=12'),true);
assert.equal(entries.length,3);
pointer--;navigate(entries[pointer].url);listeners.get('popstate')();
assert.equal(evaluate('state.page'),'course-12');assert.equal(context.window.scrollY,450);
evaluate('timelineState={channel:"github",status:"planned",course:"12",query:"checkpoint",limit:24};go("timeline")');
assert.equal(new URL(location).searchParams.get('course'),'12');
evaluate('window.scrollY=640;go("course-12")');
pointer--;navigate(entries[pointer].url);listeners.get('popstate')();
assert.equal(evaluate('timelineState.limit'),24);assert.equal(evaluate('timelineState.query'),'checkpoint');assert.equal(context.window.scrollY,640);
evaluate('go("chapter-999")');assert.match(element.innerHTML,/没有找到这一页/);
console.log(`PASS: 38 chapters, 18 topics, ${a.updates.length} research entries; daily continuity, evidence references, English-only writes, invalid-data rejection; course/chapter routing, history, scroll and timeline filters.`);
