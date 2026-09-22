// Reader-facing information architecture. Legacy prototype layouts remain opt-in.
const pageNames = {home:'首页',learn:'学习目录',projects:'项目案例',marin:'Marin',mimo:'Xiaomi MiMo',timeline:'训练记录',library:'教材全文',resources:'补充资源',audit:'来源与核查',journal:'图解与观察'};
const unitOutcomes = [
  '说清 token、参数和 loss 的关系，画出训练全流程。',
  '解释数据清洗、配比和小规模实验为什么要先做。',
  '读懂 Transformer、MoE 和一次参数更新。',
  '区分设备利用率、训练吞吐与可恢复的有效进度。',
  '判断一条曲线或 benchmark 能支持什么结论。',
  '区分 SFT 与 RL，并写出有来源、有边界的训练观察。'
];
const readingGroups = [
  {name:'项目与全局',start:1,end:4}, {name:'核心概念',start:5,end:11},
  {name:'训练设计',start:12,end:20}, {name:'实验与决策',start:21,end:23},
  {name:'运行与故障',start:24,end:32}, {name:'实践与延伸',start:33,end:38}
];
const currentCourse = () => state.page==='lesson'?1:/^course-\d+$/.test(state.page)?Number(state.page.slice(7)):null;
let returnCourse = null;
function routeLabel(){return currentCourse()?`第 ${currentCourse()} 课`:/^chapter-\d+$/.test(state.page)?`第 ${state.page.slice(8)} 章`:pageNames[state.page]||'页面未找到'}
function readRoute(){
  const p=new URLSearchParams(location.search);
  state.page=p.get('page')||'home';
  if(state.page==='next'||state.page==='course-1')state.page=state.page==='next'?'course-2':'lesson';
  state.variant=['A','B','C'].includes(p.get('variant'))?p.get('variant'):'A';
  const n=Number(p.get('from')); returnCourse=courses.some(c=>c.id===n)?n:null;
  if(state.page==='timeline'){
    const course=p.get('course');
    timelineState={channel:['all',...Object.keys(tagNames)].includes(p.get('channel'))?p.get('channel'):'all',status:['all',...Object.keys(statusNames)].includes(p.get('status'))?p.get('status'):'all',course:courses.some(c=>String(c.id)===course)?course:'all',query:p.get('q')||'',limit:location.hash?events.length:12};
  }
}
function savePosition(){history.replaceState({...history.state,scrollY:window.scrollY,timeline:{...timelineState}},'',location.href)}
function routeUrl(page,from=null){
  const u=new URL(href(page),location.href);
  if(from)u.searchParams.set('from',from);
  if(new URLSearchParams(location.search).get('layouts')==='1')u.searchParams.set('layouts','1');
  if(page==='timeline'){
    for(const k of ['course','channel','status'])if(timelineState[k]!=='all')u.searchParams.set(k,timelineState[k]);
    if(timelineState.query)u.searchParams.set('q',timelineState.query);
  }
  return u.pathname+u.search;
}
go=function(page,from=null){
  const origin=currentCourse()||returnCourse;
  const same=page===state.page;
  savePosition(); stopPlay();
  if($('.modal-backdrop'))closeModal();
  state.page=page==='next'?'course-2':page==='course-1'?'lesson':page;
  returnCourse=page.startsWith('chapter-')?(from||origin):null;
  state.scene=0;state.quiz=null;
  const url=routeUrl(state.page,returnCourse);
  history[same?'replaceState':'pushState']({scrollY:0,timeline:{...timelineState}},'',url);
  render();window.scrollTo(0,0);$('main h1')?.focus({preventScroll:true});
};
updateUrl=function(){history.replaceState({...history.state},'',routeUrl(state.page,returnCourse))};
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('popstate',()=>{
  stopPlay();if($('.modal-backdrop'))closeModal();readRoute();
  if(state.page==='timeline'&&history.state?.timeline)timelineState={...history.state.timeline};
  render();requestAnimationFrame(()=>{
    if(history.state?.scrollY!=null)window.scrollTo(0,history.state.scrollY);
    else if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0,0);
  });
});

