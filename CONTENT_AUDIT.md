# 内容与阅读结构审查 · 2026-09-22

结论：抽查的一手记录支持 Marin Hero 的主要配置、几次 production handoff 及文中对实验与最终能力的区分；同时发现概念表述、过时状态、比较口径和引用质量问题，已校订。不能据本轮检查宣称全站没有 hallucination。

## 范围与方法

- 检查整个原型的页面结构、18 个学习主题与 38 章的映射、83 条历史记录、93 个记录来源与 131 个总引用条目。
- 对教材做概念与内部一致性审查，针对高风险部署、性能和能力结论核对一手来源；不等于逐句独立验证全部材料。
- 请求 25 个既有引用地址，另读 Marin 主 issue、MiMo 官方说明、OSI 定义与 ST-MoE 正文。HTTP 200 不当作事实通过：M100 仅返回应用外壳，M30 是搜索结果页。
- 对 GitHub 精确评论使用公开 API，避免只读取 issue 正文而漏掉证据所在的评论。
- 未重跑训练、未访问受限内部报告、未把机器人评论自动当成独立实验复现。
- 本次没有建立 CodeGraph 索引；其工具报告项目未加载，目录也没有 `.codegraph/`。已询问是否初始化；在未得到答复前，通过文件检查完成工作。

请求地址、状态、源记录更新时间及所读文本的 SHA-256 保存在 [来源访问清单](audit/source-access-2026-09-22.json)。此清单只记录访问，不是 25 个来源全部通过的认证。

## 已修正

| 位置 | 原问题 | 处理 |
| --- | --- | --- |
| 第 1 章 | 把能看到部分代码等同于 open source | 按权重、代码、数据信息、许可与使用自由分项说明；补充 OSI 定义 |
| 第 10 章 | logits 整体平移被直接联系到梯度放大 | 明确 softmax 与 CE 对 logits 的梯度 p−y 对共同平移不变；单独说明有限精度与 z-loss |
| 第 15 章标题 | “回答 100% 风险”暗示小实验能消除所有风险 | 改为用约 1% 预算提前检查规模风险 |
| 第 20 章及相关历史记录 | 174.43 与 68.54 秒/update 没有交代 batch 差异 | 补充 batch 384 / 96、tokens/update 相差四倍、helper versions 不同 |
| 第 22 章 | 消融“必须减一项”过于绝对 | 改为隔离 feature 的影响，保留逐项移除作为一种方法 |
| 第 27 章 | slowdown 百分比的分母含混 | 10.17→84.02 秒：时长约 8.26 倍（+726%），吞吐约 −87.9% |
| 第 29 章 | DCGM 精确流量降幅仅引用 PR 搜索页 | 撤下数字，保留待复核说明；没有把“未取得证据”写成“已证伪” |
| 第 32 章 | 9 月 2 日回滚被写成“当前已回滚”，与后续再部署冲突 | 分开标明早期 trial 回滚与后来的 production gate |
| 第 32 章 | 短 replay 未 hang 被称为排除确定性触发 | 改为在有限窗口未复现，不能排除所有条件 |
| 首页、目录和 metadata | “18 节可视化课程”与完成度不符 | 明示 1 节互动课 + 17 节导读，SFT / RL 待扩充 |
| 第一课分镜 | “微调参数”容易与 SFT 的 fine-tuning 混淆 | 改为“调整参数” |

教材 HTML 数据与可下载 Markdown 同步校订，快照日期不变；下载文件明确标注“校订版”。历史记录的原始状态标签保留，并另列本次核查边界。

## 重点对照结果

