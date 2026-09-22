// Unit 1 teaching models. All sample outputs, IDs and vectors below are illustrative.
const unitState = { stage: 0, mode: 'train', sentence: 0, split: 'pieces', repeat: 1, selected: 0, answers: {} };
const journeyLabels = ['看懂一次学习', '把学习放进全流程', '看懂模型的输入'];
function unitJourney(id) {
  return `<nav class="unit-journey" aria-label="第一单元学习路线">${journeyLabels.map((label,i)=>`<a href="${cLink(i+1)}" data-go="${coursePage(i+1)}" ${id===i+1?'aria-current="step"':''}><span>0${i+1}</span><div>第 ${i+1} 课<strong>${label}</strong></div></a>`).join('')}</nav>`;
}
const lifecycleScenes = [
  {name:'准备材料',short:'确定目标与数据',icon:'data',input:'公开文本、代码、来源与使用条件',signal:'数据质量与适用性检查',output:'可供训练的数据 + 分开的检查材料',change:false,
    title:'先为助手准备“读物”和“考卷”。',text:'我们想做一个能解释代码的助手。先确定它要帮助谁、处理什么问题，再整理文本与代码：提取正文、过滤损坏内容、检查重复，并留出检查材料。此时还没有开始用这些材料更新语言模型。',
    sample:['材料','for item in items: …','希望读懂代码及其解释'],note:'检查材料如果泄漏进训练，后面的“考试”就可能失去意义。'},
  {name:'预训练',short:'从文本中学预测',icon:'train',input:'大量文本切成的 token 序列',signal:'真实的下一个 token',output:'学到语言与代码规律的基础模型',change:true,
    title:'第一课的循环，在大量材料上发生。',text:'把“预测 → 比较 → 调整”重复很多次。答案来自文本本身：读到一段代码的前半部分，就预测后面的 token。模型逐渐学到可用于续写的规律，但这个训练目标没有直接保证它每次都按用户的要求回答。',
    sample:['训练片段','这个循环会依次处理每个 ___','文本中真实的下一片段作为目标'],note:'这张图说明训练目标，不表示模型只在做填空题，也不代表学会预测就能保证事实正确。'},
  {name:'阶段评测',short:'在留出题上检查',icon:'eval',input:'一个模型版本 + 未参与训练的检查题',signal:'规定的评分方式与错误分析',output:'评测结果 + 下一步修改的依据',change:false,
    title:'拿一份新题，看看它能不能解释。',text:'让这个模型解释未用于训练的代码，再按照统一规则检查：解释是否正确、能否处理边界情况、是否遵循要求。评测运行本身通常不更新参数；发现的问题会影响下一轮数据或训练决策。',
    sample:['检查题','空列表传入这段程序，会发生什么？','记录回答与错误，不在此处更新参数'],note:'评测贯穿流程；放在这里是为了看清一次检查，并非只有这一处能评测。'},
  {name:'示范微调',short:'学习期望的回答',icon:'tune',input:'用户请求 + 高质量示范回答',signal:'示范回答中的目标 token',output:'进一步适应指令与回答方式的模型',change:true,
    title:'用示范说明“好的解释长什么样”。',text:'监督微调（SFT）继续使用预测误差来训练，但材料组织成请求与示范回答。比如要求“先说目的，再逐行解释，最后提醒边界情况”。这里既在教内容，也在教怎样回应请求。示范有错误或覆盖不足，模型也可能学到不理想的行为。',
    sample:['示范对','问：用两句话解释这个循环。','答：第一句说目的；第二句说每次迭代做什么。'],note:'示范文本只用于展示格式；SFT 的具体数据、目标位置和训练配方由项目决定。'},
  {name:'反馈训练',short:'利用尝试的反馈',icon:'tune',input:'模型采样的回答 + 任务反馈',signal:'奖励或偏好等训练信号',output:'按反馈继续更新的模型策略',change:true,
    title:'有时不写标准答案，而是评价尝试。',text:'强化学习（RL）可以利用回答或行动得到的反馈来更新模型。例如，尝试完成代码任务后，用测试结果提供部分反馈。关键是把反馈交给训练算法执行更新。奖励只覆盖目标的一部分，得分更高仍需独立评测。',
    sample:['一次尝试','读报错 → 提出修复 → 运行测试','测试结果可成为反馈的一部分'],note:'RL 是一种可选路线，不是所有模型都必须经过的最后一站；这里也不是某个公开项目的实际配方。'},
  {name:'发布与使用',short:'选择版本并提供服务',icon:'model',input:'经过检查的模型版本 + 用户输入',signal:'使用时按当前参数生成输出',output:'用户可使用的回答或服务',change:false,
    title:'把一个版本交给用户，并继续观察。',text:'发布前检查目标场景下的表现与限制，准备推理服务，再让用户访问。通常一次对话只使用当前参数生成回答，不会当场更新参数。团队可以收集问题，用于之后独立的数据整理、训练与评测。',
    sample:['使用时','用户：请解释这段代码。','模型：按当前参数逐步生成回答。'],note:'上下文会影响本次回答；保存对话或用户反馈，也不等于已把它写进模型参数。'}
];