header=function(){
  const active=currentCourse()?'learn':state.page.startsWith('chapter-')?'learn':['marin','mimo'].includes(state.page)?'projects':state.page;
  return `<a class="skip-link" href="#main-content">跳到正文</a><header class="container topbar"><a class="brand" href="${href()}" data-go="home" aria-label="Open Foundation Model Training · 返回首页"><span class="brand-symbol">◈</span><div><div class="brand-title">Open Foundation<br>Model Training</div><div class="brand-sub">BY SOLO UNICORN</div></div></a><nav class="nav" aria-label="主导航">${['home','learn','projects','timeline'].map(p=>`<a href="${href(p)}" data-go="${p}" ${active===p?'class="active" aria-current="page"':''}>${pageNames[p]}</a>`).join('')}</nav><a class="small-button" href="${href('audit')}" data-go="audit">来源与核查</a></header>`;
};
footer=function(){return `<footer class="container footer"><div>Open Foundation Model Training · by Solo Unicorn<br>学习原型 · 历史资料快照 ${archive.snapshot}</div><nav aria-label="辅助导航"><a href="${href('learn')}" data-go="learn">学习目录</a><a href="${href('resources')}" data-go="resources">补充资源</a><a href="${href('audit')}" data-go="audit">来源与核查</a></nav><span>${state.completed?'本次已通过第 1 课理解检查':'前两个单元 6 课含图解互动'}</span></footer>`};
function breadcrumbs(){
  const course=currentCourse(); const chapter=state.page.startsWith('chapter-');
  let parents=[];
  if(course)parents=[['learn','学习目录'],['learn',`单元 ${Math.ceil(course/3)}`]];
  else if(chapter)parents=returnCourse?[[coursePage(returnCourse),`第 ${returnCourse} 课`]]:[['library','教材全文']];
  else if(['marin','mimo'].includes(state.page))parents=[['projects','项目案例']];
  return `<nav class="reader-crumb" aria-label="当前位置"><a data-go="home" href="${href()}">首页</a>${parents.map(([p,t])=>`<span aria-hidden="true">/</span><a data-go="${p}" href="${href(p)}">${t}</a>`).join('')}<span aria-hidden="true">/</span><span aria-current="page">${routeLabel()}</span><a class="directory-return" href="${href('learn')}" data-go="learn">返回学习目录</a></nav>`;
}
function moduleCards(){return `<div class="orientation-modules">${courseUnits.map((u,i)=>`<article><span class="module-index">单元 ${u.id} <span>第 ${i*3+1}–${i*3+3} 课</span></span><h3>${u.title}</h3><p>${unitOutcomes[i]}</p><ol>${courses.filter(c=>c.unit===u.id).map(c=>`<li><a data-go="${coursePage(c.id)}" href="${cLink(c.id)}">${String(c.id).padStart(2,'0')} · ${c.title}</a></li>`).join('')}</ol><small>讲解 → 例子 → 理解检查 → 下一课</small></article>`).join('')}</div>`}
function readerHome(){return `<main class="container"><section class="orientation-hero"><div><div class="eyebrow">一份可以循序阅读的模型训练指南</div><h1>看懂一个模型，<br>是怎样训练出来的。</h1><p class="orientation-lead">我们把真实项目的训练过程，整理成一套按顺序阅读的中文课程。帮你从“听过名词”，走到能解释一次训练的选择、结果与局限。</p><p class="orientation-audience">适合学生、产品与技术从业者。入门无需训练经验；深入章节涉及数学、代码与分布式系统。</p><div class="actions"><a class="button primary" data-go="lesson" href="${href('lesson')}">从第 1 课开始 →</a><a class="text-button" href="#curriculum">先看全部学习内容 ↓</a></div><p class="orientation-caption">第 1 课约 8 分钟 · 阅读时长为估计 · 无需租用 GPU</p></div><aside class="start-panel"><span class="eyebrow">第一次来，按这个顺序</span><ol><li><span>01</span><div><strong>建立直觉</strong><p>做一次预测、计算 loss、调整参数。</p></div></li><li><span>02</span><div><strong>学完一课，就点下一课</strong><p>每课都有讲解、例子和理解检查，不用另外找教材。</p></div></li><li><span>03</span><div><strong>带着问题看真实记录</strong><p>追溯来源，分清实测、实验和预测。</p></div></li></ol><div class="start-inventory"><strong>现在可以学什么</strong><p>6 个单元 · 18 课<br>前两个单元 6 课含图解互动<br>第 7–18 课为基础阅读版，待逐步深化</p><a data-go="audit" href="${href('audit')}">查看内容完成度与核查边界 →</a></div></aside></section><section class="section" id="curriculum">${sectionHead('01 / Learning path','你会按什么顺序学？','六个单元是主题分组，共 18 课。从第 1 课往下读，深入材料都可以在课程内展开。',`<a class="text-button" data-go="learn" href="${href('learn')}">打开学习目录 →</a>`)}${moduleCards()}</section><section class="section">${sectionHead('02 / Case studies','我们用哪些项目来解释？','这是课程里的案例背景。刚开始学习时，可以先顺着课程读，不必从项目页寻找正文。')}${projectCards()}</section><section class="reading-trust"><div><h2>读懂结论，也读懂它的边界。</h2><p>教学模拟不是真实训练曲线；主训练、旁路实验和未来计划分别标注。历史数字有日期，待核实内容保留说明。</p></div><a class="button" data-go="audit" href="${href('audit')}">查看来源与核查 →</a></section></main>`}