1. **主要配置有原文支持。** [M4 job summary](https://github.com/marin-community/marin/issues/8435#issuecomment-5335872267) 记载 535.3B / 22.76B、384 routed experts / top-8 / 2 shared、18T run config，以及 11 racks × 64 active GPUs。18.75T reference mixture 与 18T run horizon 的语义区分应保留。不能用 11×72 推翻原文明确选择的 active topology。
2. **部署与收益分开。** [Mixture handoff M93](https://github.com/marin-community/marin/issues/8506#issuecomment-5684891157)、[PDL-off gate M96](https://github.com/marin-community/marin/issues/8506#issuecomment-5690222518)、[clean-main gate M99](https://github.com/marin-community/marin/issues/8506#issuecomment-5734989379) 明确记录实际运行与有限窗口的健康信号。原文没有证明长期稳定性或 PDL 就是 hang 根因。
3. **GC 不能从 merge 推导 deployment。** [M113](https://github.com/marin-community/marin/pull/9266) 可核对已合并及 410-update validation；[M112 standup](https://github.com/marin-community/marin/issues/9324) 的部署是计划表达。本轮检查未据此升级 live-run 状态。
4. **65K H100 只是系统实验。** [M105](https://github.com/marin-community/marin/issues/9277) 明确写 fresh initialization、synthetic data、十步，并给出不同 batch 与计时边界。教材保留该限制并补全比较口径。
5. **故障归因撤回真实存在。** [M76](https://github.com/marin-community/marin/issues/8934#issuecomment-5625217090) 明确撤回过强 fabric-fault 归因。应保留反例和纠正，不能把它重新压缩成单一根因故事。
6. **小规模结果没有被证实为大模型收益。** [M81](https://github.com/marin-community/marin/issues/9110) 的最终配对结果与单 seed 限制、[M114](https://github.com/marin-community/marin/issues/9317) 的 residual-width 推导收益，支持正文的受限解释。
7. **预测不是最终实测。** [M61 固定报告](https://storage.googleapis.com/marin-public/held/hero-open-weight-ppl/2026.09.05.1/index.html) 将 Hero forecast 与其他模型测量值分开。核对到 0.7406 forecast、Kimi K2 0.6754、DeepSeek V4 Pro 0.6759 / 0.4491；未把它们写成 Hero 最终排名。此核对不覆盖报告所有历史 checkpoint 数值。
8. **Marin 32B 的经验链有依据。** [M22 官方复盘](https://marin.readthedocs.io/en/latest/reports/marin-32b-retro/) 支持 instability、QK-Norm backbone 切换、污染与 shuffle 问题的叙述。
9. **性能算术可复核。** [M16 PR](https://github.com/marin-community/marin/pull/8663) 给出的 10.17 与 84.02 秒支持校订后的时长和吞吐变化。
10. **MiMo 的案例定位有官方资料支持。** [MiMo-V2.6 官方说明](https://mimo.mi.com/docs/en-US/news/latest/v2-6) 确实讨论公开 RL 过程。未验证它的全部厂商 benchmark、成本或领先性宣传，也没有将其配置套用到 MiMo-7B 或 Marin。

概念校订另参考 [OSI Open Source AI Definition 1.0](https://opensource.org/ai/open-source-ai-definition) 与 [ST-MoE 关于 z-loss 的讨论](https://arxiv.org/html/2202.08906v1)。softmax 的平移不变性还用直接数值计算检查。

## 待复核与已知缺口

- **M100 动态指标：**本次只取得 W&B 页面外壳，没有取得 step 139,999、loss 1.2145、MFU 24.43% 与 step 137,999 evaluation 的数据行。它们继续作为历史整理值展示，并在章节和相关记录旁提示待复核，不能声称本轮已核实。
- **M30：**尚未定位精确 PR。只有搜索页无法支持精确流量改进数字，数字已撤下。
- **覆盖率：**83 条记录的 source ID 均可解析，不代表每条历史事件已完成语义复核；其余数字、引用与因果结论需要逐条审查。不存在可据此计算的“hallucination 率”。
- **教材插图：**11 个图像文件未随原资料导入；仍用缺失提示，不补造图。
- **教学完成度：**17 节导读缺少完整专属互动；SFT / RL 教学尤其需要独立补充。此次改善阅读架构，没有把结构预览包装成完整课程。
- **时间线关联：**课程推荐仍基于关键词规则，只是阅读提示，不是经过人工逐条审定的教学标签。

## 阅读架构改动

首页说明项目用途、适合人群与学习结果，然后展示推荐顺序、六个单元和三种内容的关系。主导航固定为：首页 / 学习目录 / 项目案例 / 训练记录 / 教材全文。补充资源与来源核查仍能直接访问。

课程和章节保留当前位置、完整目录、上一页 / 下一页；从课程打开章节时将 `from` 写入地址，所以直接分享或刷新仍有回到原课的入口。手机目录默认收起。

站内导航改用真正的 history entries，返回时恢复页面和滚动位置。时间线把筛选条件写入 URL，并保存浏览器历史中的分页数量；刷新、后退、前进均能恢复合理状态。无效章节 / 课程有明确回目录入口。普通修饰键打开新标签页不被站内导航劫持。

原型 A/B/C 切换器及全局左右键切换仅在 `layouts=1` 时启用，避免读者因按方向键突然回到另一个首页。默认使用新的统一首页。

## 验证

- `npm run verify`：38 章、18 主题、83 记录、131 引用映射与事件 ID 唯一性；38 个章节生成；性能算术；真实导航函数的 history、滚动位置、筛选恢复及无效路由。
- 实际浏览器：主页 → 第 12 课 → 第 25 章 → 后退 → 对应时间线；搜索及状态筛选 → 离开 → 后退 → 刷新，筛选均恢复。
- 第一课：学习率 1.20 时显示约 98% 目标概率、0.02 loss；正确答案仍返回正确解释。
- 手机 390×844：首页与课程页检查无横向溢出。其他页面的补充检查见 `prototype/QA.md`。

本轮只修改并验证本地原型；没有发布或部署线上网站。


## 阅读路径修订 · 2026-09-22（用户反馈后）

上一轮将学习目录与教材全文并列，后 17 课仍以提纲和链接为主，未解决顺序学习的问题。现改为一个学习目录：6 个单元、18 课。第 2–18 课补充了入门讲解、示例、理解题与答案解释；技术材料在各课下方原地展开，位于下一课导航之后。主导航删除教材全文入口，旧章节地址继续兼容。

新增正文是入门教学，并非完整专属互动或训练实作。示例明确区分教学假设与真实记录；第 18 课使用已核查的 M105 边界练习。SFT / RL 的一般方法参考 [InstructGPT](https://arxiv.org/abs/2203.02155)，没有补写 Marin 未公开的实施结果。以上教学修订不扩大前述历史训练记录的事实核查范围。