function lifecycleScene(index) {
  const s=lifecycleScenes[index];
  return `<div class="scene-illustration"><div class="scene-emblem">${icon(s.icon)}</div><div class="example-slip"><span>${s.sample[0]} · 教学场景</span><strong>${s.sample[1]}</strong><p>${s.sample[2]}</p></div></div><div class="scene-copy"><div class="scene-counter">${String(index+1).padStart(2,'0')} / 06 <span class="parameter-flag ${s.change?'updating':''}">${s.change?'更新模型参数':'此阶段不更新模型参数'}</span></div><h3>${s.title}</h3><p>${s.text}</p><dl class="scene-facts"><div><dt>输入</dt><dd>${s.input}</dd></div><div><dt>依据</dt><dd>${s.signal}</dd></div><div><dt>产出</dt><dd>${s.output}</dd></div></dl><p class="visual-footnote">${s.note}</p></div>`;
}
function lifecycleLab() {
  return `<div class="unit-lab lifecycle-lab"><div class="lab-caption"><span>可操作图解 / 一份模型的成长档案</span><span>点击阶段，逐步展开</span></div><div class="lifecycle-stops" role="group" aria-label="模型开发阶段">${lifecycleScenes.map((s,i)=>`<button data-life-stage="${i}" aria-pressed="${unitState.stage===i}"><span>0${i+1}</span>${icon(s.icon)}<strong>${s.name}</strong><small>${s.short}</small></button>`).join('')}</div><div id="lifecycle-scene" class="lifecycle-scene" aria-live="polite">${lifecycleScene(unitState.stage)}</div><div class="lab-controls"><button data-life-step="-1" ${unitState.stage===0?'disabled':''}>← 上一阶段</button><span id="life-position">${unitState.stage+1} / 6</span><button data-life-step="1" ${unitState.stage===5?'disabled':''}>下一阶段 →</button></div><div class="evaluation-rail">↶ 检查 → 找到问题 → 调整数据或训练方案 → 再检查 <strong>评测可以发生在多个阶段</strong></div></div>`;
}
function trainingModeView(mode) {
  const train=mode==='train';
  return `<div class="mode-flow" role="img" aria-label="${train?'训练：输入经模型产生预测，与目标比较，计算梯度并更新参数':'推理：输入经固定参数的模型产生预测，再把选出的 token 加回上下文'}"><div><small>输入上下文</small><strong>天空是…</strong></div><span aria-hidden="true">→</span><div class="model-box"><small>模型参数 θ</small><strong>${train?'允许更新':'保持固定'}</strong></div><span aria-hidden="true">→</span><div><small>输出</small><strong>下一 token 的分布</strong></div></div><div class="mode-return ${train?'training':''}">${train?'↶ 真实目标“蓝色” → loss → 梯度 → 优化器更新参数':'↶ 选出一个 token → 加进上下文 → 继续生成下一个'}</div><p>${train?'训练要有目标或反馈，还要实际执行参数更新。只把一句话输入模型，并不会自动发生这一整套循环。':'推理也会反复计算，但增加的是本次输入上下文。模型可以利用你刚提供的信息回答，通常并未因此改写自己的参数。'}</p>`;
}
const unitQuestions={
  '2-signal':{question:'团队读取很多网页，用每个位置真实的下一个 token 计算误差，再更新参数。这主要对应哪一步？',options:['阶段评测','预训练','发布服务'],correct:1,explanations:['评测用于检查模型；题目明确执行了参数更新。再找找训练目标是什么。','对。文本自己提供预测目标，这正是这里讲的下一 token 预训练。','发布服务主要让用户使用一个版本；这里是在用文本继续训练。']},
  '2-context':{question:'你在对话里说“我家的猫叫阿布”，模型随后能回答猫的名字。这能证明参数已更新吗？',options:['不能，它可以从当前上下文读取名字','能，只要回答变化，参数一定变化','能，模型每输出一个 token 都在训练'],correct:0,explanations:['对。上下文变化就能改变回答，参数可以保持不变。是否训练要看有没有执行更新。','回答同时取决于参数和输入；输入改变，并不要求参数改变。','生成一个 token 是推理计算，不能自动等同于训练更新。']},
  '2-decision':{question:'训练 loss 下降，但助手在固定的新题上仍经常解释错代码。合理的下一步是什么？',options:['只按 loss 宣布训练成功','先做 RL，就一定会好','分析错误，再检查数据、训练与评测设置'],correct:2,explanations:['loss 只覆盖特定预测目标。这里已经有目标任务表现不好的证据。','RL 不能保证修复所有问题，反馈规则也可能不合适。应先定位问题。','对。评测连接下一轮决策，而不是给一条直线流程盖章。']},
  '3-id':{question:'假设某个词表中，“天空”的 ID 比“蓝色”大，能推断“天空”更重要吗？',options:['能，ID 就是重要性分数','不能，ID 主要是查表用的编号','能，ID 越大，向量维度越多'],correct:1,explanations:['编号不表达重要性。观察查表图：它只用来定位 embedding 表中的一行。','对。编号可以重新安排，只要对应关系一起调整；不能用大小直接比较语义。','表中每行的维度相同，ID 大小不会改变这一行有多少个数字。']},
  '3-repeat':{question:'保持模型与词表不变，把同一句输入重复三遍。下面哪项会直接增加？',options:['输入的 token 数','embedding 表的行数','模型的参数总数'],correct:0,explanations:['对。序列更长，需要处理更多位置；固定模型的参数数量不会因为这段输入变长而增加。','重复输入会重复查同一张表，不会添加词表条目。','参数属于模型本身；输入变长通常增加计算与中间状态，而非参数数量。']},
  '3-context':{question:'同一个 token 出现两次，初始查表向量相同，就说明模型会完全一样地理解它吗？',options:['是，相同 token 的最终表示永远相同','不是，后续计算会结合位置和上下文','不是，第二次一定会得到新 ID'],correct:1,explanations:['查表只是入口。后续的位置信息与上下文计算会影响每个位置的表示。','对。要区分初始 embedding 和经过模型层处理后的上下文表示。','固定词表下同一 token 的 ID 不会仅因为它再次出现就改变。']}
};
function unitQuestion(key) {
  const q=unitQuestions[key],selected=unitState.answers[key];
  return `<fieldset class="unit-question" data-unit-question="${key}"><legend>${q.question}</legend><div class="unit-options">${q.options.map((o,i)=>`<button type="button" data-unit-choice="${i}" aria-pressed="${selected===i}" class="${selected===i?(i===q.correct?'is-right':'is-wrong'):''}"><span>${String.fromCharCode(65+i)}</span>${o}</button>`).join('')}</div><p class="unit-feedback" aria-live="polite">${selected===undefined?'选一个答案，看看你的理由是否成立。':q.explanations[selected]}</p></fieldset>`;
}