function readerSidebar(id){return `<aside class="reader-sidebar"><details class="reader-menu" open><summary>学习目录 · 6 个单元</summary><nav aria-label="课程目录">${courseUnits.map(u=>`<details ${u.id===Math.ceil(id/3)?'open':''}><summary>0${u.id} · ${u.title}</summary>${courses.filter(c=>c.unit===u.id).map(c=>`<a href="${cLink(c.id)}" data-go="${coursePage(c.id)}" ${c.id===id?'aria-current="page" class="active"':''}>${String(c.id).padStart(2,'0')} · ${c.title}</a>`).join('')}</details>`).join('')}</nav><a class="text-button" data-go="learn" href="${href('learn')}">返回完整学习目录</a></details></aside>`}
function coursePager(id){return `<nav class="reader-pager" aria-label="课程翻页">${id>1?`<a data-go="${coursePage(id-1)}" href="${cLink(id-1)}"><small>← 上一课</small>${courses[id-2].title}</a>`:`<a data-go="learn" href="${href('learn')}"><small>返回</small>学习目录</a>`}<a data-go="${id<18?coursePage(id+1):'timeline'}" href="${id<18?cLink(id+1):href('timeline')}"><small>${id<18?'下一课 →':'开始观察 →'}</small>${id<18?courses[id].title:'选一条记录，写下事实与未知'}</a></nav>`}
chapterLinks=function(course){return course.chapters.map(n=>`<a class="chapter-list-link" href="${href('chapter-'+n)}&from=${course.id}" data-go="chapter-${n}" data-from="${course.id}"><span>第 ${n} 章</span>${esc(chapterById(n).title)}<span>→</span></a>`).join('')};
function samePageMaterials(id){
  const course=courses.find(c=>c.id===id);
  return `<details class="optional-reading"><summary>想深入？在本页展开技术材料（选读）</summary><p class="reading-boundary">下面保留相关教材的详细解释与原始引用。历史快照截至 ${archive.snapshot}，核查范围见「来源与核查」。不必读完这些材料才能继续下一课。${id===16||id===17?'第 20 章只提供 Marin 的历史路线背景，不是 SFT / RL 实施结果。':''}</p>${course.chapters.map(n=>{const chapter=chapterById(n);return `<details class="inline-chapter" data-inline-chapter="${n}"><summary>${esc(chapter.title)}</summary><div class="chapter-prose">${chapter.html}</div></details>`}).join('')}</details>`;
}
integratedMaterials=samePageMaterials;
courseTopic=function(id){
  if(id===2||id===3)return unitLesson(id);
  if(id>=4&&id<=6)return prepLesson(id);
  const c=courses.find(c=>c.id===id),reading=lessonReadings[id];
  if(!c||!reading)return notFound();
  return `<main class="container"><div class="reader-grid">${readerSidebar(id)}<article class="course-topic self-contained-lesson"><div class="eyebrow">单元 ${c.unit} / 第 ${id} 课，共 18 课</div><h1 class="lesson-title">${c.title}</h1><p class="lesson-lead">${c.question}</p><p class="lesson-reading-note">本页即可学完入门内容：讲解 → 例子 → 理解检查。深入材料是选读。</p><div class="lesson-takeaway"><strong>这课要学会的一句话</strong><p>${reading.takeaway}</p></div><div class="lesson-explanation">${reading.sections.map(([title,text],i)=>`<section><h2><span>0${i+1}</span>${title}</h2><p>${text}</p></section>`).join('')}</div><section class="worked-example"><span class="eyebrow">${id===18?'真实记录阅读练习':'教学示例 · 非项目实测'}</span><h2>${reading.example[0]}</h2><p>${reading.example[1]}</p></section><section class="lesson-check"><h2>停一下，检查你的理解</h2><p>${reading.question}</p><details class="answer-explanation"><summary>想好后，展开答案与解释</summary><p>${reading.answer}</p></details></section><div class="lesson-wrapup"><strong>学到这里，你已经可以继续。</strong><p>${reading.bridge}</p><p>不必打开技术材料，也不必先去另一个页面查完所有名词。</p></div>${coursePager(id)}<div class="lesson-supplements"><h2>下面是选读，不影响继续学习</h2>${samePageMaterials(id)}<details class="optional-reading"><summary>查看这一课的来源依据</summary><p>入门解释由本站整理；除标明的真实记录外，例子与数字均为教学假设。</p>${reading.sources.map(key=>{const s=lessonSources[key]||archive.references[key];return `<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`}).join('')}</details></div></article></div></main>`;
};
learn=function(){return `<main class="container"><section class="curriculum-intro"><div class="eyebrow">一套课程 / 从第 1 课开始</div><h1>按顺序学，一课接着一课。</h1><p>六个单元只是把相近主题分组，共 18 课。点进每一课，就能在同页读讲解、看例子、检查理解，然后继续下一课。教材已放回课程内，不需要在两套目录之间切换。</p><div class="actions"><a class="button primary" data-go="lesson" href="${cLink(1)}">从第 1 课开始 →</a></div><p class="lesson-reading-note">前两个单元已展开：第 1–6 课包含分步图解、动手探索与理解检查。第 7–18 课目前是基础阅读版，后续逐单元深化。</p></section>${courseUnits.map(u=>`<section class="module-section"><div class="module-aside"><span class="num">单元 ${u.id}</span><h2>${u.title}</h2><p>${unitOutcomes[u.id-1]}</p></div><div>${courses.filter(c=>c.unit===u.id).map(c=>`<article class="course-row"><div class="course-row-top"><span class="number">${String(c.id).padStart(2,'0')}</span><h3><a href="${cLink(c.id)}" data-go="${coursePage(c.id)}">第 ${c.id} 课 · ${c.title}</a></h3><a class="course-open" href="${cLink(c.id)}" data-go="${coursePage(c.id)}" aria-label="打开第 ${c.id} 课">→</a></div><p>${c.question}</p><div class="course-meta"><span class="badge">${c.id<=6?'图解互动 + 理解检查':'基础阅读版 · 待深化'}</span></div></article>`).join('')}</div></section>`).join('')}</main>`};
function libraryPage(){return `<main class="container"><section class="curriculum-intro"><div class="eyebrow">参考阅读 / MARIN 教材</div><h1>38 章教材，有目录，也有顺序。</h1><p>已经熟悉概念？按下面六部分深入阅读。第一次接触模型训练，建议先走学习目录；不必先读完全部教材。</p><div class="actions"><a class="button primary" data-go="learn" href="${href('learn')}">从学习目录开始 →</a><a class="text-button" href="/marin-original.md" download>下载校订版 Markdown ↓</a></div></section><div class="archive-banner">历史快照 ${archive.snapshot} · 本次已修正部分概念与过时措辞，未逐项复核全部运行数据。原教材插图文件未随资料导入。</div><nav class="library-index" aria-label="教材分部目录">${readingGroups.map((g,i)=>`<a href="#part-${i+1}">${i+1} · ${g.name}</a>`).join('')}</nav>${readingGroups.map((g,i)=>`<section class="library-part" id="part-${i+1}"><h2>0${i+1} · ${g.name}</h2><div>${archive.chapters.filter(c=>c.number>=g.start&&c.number<=g.end).map(c=>`<a data-go="chapter-${c.number}" href="${href('chapter-'+c.number)}"><span>${String(c.number).padStart(2,'0')}</span>${esc(c.title)}<span>→</span></a>`).join('')}</div></section>`).join('')}</main>`}
chapterReader=function(number){
  const c=chapterById(number);if(!c)return notFound();
  const linked=courses.filter(x=>x.chapters.includes(number));
  if(returnCourse&&!linked.some(x=>x.id===returnCourse))returnCourse=null;
  const group=readingGroups.find(g=>number>=g.start&&number<=g.end);
  let section=0;const headings=[];
  const prose=c.html.replace(/<h2>(.*?)<\/h2>/g,(_,title)=>{const id=`section-${++section}`;headings.push({id,title:title.replace(/<[^>]*>/g,'')});return `<h2 id="${id}">${title}</h2>`});
  const chapterLink=n=>href('chapter-'+n)+(returnCourse?'&from='+returnCourse:'');
  return `<main class="container"><div class="reader-grid chapter-layout"><aside class="reader-sidebar"><div class="return-panel"><strong>${returnCourse?'继续你的课程':'教材全文'}</strong><a class="text-button" data-go="${returnCourse?coursePage(returnCourse):'library'}" href="${returnCourse?cLink(returnCourse):href('library')}">${returnCourse?'← 返回第 '+returnCourse+' 课':'← 返回教材目录'}</a></div><details class="reader-menu" open><summary>${group.name} · 章节目录</summary><nav aria-label="本部分章节">${archive.chapters.filter(x=>x.number>=group.start&&x.number<=group.end).map(x=>`<a href="${chapterLink(x.number)}" data-go="chapter-${x.number}" ${x.number===number?'aria-current="page" class="active"':''}>${x.number} · ${esc(x.title)}</a>`).join('')}</nav></details><details class="reader-menu" open><summary>本章目录</summary><nav aria-label="本章目录">${headings.map(h=>`<a href="#${h.id}">${esc(h.title)}</a>`).join('')}</nav></details></aside><article class="chapter-content"><div class="eyebrow">MARIN 教材 / 第 ${number} 章，共 38 章</div><h1>${esc(c.title)}</h1><div class="archive-banner">历史快照 · ${archive.snapshot}。已作部分编辑校订，未复核全部历史状态。<a data-go="audit" href="${href('audit')}">查看核查记录 →</a>${[1,32].includes(number)?'<p>本章引用的 live W&B 数字本次未取得可复核的原始数据，仍属历史整理记录。</p>':''}</div><div class="chapter-prose">${prose}</div><section class="embedded-chapters"><h3>把这一章放回学习主线</h3>${linked.map(x=>`<a class="chapter-list-link" data-go="${coursePage(x.id)}" href="${cLink(x.id)}"><span>第 ${x.id} 课</span>${x.title}<span>→</span></a>`).join('')}</section><nav class="reader-pager" aria-label="教材翻页">${number>1?`<a data-go="chapter-${number-1}" href="${chapterLink(number-1)}"><small>← 上一章</small>${esc(chapterById(number-1).title)}</a>`:`<a data-go="library" href="${href('library')}">返回教材目录</a>`}${number<38?`<a data-go="chapter-${number+1}" href="${chapterLink(number+1)}"><small>下一章 →</small>${esc(chapterById(number+1).title)}</a>`:`<a data-go="learn" href="${href('learn')}">回到学习目录 →</a>`}</nav></article></div></main>`;
};
function notFound(){return `<main class="container"><section class="curriculum-intro"><h1>没有找到这一页</h1><p>这个课程或章节地址不存在。可以从完整目录继续阅读。</p><a class="button" href="${href('learn')}" data-go="learn">返回学习目录 →</a></section></main>`}