// A fixed vocabulary shared by the two teaching rules. IDs are actual row indices here.
const toySentences=['天空是蓝色。','小猫在睡觉。','天空是蓝色。天空是蓝色。'];
const toyWords=['天空','蓝色','小猫','睡觉'];
const toyVocabulary=[...new Set(toySentences.join('')),...toyWords];
function toyTokens(text,rule='pieces') {
  const tokens=[];
  for(let pos=0;pos<text.length;) {
    const match=rule==='pieces'?toyWords.find(word=>text.startsWith(word,pos)):null;
    const token=match||String.fromCodePoint(text.codePointAt(pos));
    tokens.push({text:token,id:toyVocabulary.indexOf(token)});pos+=token.length;
  }
  return tokens;
}
function toyVector(id) {return [((id*3+2)%11-5)/5,((id*5+1)%13-6)/6,((id*7+4)%9-4)/4]}
function tokenMetrics(sentence,rule,repeat) {
  const text=toySentences[sentence].repeat(repeat),tokens=toyTokens(text,rule);
  return {text,tokens,characters:[...text].length,parameters:toyVocabulary.length*3};
}
function tokenLookup() {
  const m=tokenMetrics(unitState.sentence,unitState.split,unitState.repeat);
  const position=Math.min(unitState.selected,m.tokens.length-1),token=m.tokens[position],vector=toyVector(token.id);
  return `<div class="token-source"><small>原文 · ${m.characters} 个字符（含标点）</small><p>${m.text}</p></div><div class="token-ribbon" aria-label="切分结果，点击查看编号与向量">${m.tokens.map((t,i)=>`<button data-token-pos="${i}" aria-pressed="${i===position}" aria-label="第 ${i+1} 个 token：${t.text}"><span>${esc(t.text)}</span><small>位置 ${i+1}</small></button>`).join('')}</div><p class="token-count-note">当前切成 <strong>${m.tokens.length} 个 token</strong>。选中任意片段，沿着下面的箭头读。</p><div class="lookup-flow"><div class="lookup-token"><small>文字片段</small><strong>${esc(token.text)}</strong></div><span class="flow-arrow" aria-hidden="true">→</span><div class="lookup-id"><small>词表编号 ID</small><strong>${token.id}</strong><span>定位第 ${token.id+1} 行 · ID 从 0 计数</span></div><span class="flow-arrow" aria-hidden="true">→</span><div class="lookup-vector"><small>取出该行的 3 个数</small><div class="vector-cells">${vector.map(v=>`<span class="${v<0?'negative':'positive'}">${v.toFixed(2)}</span>`).join('')}</div><span>教学向量 · 未经训练</span></div></div><div class="lookup-note"><strong>每次都查同一张表。</strong> 本例词表固定为 ${toyVocabulary.length} 个条目，每行有 3 个可调整的数字。重复出现的“${esc(token.text)}”使用同一个 ID，也取出同一行。</div><div class="vector-bars" role="img" aria-label="三个教学向量分量：${vector.map(v=>v.toFixed(2)).join('，')}。颜色仅表示正负。">${vector.map((v,i)=>`<div><span>分量 ${i+1}</span><div class="vector-axis"><i style="left:${v<0?50+v*45:50}%;width:${Math.abs(v)*45}%;background:${v<0?'#b97957':'#719168'}"></i></div><code>${v.toFixed(2)}</code></div>`).join('')}</div><p class="visual-footnote">数字和颜色由本站为演示生成。每个分量没有被指定为“颜色”“动物”等人类概念；不能从这张教学图推断真实模型的语义结构。</p>`;
}
function lengthExperiment() {
  const m=tokenMetrics(unitState.sentence,unitState.split,unitState.repeat);
  return `<div class="length-stats"><div><small>输入序列</small><strong>${m.tokens.length}<em>tokens</em></strong><p>随句子、切分规则与重复次数变化</p></div><div><small>本例 embedding 表</small><strong>${m.parameters}<em>个数</em></strong><p>${toyVocabulary.length} 个条目 × 3 维，保持不变</p></div><div><small>本次取出的向量</small><strong>${m.tokens.length*3}<em>个数</em></strong><p>${m.tokens.length} 个位置 × 3 维，随长度增加</p></div></div><div class="length-visual" aria-label="${m.tokens.length} 个输入位置，每个位置取出三个数">${m.tokens.map((t,i)=>`<span title="位置 ${i+1}：${esc(t.text)}">${[0,1,2].map(()=>'<i></i>').join('')}</span>`).join('')}</div><p class="visual-footnote">每一列代表一个输入位置，三格表示三维向量。${m.parameters} 只是这张教学 embedding 表的参数量，不是完整语言模型的参数量，也不是显存估算。</p>`;
}
function tokenLab() {
  return `<div class="unit-lab token-lab"><div class="lab-caption"><span>动手拆一句话</span><span>固定词表 · 教学分词规则</span></div><div class="lab-inputs"><label>选择一句话<select id="toy-sentence">${toySentences.map((s,i)=>`<option value="${i}" ${unitState.sentence===i?'selected':''}>${s}</option>`).join('')}</select></label><label>切分方式<select id="toy-split"><option value="pieces" ${unitState.split==='pieces'?'selected':''}>规则 A：优先匹配词表中的片段</option><option value="characters" ${unitState.split==='characters'?'selected':''}>规则 B：逐字切分</option></select></label></div><div id="token-lookup" aria-live="polite">${tokenLookup()}</div><div class="length-experiment"><h3>再试一次：输入变长，模型会变大吗？</h3><p>拖动滑块，把所选句子重复几遍。先猜下面三个数字谁会变化，再看结果。</p><label class="repeat-control" for="toy-repeat">重复次数 <output id="repeat-value">${unitState.repeat} 遍</output></label><input id="toy-repeat" aria-label="句子重复次数" type="range" min="1" max="3" step="1" value="${unitState.repeat}"><div id="token-metrics" aria-live="polite">${lengthExperiment()}</div></div></div>`;
}

function lesson2Body() {
  return `<section class="unit-section" id="life-overview"><div class="unit-section-heading"><span>01 / 看全局</span><h2>同一个模型，会经历不同的工作。</h2></div><p>第一课把镜头放在一次参数更新上。现在把镜头拉远：假设我们要做一个<strong>能向初学者解释代码的助手</strong>，一次更新只是整个项目的一小步。</p><p>先别急着记 pretraining、SFT、RL 这些缩写。每到一个阶段，只问三件事：<strong>给它什么？依据什么判断？最后得到什么？</strong>下面从准备材料开始，点“下一阶段”走一遍。</p>${lifecycleLab()}<div class="lesson-takeaway"><strong>把图读成一句话</strong><p>团队准备数据，用训练改变模型，用评测决定下一步，再把经过检查的版本提供给用户。</p></div></section>
  <section class="unit-section" id="training-signals"><div class="unit-section-heading"><span>02 / 拆开训练信号</span><h2>都在“学习”，答案却来自不同地方。</h2></div><p>预训练、SFT 和 RL 都可能更新模型参数。真正要分清的是：这一轮训练依据什么信号调整？</p><div class="signal-cards"><article><span class="signal-symbol">文</span><h3>预训练：文本给目标</h3><p>读到“这个函数返回…”时，后面真实出现的 token 就是预测目标。无需人工为每个位置另外写一份答案。</p><div>文本前缀 → 预测<br><strong>对照原文 → 更新</strong></div></article><article><span class="signal-symbol">例</span><h3>SFT：示范给目标</h3><p>把请求和期望回答放在一起。模型学习在这个请求之后，怎样生成示范里的回答内容与形式。</p><div>请求 → 预测回答<br><strong>对照示范 → 更新</strong></div></article><article><span class="signal-symbol">评</span><h3>RL：反馈指导更新</h3><p>模型先尝试，再根据任务反馈进行训练。反馈可以来自测试、偏好等机制，但只能衡量目标的一部分。</p><div>尝试 → 获得反馈<br><strong>训练算法 → 更新</strong></div></article></div><p>例如，同样想改善代码解释，SFT 可以提供一份清楚的示范；RL 则需要能评价尝试的反馈机制。两者不是保证效果的按钮。数据、反馈与任务不匹配时，增加训练仍可能得不到想要的能力。</p><div class="unit-callout"><strong>这是一条常见路线，不是统一配方。</strong><p>有的项目只发布基础模型，有的加入 SFT，有的继续做反馈训练。阶段也可能重复、交替或采用不同方法。读真实项目时，要看实际做了什么。</p></div></section>
  <section class="unit-section" id="train-or-use"><div class="unit-section-heading"><span>03 / 对比两种循环</span><h2>它正在回答你，还是正在训练？</h2></div><p>两种情况都会把输入送进模型，也都会算出下一 token 的分布。差别在于有没有通过训练过程<strong>更新参数</strong>。切换下面的按钮，看回路接到了哪里。</p><div class="unit-lab mode-lab"><div class="mode-toggle" role="group" aria-label="比较训练与推理"><button data-model-mode="train" aria-pressed="${unitState.mode==='train'}">训练：用误差更新</button><button data-model-mode="infer" aria-pressed="${unitState.mode==='infer'}">推理：用现有参数回答</button></div><div id="training-mode" aria-live="polite">${trainingModeView(unitState.mode)}</div></div><p>你刚告诉助手一个名字，它下一句就能用这个名字，是因为它读到了当前上下文。要确认它有没有“学进参数”，需要查看实际训练机制，不能只根据回答变化判断。</p></section>
  <section class="unit-section worked-example" id="life-decision"><div class="unit-section-heading"><span>04 / 用一次失败连接全流程</span><h2>能续写代码，却解释错了空列表。</h2></div><p>假设我们的助手在常见例子上表现不错，但一遇到空列表就解释错。这时先保存模型版本、题目与回答，确认问题能复现。再检查：训练材料是否覆盖了这类情况？示范是否有错误？评分规则是否漏掉边界条件？</p><div class="decision-flow"><span>发现错误</span><b>→</b><span>定位缺口</span><b>→</b><span>修改数据或训练</span><b>→</b><span>用独立题再检查</span></div><p>不能只是把原题答案背进去，再用同一道题证明“模型变强”。评测的价值，是帮助我们决定下一步，以及检验改动能不能推广到新题。</p><p class="visual-footnote">本节是教学场景，没有引用某个项目的实际收益或训练结果。</p></section>
  <section class="unit-section lesson-check" id="unit-check"><div class="unit-section-heading"><span>05 / 轮到你判断</span><h2>看到一个动作，认出它在做什么。</h2></div>${unitQuestion('2-signal')}${unitQuestion('2-context')}${unitQuestion('2-decision')}<details class="answer-explanation"><summary>学完后，用自己的话复述</summary><p>预训练从大量材料中学习预测；SFT 用示范塑造回答；RL 可以利用反馈继续更新。评测检查结果并指导决策，推理则通常用固定参数回答当前输入。</p></details></section>`;
}
function lesson3Body() {
  return `<section class="unit-section" id="text-journey"><div class="unit-section-heading"><span>01 / 跟着一句话走</span><h2>模型先把文字变成可计算的表示。</h2></div><p>第一课里，模型看到“天空是…”，预测后面可能是什么。第二课里，我们知道这样的更新会在训练中反复发生。这一课再往前追一步：<strong>“天空是”怎样进入模型？</strong></p><p>人能直接读文字，网络计算需要数字。常见的入口分成三步：先切成 token，给每个 token 找到词表编号，再根据编号取出一行向量。下面的图只画入口，后面还有许多模型层。</p><figure class="text-pipeline"><div><span>原文</span><strong>天空是蓝色。</strong></div><b aria-hidden="true">→</b><div><span>切分</span><strong>天空 / 是 / 蓝色 / 。</strong></div><b aria-hidden="true">→</b><div><span>查词表</span><strong>一串整数 ID</strong></div><b aria-hidden="true">→</b><div><span>查 embedding 表</span><strong>一串向量</strong></div><figcaption>这是教学切分。真实 tokenizer 的结果取决于它的词表与算法。</figcaption></figure></section>
  <section class="unit-section" id="token-workbench"><div class="unit-section-heading"><span>02 / 自己拆、自己查</span><h2>一个 token，不一定是一个字或一个词。</h2></div><p>Token 是 tokenizer 切出来的单元，可能对应词、词的一部分、标点或字节片段。为了把这件事看清，下面用两条透明的教学规则处理同一句话。<strong>先换切分方式，再点一个 token，最后拖动重复次数。</strong></p>${tokenLab()}<p>这里两条规则共用一个小词表，便于观察“切分方式变了，长度就可能变”。真实分词器常使用 BPE、Unigram 等方法；这个演示不是它们的实现，也不能用来计算任何真实模型的 token 费用。</p></section>
  <section class="unit-section" id="id-and-vector"><div class="unit-section-heading"><span>03 / 拆开两种数字</span><h2>编号负责找到那一行，向量参与后续计算。</h2></div><div class="concept-pair"><article><span class="concept-number">ID</span><h3>像书架上的索引号</h3><p>它告诉程序“取表里的哪一行”。编号较大不意味着更重要；两个编号相邻，也不说明它们的意思接近。</p></article><article><span class="concept-number">[ · · · ]</span><h3>一组可调整的数</h3><p>这一行数字叫 embedding 向量。训练可以调整这些数，让它们更适合后续计算。演示只用了 3 维，真实模型的维度由设计决定。</p></article></div><p>把词表和 embedding 表想成一个配套系统：token 找到 ID，ID 找到一行数。如果更换词表却不处理模型里对应的关系，原来的编号可能就指向了错误的向量。因此，模型与 tokenizer 需要匹配使用。</p><div class="unit-callout"><strong>不要给每个坐标硬贴一个意思。</strong><p>向量可以帮助模型表达和组合信息，但通常不能把某一维直接叫作“聪明程度”或“蓝色程度”。上方色条只展示数字的正负和大小。</p></div></section>
  <section class="unit-section worked-example" id="context-example"><div class="unit-section-heading"><span>04 / 查表之后，还没有结束</span><h2>同一个“苹果”，为什么能出现在不同语境？</h2></div><p>假设两个句子都把“苹果”切成同一个 token，那么它们查到的初始 embedding 相同。接下来，模型还会处理位置信息与上下文，让每个位置的表示随句子而变化。</p><div class="context-branches"><div><p>我吃了一个 <strong>苹果</strong>。</p><span>同一个 token 的初始向量</span><b>↓ 结合当前上下文</b><p>这里可能在谈水果。</p></div><div><p><strong>苹果</strong> 发布了新电脑。</p><span>同一个 token 的初始向量</span><b>↓ 结合当前上下文</b><p>这里可能在谈公司。</p></div></div><p>这并不保证模型每次都理解正确，但解释了为什么“查到同一行向量”不等于“最终表示永远一样”。后续的 Transformer 课程会继续拆开这个过程。</p><p class="visual-footnote">此例假设“苹果”是单个 token；具体模型的切分可能不同。</p></section>
  <section class="unit-section" id="three-counts"><div class="unit-section-heading"><span>05 / 分清三个数量</span><h2>文字有多长、模型有多大、计算有多贵。</h2></div><div class="quantity-cards"><article><strong>Token 数</strong><p>这段输入有多少个处理单元？由文本和 tokenizer 决定。</p></article><article><strong>参数量</strong><p>模型里有多少个可调整的数？固定模型不会因为多读一句话而长出新参数。</p></article><article><strong>计算与内存</strong><p>处理这些位置要做多少工作、保留多少状态？输入长度会影响它们。</p></article></div><p>回看滑块：输入重复三遍，取出的向量更多，但词表没有增加条目。真实 Transformer 还会在位置之间进行计算，所以不能用“输入翻倍”直接断言整个模型的时间或显存恰好翻倍。</p></section>
  <section class="unit-section lesson-check" id="unit-check"><div class="unit-section-heading"><span>06 / 检查你的解释</span><h2>现在，你能解释这些数字了吗？</h2></div>${unitQuestion('3-id')}${unitQuestion('3-repeat')}${unitQuestion('3-context')}<details class="answer-explanation"><summary>用一句话串起输入路径</summary><p>文字经 tokenizer 切成 token，再映射为 ID；ID 用来查 embedding 表，取出的向量与位置信息一起进入后续模型计算。输入长度、参数数量和计算开销是不同的量。</p></details></section>`;
}
function unitLesson(id) {
  const second=id===2;
  const links=second?[['https://arxiv.org/abs/2203.02155','InstructGPT：示范训练与反馈训练的一种公开方法'],['https://github.com/marin-community/marin','Marin：公开训练与评测实践']]:[['https://huggingface.co/docs/transformers/tokenizer_summary','Hugging Face：分词方法与词表'],['https://arxiv.org/abs/1706.03762','Attention Is All You Need：embedding、位置与上下文计算']];
  return `<main class="container"><div class="reader-grid">${readerSidebar(id)}<article class="unit-lesson self-contained-lesson"><div class="eyebrow">单元 1 · 先理解，模型到底在学什么 / 第 ${id} 课</div><h1 class="lesson-title">${second?'从一次“学习”，<br>到一个可以使用的模型。':'一句话，怎样变成<br>模型能计算的数字？'}</h1><p class="lesson-lead">${second?'跟着一个代码解释助手，走过数据、训练、评测与发布。看清每个阶段在改变什么，也分清训练和日常使用。':'从“天空是蓝色”开始，亲手切开文字、查找编号、观察向量。把 token、参数和输入长度这几个容易混淆的概念分开。'}</p><div class="unit-meta"><span>约 ${second?'12–15':'15–18'} 分钟 · 估计</span><span>图解 + 动手探索 + 理解检查</span></div>${unitJourney(id)}<div class="unit-objectives"><strong>这一课，你会解释</strong><ul>${(second?['预训练、SFT、RL 各自从什么信号学习。','为什么评测贯穿流程，推理通常不更新参数。']:['同一句话为什么可以得到不同数量的 token。','编号、向量、参数量与输入长度有什么关系。']).map(t=>`<li>${t}</li>`).join('')}</ul></div><div class="lesson-explanation">${second?lesson2Body():lesson3Body()}</div><section class="unit-recap"><span class="eyebrow">${second?'把这一课带走':'第一单元 · 把三课连起来'}</span><h2>${second?'训练改变模型，评测指导下一步。':'输入 → 预测 → 比较 → 调整'}</h2><p>${second?'你已经把第一课的更新循环放回整个项目。接下来，把镜头转向输入：那些训练材料是怎样变成数字的？':'第三课解释输入怎样变成 token 与向量；第一课解释怎样根据误差更新参数；第二课解释这些更新在整个开发流程中的位置。现在你可以从材料、计算和流程三个角度理解“模型在学什么”。'}</p><p>${second?'下一课：亲手把一句话拆成模型的输入。':'下一单元：从模型的入口，追溯训练材料怎样收集、整理和分配。'}</p></section>${coursePager(id)}<div class="lesson-supplements"><h2>继续深入（选读）</h2><details class="optional-reading"><summary>本课依据与演示边界</summary><p>本站原创图解与教学例子，用于解释一般原理。模拟数字、回答与向量不是公开模型的测量结果。下列来源支持对应概念，不能视为本站演示的实验验证。</p>${links.map(([url,title])=>`<a class="source-link" href="${url}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`).join('')}</details>${samePageMaterials(id)}</div></article></div></main>`;
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.lifeStage!==undefined||button.dataset.lifeStep!==undefined) {
    unitState.stage=button.dataset.lifeStage!==undefined?Number(button.dataset.lifeStage):Math.max(0,Math.min(5,unitState.stage+Number(button.dataset.lifeStep)));
    document.querySelectorAll('[data-life-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.lifeStage)===unitState.stage)));
    $('#lifecycle-scene').innerHTML=lifecycleScene(unitState.stage);$('#life-position').textContent=`${unitState.stage+1} / 6`;
    document.querySelectorAll('[data-life-step]').forEach(b=>b.disabled=Number(b.dataset.lifeStep)<0?unitState.stage===0:unitState.stage===5);
  } else if(button.dataset.modelMode) {
    unitState.mode=button.dataset.modelMode;
    document.querySelectorAll('[data-model-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modelMode===unitState.mode)));
    $('#training-mode').innerHTML=trainingModeView(unitState.mode);
  } else if(button.dataset.tokenPos!==undefined) {
    unitState.selected=Number(button.dataset.tokenPos);$('#token-lookup').innerHTML=tokenLookup();
    document.querySelector(`[data-token-pos="${unitState.selected}"]`)?.focus({preventScroll:true});
  } else if(button.dataset.unitChoice!==undefined) {
    const root=button.closest('[data-unit-question]'),key=root.dataset.unitQuestion,q=unitQuestions[key],choice=Number(button.dataset.unitChoice);
    unitState.answers[key]=choice;
    root.querySelectorAll('[data-unit-choice]').forEach(b=>{const selected=Number(b.dataset.unitChoice)===choice;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('is-right',selected&&choice===q.correct);b.classList.toggle('is-wrong',selected&&choice!==q.correct)});
    root.querySelector('.unit-feedback').textContent=q.explanations[choice];
  }
});
function refreshTokenLab() {
  $('#token-lookup').innerHTML=tokenLookup();$('#token-metrics').innerHTML=lengthExperiment();$('#repeat-value').textContent=`${unitState.repeat} 遍`;
}
document.addEventListener('change',event=>{
  if(event.target.id==='toy-sentence'){unitState.sentence=Number(event.target.value);unitState.selected=0;refreshTokenLab()}
  if(event.target.id==='toy-split'){unitState.split=event.target.value;unitState.selected=0;refreshTokenLab()}
});
document.addEventListener('input',event=>{if(event.target.id==='toy-repeat'){unitState.repeat=Number(event.target.value);refreshTokenLab()}});