const previousRender=render;
render=function(){
  const id=currentCourse();
  const invalid=(id&&!courses.some(c=>c.id===id))||(state.page.startsWith('chapter-')&&!chapterById(Number(state.page.slice(8))))||(!id&&!state.page.startsWith('chapter-')&&!pageNames[state.page]);
  if(invalid||['home','library','audit'].includes(state.page)){
    const legacy=document.documentElement.dataset.prototype!=='false'&&new URLSearchParams(location.search).get('layouts')==='1';
    $('#app').innerHTML=header()+(invalid?notFound():state.page==='home'?(legacy?({A:VariantA,B:VariantB,C:VariantC}[state.variant]()).replace('</main>',homeTimeline()+'</main>'):readerHome()):state.page==='library'?libraryPage():auditPage())+footer();
  }else previousRender();
  const main=$('main');if(!main)return;
  main.id='main-content'; main.setAttribute('tabindex','-1');
  main.querySelector('h1')?.setAttribute('tabindex','-1');
  main.querySelectorAll('.crumb').forEach(e=>e.remove());
  if(state.page!=='home')main.insertAdjacentHTML('afterbegin',breadcrumbs());
  // The interactive first lesson uses the same directory and reading order.
  if(state.page==='lesson'){
    main.querySelector('.lesson-meta')?.insertAdjacentHTML('afterend',unitJourney(1));
    main.querySelector('#quiz')?.insertAdjacentHTML('afterend','<div class="unit-first-bridge"><strong>你刚看懂的是一次参数更新。</strong><p>记住这三件事：文本提供预测目标，loss 衡量差距，训练算法据此调整参数。刚才的小模型只反复学习同一句话，不能由此推断它学会了完整语言。</p><p>下一课把镜头拉远：数据、训练、评测与发布，怎样组成一个完整项目？</p></div>');
    const old=$('.lesson-sidebar');if(old)old.outerHTML=readerSidebar(1);
    const next=$('.next-lesson');if(next){(main.querySelector('.unit-first-bridge')||next).insertAdjacentHTML('afterend',coursePager(1));const materials=main.querySelector('.optional-reading');if(materials)next.insertAdjacentElement('afterend',materials)}
    const mobile=$('.mobile-progress');if(mobile)mobile.textContent='单元 1 · 第 1 课 / 18 个主题';
  }
  if(id){main.querySelectorAll('.next-lesson').forEach(e=>e.style.display='none');main.querySelectorAll('.chapter-chips a').forEach(a=>{a.dataset.from=id;a.href+='&from='+id})}
  if(state.page==='learn'){
    main.querySelectorAll('.module-section').forEach((s,i)=>s.id='unit-'+(i+1));
    const intro=$('.curriculum-intro');intro?.insertAdjacentHTML('beforeend',`<nav class="library-index" aria-label="单元目录">${courseUnits.map(u=>`<a href="#unit-${u.id}">0${u.id} · ${u.title}</a>`).join('')}</nav>`);
    main.querySelectorAll('.chapter-chips a').forEach(a=>{const row=a.closest('.course-row');const lesson=Number(row.querySelector('.number').textContent);a.dataset.from=lesson;a.href+='&from='+lesson});
  }
  if(state.page==='timeline')main.querySelector('.archive-banner')?.insertAdjacentHTML('beforeend',` <a href="${href('audit')}" data-go="audit">查看本次核查范围与待复核项 →</a>`);
  // Keep the current location visible without letting the directory consume a phone screen.
  if(window.innerWidth<=760)main.querySelectorAll('.reader-sidebar > details').forEach(el=>el.open=false);
  document.title=invalid?'页面未找到 · OFMT':`${id?courses[id-1].title:state.page.startsWith('chapter-')?chapterById(Number(state.page.slice(8))).title:pageNames[state.page]} · Open Foundation Model Training`;
  const showLayouts=document.documentElement.dataset.prototype!=='false'&&new URLSearchParams(location.search).get('layouts')==='1';
  $('#switcher').innerHTML='';if(showLayouts)switcher();
};
// Preserve browser-standard modifier-click behaviour and explicit course context.
document.addEventListener('click',e=>{
  const a=e.target.closest('a[data-go]');
  if(a&&(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)){e.stopImmediatePropagation();return}
  if(a?.dataset.from){e.preventDefault();e.stopImmediatePropagation();go(a.dataset.go,Number(a.dataset.from))}
},true);
const previousRefreshTimeline=refreshTimeline;
refreshTimeline=function(){previousRefreshTimeline();if(state.page==='timeline')history.replaceState({...history.state,timeline:{...timelineState}},'',routeUrl('timeline')+location.hash)};
document.addEventListener('click',e=>{
  if(state.page==='timeline'&&e.target.closest('[data-timeline-channel],[data-reset-timeline]'))refreshTimeline();
});
readRoute();
render();
if(state.page==='timeline'&&location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
