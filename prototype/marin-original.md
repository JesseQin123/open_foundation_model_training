---
title: "Marin 535B-A23B：一次公开前沿大模型训练的全景教程"
subtitle: "从数据、架构、扩展律、MoE 系统到故障恢复与后训练"
author: "中文学习版 · 基于 Marin 官方公开资料整理"
date: "版本 v0.2 · 信息快照截至 2026-09-22"
lang: zh-CN
---

# 版本声明、事实边界与使用方式

> 编辑校订：2026-09-22。已修正概念、过时措辞和部分比较口径；本文件是校订后的教材。原历史快照日期不变。核查范围与待核实项见本站「来源与核查」，不代表所有历史数字已重新验证。

这不是一篇“模型发布新闻”，而是一份**随着真实训练持续演进的活教程**。Marin 535B-A23B Hero Run 仍在进行中，因此本文必须同时处理已经发生的事实、尚未执行的计划、隔离实验、模型推断与教学性解释。为避免把预测或计划写成结果，本文采用五种标签：

- **已确认**：可以在 Marin 官方 GitHub issue、PR、代码、W&B 或官方报告中直接核验。
- **计划中**：团队公开提出，但尚未确认进入主训练。
- **实验中**：已在较小模型、单 rack 或分支上运行，尚不能等同于 Hero production 状态。
- **推断**：由公开测量、拟合或换算得到的预测；它依赖假设，不能当作最终实测结果。
- **作者解释**：为了教学而做的类比、推导或判断，不代表 Marin 团队的官方结论。

> **重要限制**
>
> 1. 本版快照截至 2026 年 9 月 22 日。之后的 step、loss、eval、data mix、长上下文方案与 post-training 可能改变。
> 2. W&B 是动态系统；本文优先引用可稳定复核的 GitHub issue、PR 与固定配置。无法稳定导出的实时曲线，不被转写成未经核验的数字。
> 3. Hero 的最终能力尚未产生，不能据此断言它会优于某个现有 open-weight 模型。
> 4. 部分 PR 会引用 Iris、Echo 或内部运行页面。若这些页面对外不可访问，本文只使用公开 PR 中已经写明的实验结果。

## 推荐的三种阅读路径

**路径 A：大学生第一次系统理解 LLM 训练。**先读第 1–11 章，建立 Transformer、MoE、数据、优化器、并行训练与 checkpoint 的基础，再读第 12–20 章看 Hero 的完整设计。

**路径 B：有深度学习基础，想进入 foundation-model training。**从第 12 章开始，重点读 scaling ladder、data mixture、expert parallelism、MFU、故障恢复和 observability；之后完成第 35–36 章的实验。

**路径 C：分布式系统或基础设施工程师。**优先读第 16–18 章和第 25–31 章。你会看到 host memory、all-to-all、object storage、gang scheduling、telemetry 与 checkpoint consistency 如何直接决定模型能不能训练完。

![Marin 535B-A23B 的端到端生命周期](marin_tutorial_assets/01_lifecycle.png)

## 30 秒全局认识

Marin 正在从零训练一个大型稀疏 Mixture-of-Experts 模型：总参数约 **535.3B**，每个 token 实际激活约 **22.76B** 参数；训练配置写明约 **18T tokens、390,139 steps、2.70×10²⁴ FLOPs**，在 **11 个 GB200 NVL72 rack** 上运行。模型有 384 个 routed experts，每个 token 选择 8 个，同时还有 2 个 shared experts。主训练从 4K context 开始，团队计划在后续阶段研究 8K、65K、262K 上下文扩展，并并行准备 evaluation 与 post-training。[M2][M4]

它真正罕见的地方不只是规模，而是 **open development**：数据流程、代码、配方、扩展律、PR、失败、故障恢复、修改理由与后续计划尽可能实时公开。Marin 官方明确把“失败实验也是记录的一部分”视为核心原则。[M1]

---

# 第一部分　先看懂这艘船

# 第 1 章　这到底是一个什么项目？

## 1.1 不是“训练完再发一个模型”，而是公开建模过程

大多数 open-weight 模型的公开时点在训练之后：团队发布权重、模型卡、benchmark 和一份技术报告。外部研究者能看到成品，却看不到成品是如何被制造出来的。Marin 想公开的是另一层资产：**过程知识**。

过程知识包括：为什么选择这个模型宽度；哪些 architecture feature 在小规模消融中有效；data mix 是如何生成的；学习率为何这样缩放；哪一次 OOM 是模型太大，哪一次只是 checkpoint 缓存没有释放；为什么一个更漂亮的 kernel 仍不能直接切入 production；当节点在第 27,000 step 掉线时，系统如何恢复到数学上连续的训练状态。

Marin README 将项目定义为 foundation-model 研发的研究计划、软件平台与社区，覆盖数据筛选、转换、过滤、tokenization、pretraining、post-training 和 evaluation；其核心价值是把实验与决策在发生时记录下来。[M1]

> **概念解释｜Open weights、open source 与 open development**
>
> - **Open weights**：你拿得到最终参数。
> - **Open source**：不能仅凭公开部分代码判断。应分别检查权重、代码、数据信息与许可证，以及使用、研究、修改和分享的自由；OSI Open Source AI Definition 1.0 提供一套明确标准。
> - **Fully open**：进一步开放数据、recipe、intermediate checkpoints、评测与日志。
> - **Open development**：不仅公开最终 artifacts，还公开研究进行中的假设、失败、争论、PR、事故与改动理由。
>
> Marin 的独特价值主要在最后一层。

## 1.2 “Hero Run”是什么意思

“Hero Run”可以理解为团队在一轮长期研发之后，选择一套被认为足够成熟、值得投入大规模计算资源的主训练。它不是一次普通 sweep，也不是几百 step 的性能测试。它要持续约百日，跨越 trillions of tokens，产生可用于后续 midtraining、long-context extension、evaluation 和 post-training 的核心 checkpoint。

因此 Hero Run 同时是三件事：

1. **科研实验**：验证 architecture、optimizer、data recipe 与 scaling projection。
2. **大型生产任务**：数百 GPU、对象存储、scheduler、monitoring 与 checkpoint 系统必须长期协同。
3. **公开课程**：社区可以从真实日志中观察训练团队怎样做 evidence-driven intervention。

## 1.3 当前阶段

截至本版快照，主模型仍在 **4K context pretraining**。9 月 2 日的 ragged candidate 从 step 54,000 checkpoint 分叉，完成 70 个正常 steps 后两次 hang，随后回滚到 pooled-wave。恢复后的 production run 推进到 step 58,014；团队在暂停前强制写入并验证了一个完整的 5.36 TB temporary checkpoint，再以新 run ID `hero-wd-gate-router-p02-step58k` 从该点恢复，同时启用 0.02 gate/router weight decay。[M42][M43][M44][M47][M50]

9 月 4 日第二次 11-rack ragged telemetry window 结束后，原 production lineage 从强制保存的 step-61,806 checkpoint 恢复，并沿用 `hero-wd-gate-router-p02-step58k` run ID。[M54][M55] 9 月 5 日，pooled-wave production 在完成 step 65,069 后出现 15 分钟 device-side silence，随后 rack 10 的节点首先报出 contained CUDA/NVLink hardware error。Iris 从 hourly checkpoint step 64,944 重启整个 gang，代价是回退 125 steps 与约 20 分钟。[M58][M59]

9 月 7 日 10:01Z，另一个 rack 的节点又报出 Xid 149 `NETIR_LINK_DOWN` 与 Xid 154 `Drain and Reset`，Iris 因而重新排队 176-task gang。[M62] Pooled-wave production 此后继续到 step 81,919，并在 step 81,716 强制保存 5.36 TB handoff checkpoint。团队合并 QuACK 0.6.4、single-executable sharding、Hero ragged backend 与 NCCL 2.30.7-header wheel 后，从干净的 main commit `04fb348456` 恢复该 checkpoint；新的 `hero-ragged_a2a-nccl2307-ep-step81k` run 通过 200-step gate，官方记录明确写成“the run is the hero from here”。[M64][M65][M67][M68][M69][M70]

配对 replay 测得 ragged steady-state MFU 23.11% 对 pooled-wave 21.46%、capacity overflow 7.8e-5 对 3.4e-2、peak HBM 103.6 对 136.3 GiB，mean loss offset 为 −0.00650 nats。[M69] 这些数字确认组合 candidate 在窗口内通过 gate，不能隔离每个改动的贡献。更重要的是，新的 ragged Hero 在 1,590 个正常 steps 后再次以 #8870 signature hang：attempt 0 完成 step 83,307，step 83,308 不再返回。Watchdog 终止 gang 后，Iris 从新 run 自己的 step 83,305 checkpoint 恢复，重放三个 steps，并在 21 分钟内越过原 stall step。[M71][M72]

恢复后的 attempt 1 又在 08:09Z 因 rack index 9 上的 `CUDA_ERROR_NVLINK_UNCORRECTABLE` 终止；Iris 随即启动 attempt 2。[M74] 该 replacement execution 到 9 月 14 日已推进至 step 102,898，确认 backend 切换后仍在产生 optimizer progress，也确认 NCCL header alignment 没有消除 hang。[M3][M73]

后续 source audit 在 remote GIN branch 找到两个具体 deadlock schedules，但 Hero 使用 `gin=false`，两者都不在实测路径；已执行的 LSA branch 也没有发现缺失的 local CTA synchronization。另一方面，`s9jvxs64` GPU 0 link 14 的手工预警确实比同一 link 的 Xid 149 早五天，节点随后通过 L12 qualification 并返回 production。官方关闭记录同时撤回了“fabric faults 是 #8870 leading explanation”的早期说法：**局部硬件预测成立，不等于整条 hang 因果故事成立**。[M75][M76][M77]

Issue #8827 还公开了一条 step-78,000 checkpoint 的低温 prompt completion。它正确算出三角数问题的答案 day 14，却在之后约 35 次重复核验同一结论，直到 4,096-token context limit，且没有输出要求的 boxed answer。[M66] 这是一条有用的质性 failure-mode probe，不是能力 benchmark。

9 月 15 日，团队从 permanent step-108,000 checkpoint 启动 `hero-mix-996f4891-step108k`：model、optimizer、data components 与 pre-switch weights 和旧 run 一致，phase weights 与 PR #9162 一致；step 108,004 已产生正常 loss、MFU 与 overflow 指标。这是把 mixture 从“计划”升级为“已部署”的 production evidence。[M93][M94] 9 月 16 日，另一次从 step 108,778 开始的 PDL-off + validated-wheel handoff 通过 194 个 paired steps，MFU 从 23.03% 升至 23.62%，tokens/s 提升 2.6%，随后越过 2,052 steps 未 hang。[M96][M97][M98] 这证明组合 candidate 上线，不证明 PDL 是 #8870 根因。

9 月 18 日，`hero-main-step121638` 从一份经过 object count、bytes 与 completion-metadata 顺序核验的 4.291 TB checkpoint 恢复。200 个 paired updates 的 mean loss delta 为 +0.000306、max absolute delta 为 0.000820，排除 checkpoint 后 duration 变化 +0.10%，177 个 tasks 均保持 attempt 0；官方记录明确把该 child 指定为 production Hero。[M99] 到 9 月 22 日，公开 W&B 已推进至 step 139,999，最新 point 约为 instantaneous train loss 1.2145、instantaneous MFU 24.43%、16.07 秒/step；最近一条 sampled evaluation row 位于 step 137,999，Paloma macro BPB 为 0.79771、UncheatableEval macro BPB 为 0.51879。[M100]

这些仍是动态实测信号，会继续被覆盖；固定公开评测报告仍只把 Hero checkpoint 明确钉在 step 45,837，其两项分别为 0.8188 与 0.5362。[M35][M61] 因此引用时必须注明“live W&B”还是“固定报告”，不能把 step 137,999 误写成新的永久评测报告。

另一方面，9 月 20 日的固定 completion 报告已保存 checkpoint 102,000 与 108,000 的 prompt completions，并附 checkpoint URI、step、timestamp、source revision、tokenizer revision 与 sampling settings。[M110] 这提高了质性样本的可复核性，却不会把 prompt sample 变成 benchmark：它能展示具体成功或失败模式，不能单独估计模型总体能力。

Hero 的 ragged、mixture、PDL-off 与 clean-main handoff 现在都有独立的 launch/gate 证据，可以标为已确认。[M68][M69][M93][M96][M99] 仍未确认发生的事项包括：主 run 开始 8K/65K/262K 扩展与进入 post-training。新的 192-H100、535B-shape 65K run 只是 fresh-init synthetic-data side experiment，不能改变这条事实边界。[M105]

## 1.4 为什么它值得作为一门课程

普通课程通常把知识拆成独立章节：Transformer、scaling law、MoE、distributed training、data curation、RL。Hero Run 则把这些概念放回同一个因果系统：

- context 变长会减少一个 batch 中的独立 sequence 数；
- sequence 数减少会加剧 expert routing skew；
- skew 会增加 capacity clipping 与 token drop；
- 为降低 drop，需要更好的 all-to-all transport；
- 新 transport 又可能需要升级 JAX/XLA；
- runtime 升级会暴露 sharding compatibility 问题；
- production 切换还要保证旧 checkpoint 的 FP32 master weights 没被静默丢弃。

只有在真实训练中，你才会看到这些概念不是孤立名词，而是一条连续的工程因果链。

# 第 2 章　读懂 535B-A23B：总参数、激活参数与计算量

## 2.1 参数规模的两种数字

Marin 的模型写作 **535B-A23B**：

- **535.3B total parameters**：模型中所有 experts、attention、embedding、shared experts 等参数的总和。
- **22.76B active parameters**：处理一个 token 时实际参与前向与反向计算的近似参数量。

这两个数字同时重要。总参数更像“组织拥有多少长期容量”；激活参数更像“每次请求要动用多少计算部门”。

![Dense 与 MoE 的区别](marin_tutorial_assets/02_dense_vs_moe.png)

## 2.2 为什么不能说它“只是一个 23B 模型”

如果只看单 token 的矩阵计算量，A23B 确实更接近 20–30B dense model，而不是 535B dense model。但它仍然必须承担 535B 级别的：

- 参数存储与 checkpoint；
- optimizer state 或 master parameter 管理；
- experts 的分片与加载；
- token 在设备之间的路由；
- expert load balancing；
- all-to-all 网络通信；
- 恢复时的 distributed state consistency。

更关键的是，不同 token 可以调用不同 experts。模型可以在较低 active compute 下获得更大的条件化容量。因此“总容量”和“每次计算成本”被解耦了。

> **概念解释｜稀疏激活不是稀疏权重**
>
> MoE 中大量参数是真实、可训练的 dense matrix，只是对某个 token 不一定被调用。“稀疏”指计算路径的选择，而不是所有矩阵都存成稀疏格式。

## 2.3 Token、sequence、batch 与 step

一个 **token** 是 tokenizer 产生的离散单元；一个 **sequence** 是连续的一段 token；一个 **batch** 是一个 step 同时处理的多个 sequence；一个 **optimizer step** 在 forward、backward 和跨设备梯度同步之后更新一次参数。

Hero 的配置是：sequence length 4096，global batch 11,264 sequences。因此一个 nominal step 处理的 token 约为：

**每 step token：Batch_seq × SeqLen = 11,264 × 4,096 ≈ 46.14 million tokens。**

再乘以约 390,139 steps，会得到接近 18T 的 token horizon。真实系统还会涉及 packed document、drop、evaluation step 与 restart，但这个公式足以建立量级感。

## 2.4 FLOPs 为什么比参数量更接近“训练花了多少钱”

训练成本大致由参数参与计算的次数、token 数、上下文 attention 开销和 optimizer 等共同决定。Marin 给出的 analytic training budget 约为 **2.70×10²⁴ FLOPs**，包含 forward 与 backward，并对 LatentMoE 的实际宽度做了修正。[M4]

参数量告诉你模型有多大，FLOPs 告诉你“为了把它训练到这个 token horizon，大约做了多少数学运算”。但 FLOPs 仍不等于 wall-clock 成本，因为系统可能在 checkpoint、restore、编译、通信等待或故障中消耗时间。

# 第 3 章　从原始文本到可训练模型：完整生命周期

## 3.1 数据阶段

训练不从 `model.train()` 开始，而从数据治理开始：采集、多源规范化、内容识别、质量打分、去重、污染检测、分桶、tokenization、数据顺序与 mixture。任何一个环节都可能改变最终能力。

例如，Marin 32B 的 cooldown 曾因缓存中的数据包含 GSM8K test 项而发生 contamination；另一轮训练出现 train loss 相位变化、validation 基本不变，最终指向 shuffle path 而非模型数值不稳定。[M22] 这说明“loss 变了”并不自动等于“模型炸了”。

## 3.2 配方阶段

团队要把 compute budget 映射为：模型宽度、层数、expert 数、batch、token horizon、学习率、warmup、decay、optimizer 参数与 data mixture。这一步使用 scaling law、small-scale sweep 与 feature ablation。

## 3.3 主训练阶段

主训练是重复执行：

1. 从数据流取 batch；
2. 前向计算 logits；
3. 计算 cross-entropy 与辅助 loss；
4. 反向传播；
5. 跨设备同步；
6. optimizer 更新；
7. 记录指标；
8. 周期性 evaluation 与 checkpoint。

在单机教程中，这 8 步也存在；在 704-GPU Hero 中，每一步都变成 distributed protocol。

## 3.4 Midtraining、长上下文与 post-training

**Pretraining** 主要通过 next-token prediction 获得通用语言、知识和模式能力。**Midtraining/cooldown** 通常在后期改变数据构成、学习率或任务分布，让模型更集中学习高价值领域或为后训练准备。**Long-context extension** 改变模型能够稳定处理的序列长度。**Post-training** 则通过 SFT、preference optimization、RL 或 agent trajectories，把 base model 变成更可控、更会推理和使用工具的系统。

Hero 的公开计划包含这些阶段，但截至快照，只有 4K pretraining 是主模型的已确认当前状态。

# 第 4 章　如何读一份大型训练报告：事实、指标与因果

## 4.1 同一项目里会同时存在三个“真相”

大型项目常见：

- **Voyage plan**：对外宣布的整体预算或阶段划分；
- **Pinned config**：真正提交给 scheduler 的当前配置；
- **Actual run state**：运行中已经处理的 step、token、故障和 intervention。

Marin 对外讨论过 18.75T reference recipe，而 Hero job summary 写的是 18.0T run config；Harrier 数据函数又保留 15T pretrain + 3.75T cooldown 的两阶段 reference budget。[M4] 正确做法不是挑一个数字宣布“另一个错了”，而是记录其语义。

## 4.2 相关不等于因果

假设 loss spike 与 checkpoint 在同一时间出现。它可能是：

- checkpoint 导致该 step throughput 降低，但 loss 本身无异常；
- checkpoint 后恢复了错误 state；
- 恰好在同一时间出现模型数值问题；
- dashboard 抽样造成视觉重合。

因此训练诊断依赖 matched control、日志、rank 分布、复现实验和故障域定位，而不是只看一张图。

## 4.3 本教程的证据纪律

每一个重要结论都尽量追溯到官方 issue、PR、代码、W&B 或报告。若某项来自作者推断，会明确说明支持它的证据是什么。学习 frontier training 的第一课不是记术语，而是学会保持这种 evidence boundary。

---

# 第二部分　大学生必须掌握的核心概念

# 第 5 章　Transformer 与 next-token prediction

## 5.1 语言模型究竟在优化什么

给定 token 序列 x₁, x₂, …, x_T，自回归语言模型学习：

**联合概率：p(x₁, …, x_T) = ∏(t=1…T) p(x_t | x_<t)。**

训练时，模型在每个位置预测下一个 token。标准损失是 cross-entropy：

**L_CE = −(1/T) × Σ_t log p_θ(x_t | x_<t)。**

这个目标看似简单，却迫使模型压缩语法、事实、风格、代码规律、推理轨迹与世界结构。Transformer 的核心贡献是使用 self-attention 让每个位置根据上下文动态聚合信息，并能够在 GPU 上高度并行。[P1]

## 5.2 一个 decoder block 的最小结构

现代 decoder-only LLM 的 block 通常包含：

1. normalization；
2. causal self-attention；
3. residual connection；
4. normalization；
5. FFN 或 MoE-FFN；
6. residual connection。

Hero 的每个 block 不是普通 dense FFN，而是 routed `MoEMLP`，并行叠加 shared experts；此外还加入 GatedNorm、ShortConv、XSA 等实验性结构。[M4]

## 5.3 Embedding 与 LM head

输入 token id 先映射到 hidden vector；最后的 hidden state 经 LM head 投影到 128,256 维 vocabulary logits。Hero 的 input embedding 与 output projection 不 tied；这会增加参数，但允许输入表示与输出分类器分别学习。[M4]

## 5.4 为什么训练要同时关心数学与 IO

一个矩阵乘法的 FLOPs 可能很高，但如果 GPU 大量时间在 HBM 与 SRAM 之间搬数据，或者等待跨卡 collective，理论 FLOPs 不会转化成 wall-clock throughput。FlashAttention 的核心贡献就是把 attention 写成 IO-aware tiled algorithm，减少 HBM 读写而保持精确 attention。[P5]

# 第 6 章　Mixture of Experts：容量、路由与稀疏计算

## 6.1 基本形式

一个 routed MoE 层包含 E 个专家函数 f_e(x) 和 router。Router 为 token 计算 experts 分数，选择 Top-K：

**y = Σ(e ∈ TopK(x)) w_e(x) · f_e(x)。**

Hero 使用 E = 384、K = 8，并加入 2 个对每个 token 都执行的 shared experts。[M4] Switch Transformer 等工作证明了条件计算可以在相近每-token 计算下扩张总参数，但也指出通信、训练稳定与负载均衡是主要挑战。[P6]

## 6.2 Router 不是“人工分科老师”

Experts 的专业化是训练中涌现的，而不是预先规定“Expert 17 负责数学”。Router 只根据当前 hidden state 与训练信号学习分配。某些 experts 可能形成领域偏好，也可能编码更抽象的 token/语法/阶段特征。

## 6.3 Top-K 的质量与成本权衡

K 越大，每个 token 聚合更多 expert capacity，通常计算、通信和显存更高；K 越小，路径更稀疏，但 router 的一次错误选择影响更大。Hero 从此前的 4-of-192 演进到 8-of-384，保持更高总 expert capacity，同时每个 expert 使用 half-width 与 LatentMoE 压缩。[M5]

## 6.4 Shared experts 的作用

Shared experts 类似“全员必经的公共基础部门”。当 routed path 发生 drop 或路由不稳定时，每个 token 仍能得到稳定的 dense FFN 信号。Hero 团队把 2 个 shared half-width experts 视为降低高 drop 风险的结构性 backbone。[M2]

# 第 7 章　Router 健康：负载均衡、capacity factor 与 token drop

## 7.1 为什么 experts 会拥堵

如果 router 把大量 token 发送到少数 experts，而每个 expert 的 buffer 与计算容量有限，就会出现 queue overflow。为保证每 step 的形状和计算上界可控，系统通常设置 capacity factor：允许每个 expert 接收比平均负载略多的 token，超过部分被裁剪或丢弃。

Hero 的 send/receive capacity factor 设为 1.15。[M4]

## 7.2 Token drop 的两种误解

第一种误解是“drop 2% 等于随机删除 2% 输入文本”。实际上被 drop 的通常是某些 token-expert assignment；token 可能仍有 shared expert 或其他 routed experts 的输出。

第二种误解是“只要 train loss 在降，drop 就无所谓”。高 drop 可能改变专家专业化、有效容量、梯度分布与长上下文行为。它也可能让 scaling prediction 与真实 recipe 不一致。

## 7.3 Routing entropy 与 router bias

Routing entropy 衡量分配是否过度集中；router bias 反映系统为平衡 experts 所施加的修正。Hero 记录每层 routing entropy、load-balance loss、router z-loss、sender/receiver drop fractions。[M4]

## 7.4 Quantile Balancing（QB）

Marin 的 QB routing 使用每个 expert 的 margin 分布估计一个分位数阈值，并把其作为下一 step 的 stop-gradient bias，使过热 experts 更难被选中、冷 experts 更容易获得 token。Hero 进一步使用全局 histogram 估计分位数，避免单设备 top-k 统计过于抖动。[M4][M24]

> **概念解释｜Stop-gradient bias**
>
> 这个 bias 会影响下一步的路由选择，但不会让梯度直接穿过“计算平衡阈值”的统计过程。它像外部控制器：根据上一时刻的负载调整阀门，而不是把阀门逻辑混入主模型梯度。

## 7.5 为什么长上下文会放大 drop

在固定 token batch 下，sequence length 从 4K 增加到 65K，sequence 数会显著减少。独立文档越少，路由样本的平均化效果越弱，某个 shard 可能集中遇到相似 token，导致 routing skew。Hero issue 引用此前实验：4K 到 65K 时 drop 可从约 7% 增长到约 40%。[M2]

# 第 8 章　Attention：MHA、GQA、局部/全局层与位置编码

## 8.1 Q、K、V 在做什么

Attention 先把 hidden state 投影为 Query、Key、Value：

**Attention(Q, K, V) = softmax((QKᵀ) / √d) · V。**

因果 mask 保证当前位置看不到未来 token。

## 8.2 GQA 为什么重要

Multi-Head Attention 中每个 query head 有自己的 K/V heads；Multi-Query Attention 让所有 query heads 共享一套 K/V，显著减少 KV cache；GQA 取中间方案，让一组 query heads 共享 K/V，通常接近 MHA 质量、接近 MQA 的效率。[P2]

Hero 有 48 query heads；局部层保留 12 KV heads，全局层只用 6 KV heads，从而让 full-context 层支付更低 K/V 计算成本。[M4]

## 8.3 Sliding-window 与 periodic global attention

全长 attention 的计算近似随序列长度平方增长。Hero 大约每 4 层设置一个 full-causal global layer，其余层使用 2,048 sliding window。局部层擅长短程模式；周期性全局层提供远距离信息通道。

## 8.4 RoPE、Half-RoPE 与 NoPE

RoPE 通过对 Q/K 的成对维度施加与位置相关的旋转，把相对位置信息自然编码进内积。[P3] Hero 只对 head dimension 的前一半使用 RoPE，另一半保持 rope-free；全局层进一步采用 NoPE。团队希望同时保留位置归纳偏置和不受旋转频率限制的表示通道。[M4]

## 8.5 QK-Norm 与历史教训

QK-Norm 在 attention score 前对 Q/K 归一化，限制 logits 尺度。Marin 32B 在约 70K–80K steps 出现持续 loss instability，梯度裁剪、跳过坏 step 和 optimizer swap 都未根治，最终切换到带 QK-Norm 的 backbone 后，loss 在短暂重热后恢复且 spikes 消失。[M22]

Hero 直接使用 per-head RMS QK-Norm。这个选择不是凭空出现，而是前一代大模型故障积累出的结构性经验。

# 第 9 章　RMSNorm、GatedNorm、XSA 与 ShortConv

## 9.1 RMSNorm

RMSNorm 使用向量的 root-mean-square 做尺度归一化，不执行 LayerNorm 的均值中心化；其目标是以更低开销获得 re-scaling invariance。[P4]

Hero 在 embedding、每个 attention/MLP branch 和 final readout 使用 learnable-gain RMSNorm。[M4]

## 9.2 GatedNorm

Hero 在每次 RMSNorm 后加入一个低秩可学习 gate，形式近似：

**x · σ(SiLU(xW_down)W_up)。**

gate 可以按 token 与 feature 动态控制归一化后的信息流。它不是主流标准组件，应该被视为 Marin ablation pipeline 选出的实验性结构，而非已被全行业证明的定论。[M4][M21]

## 9.3 XSA：Exclusive Self-Attention

XSA 从 attention 输出中减去与当前 value vector 平行的分量，意图减少 head 仅仅复制 V 的路径，让它学习新的组合信息。Hero 还为每个 attention head 加可学习 gate，初始整体缩放为 1。[M4]

## 9.4 ShortConv

ShortConv 是 kernel size 4 的 depthwise causal convolution，放在 K、attention branch 输出与 MoE branch 输出等位置。短卷积提供非常局部、线性复杂度的序列 mixing，作为 attention 的补充。Hero 使用 fused Pallas kernel，并在 packed documents 上做 segment mask，避免跨文档泄漏。[M4]

> **事实边界**
>
> 这些 feature 的存在是已确认事实；它们对最终 535B 模型能力的增益尚未由最终 eval 证明。正确表述是“被选入 recipe”，而不是“必然优于标准 Transformer”。

# 第 10 章　Loss、logit z-loss 与训练稳定性

## 10.1 Cross-entropy 只是总目标的一部分

主损失是 next-token cross-entropy，但大规模模型常加入辅助项控制数值尺度或 routing。Hero 在最终 vocabulary logits 的 log-sum-exp 上加入系数 1e-4 的 z-loss，并将它融合进 cross-entropy kernel。[M4]

## 10.2 为什么 logits 太大是危险信号

Softmax 对所有 logits 加同一个常数保持不变，交叉熵对 logits 的梯度 p−y 也不变，因此不能把整体平移直接解释成梯度变大。有限精度计算中的大数值仍可能引入数值问题。z-loss 惩罚 logsumexp 的平方，约束这一共同偏移方向；这不保证所有 logits 的幅度都受到相同约束。

## 10.3 Router z-loss 与 final-logit z-loss 不一样

ST-MoE 引入 router z-loss 以控制 router logits、提升 sparse expert 训练稳定性。[P10] Hero 既监控 router z-loss，又把 final vocabulary logit z-loss 加入主 loss；两者作用位置不同，不能混为一谈。[M4]

## 10.4 Scaling ladder 如何发现 z-loss 需求

Hero issue 说明，上一轮 scaling ladder 发现 gradient norm 随 token horizon 增长到 4 以上；进一步 ablation 表明，在高 batch 等条件下，没有 logit z-loss 的 run 可能中途完全 blow up。因此这一辅助项是由 scale-dependent failure 反推出来的，而不是随意装饰。[M2]

# 第 11 章　Optimizer：Adam、Muon、MuonH 与参数分组

## 11.1 Adam 的基本直觉

Adam 为每个参数维护梯度一阶与二阶移动统计，用自适应尺度更新。它在 LLM 中稳定、成熟，但 optimizer state 显存开销大，而且矩阵不同方向可能具有不理想的条件数。

## 11.2 Muon 的核心直觉

Muon 对矩阵梯度/动量做近似正交化，使更新在谱方向上更均衡。相关工作显示，通过合适的 update scaling 与正则化，Muon 可以扩展到大型 MoE，并在一些 scaling experiments 中获得比 AdamW 更高的 compute efficiency。[P9]

## 11.3 Hero 的三类 optimizer group

Hero 不是“所有参数都用 Muon”：

- **MuonH**：attention、expert MLP、shared expert、latent projection、GatedNorm 等矩阵；
- **AdamH**：LM head readout；
- **Adam**：token embedding、router、router bias、attention gate、1-D norm gain、ShortConv 小 kernel。

`H` 版本使用 norm-preserving hyperball projection；Muon 的 Newton–Schulz 正交化在 rack 内分布执行，避免跨 DCN。[M4]

## 11.4 为什么要参数分组

矩阵权重适合利用几何结构；embedding、bias、标量 gate 与一维 norm 参数不一定适用同样的正交化。参数分组是“optimizer 与参数结构匹配”的工程化表达。

## 11.5 Parameter norm 的预期形态

Hero 早期 health check 显示 MuonH/AdamH group 的 norm 保持平坦，这是 hyperball projection 的预期信号；Adam group 自由演化。`attn_gate` 和 `router_bias` 从零开始增长属于设计内行为，而不是自动异常。[M4]

---

# 第三部分　Hero 实验的完整设计

# 第 12 章　模型规格与研究假设

![Hero 核心规格](marin_tutorial_assets/03_spec_overview.png)

## 12.1 关键配置表

| 类别 | 配置 |
|---|---|
| 总/激活参数 | 535.3B / 22.76B |
| 层数与宽度 | 48 layers，hidden 6144 |
| Attention | 48 heads × 128；local 12 KV / global 6 KV |
| MoE | 384 routed experts，Top-8，2 shared experts |
| Expert/latent width | 3072 / 3072 |
| Vocabulary | 128,256 |
| 上下文 | 4,096；sliding window 2,048；每 4 层 global |
| Batch / steps | 11,264 sequences / 390,139 steps |
| Tokens | 18.0T run config；18.75T reference two-phase mix |
| Hardware | 11× GB200 NVL72；EP64/rack；跨 rack DP |
| 计算预算 | 约 2.70×10²⁴ training FLOPs |

来源：[M2][M4]

## 12.2 这套 recipe 的核心赌注

可以把 Hero 的研究假设概括为：

1. 更高 expert sparsity 与 shared backbone 能在相近 active compute 下增加容量；
2. LatentMoE、QB routing 与更好的 transport 可以控制通信与 drop；
3. MuonH、z-loss、QK-Norm 与新的 structural features 可以提高 compute efficiency 与稳定性；
4. Harrier data mixture 与两阶段 curriculum 能把更多 FLOPs 转化成下游能力；
5. 小规模 scaling ladder 能预测 Hero 的 loss/eval trajectory，并在早期暴露 scale-only failure。

这些都不是最终结论，而是 Hero 要共同检验的 hypothesis bundle。一个大 run 很难只改变一个变量，因此团队依赖前期 ablation 与 matched side experiments 拆解因果。

## 12.3 为什么 48 层、6144 hidden、384 experts

这些数字来自 compute budget、hardware topology、expert parallel shape 和前期 iso-FLOP sweep 的共同约束。模型不是先在白板上设计好，再找机器；它是 model architecture 与 GB200 rack topology 的 co-design。

# 第 13 章　Harrier 数据系统：40×5 的可控训练空间

![Harrier 40×5 data cells](marin_tutorial_assets/06_data_grid.png)

## 13.1 为什么不直接按“网页、代码、数学”设置几个百分比

原始来源标签过粗，且同一来源内部质量差异巨大。Open Athena 的 Datakit 报告从 152 个开放数据集、18.71B raw documents 与 25.25T Llama-3 tokens 出发；Harrier 再用 embeddings/聚类把文档分到 40 个 topic clusters，并按内容类型校准为 5 个质量层级，形成 40×5=200 个 cells。Data mixture 因而可以在“内容类型 × 质量”二维空间分配 token budget。[M4][M6][M92]

## 13.2 Fuzzy deduplication

完全相同文本容易去重，但现实网页存在模板、转载、轻微改写与片段重复。Datakit 的 global deduplication 结合 MinHash/LSH 与 false-positive heuristics，最终移除 2.33B documents（12.5%）和 2.13T tokens（8.4%）。这里的 document 比例与 token 比例不同，正说明“去掉多少条记录”不能代替“去掉多少训练量”。[M5][M92]

## 13.3 Epoch exposure

如果某个小 cell 权重过高，它可能被重复抽样许多 epoch，导致记忆与过拟合。Harrier 的 recipe 计算每个 cell 在两个 phase 中的累计 exposure，并设置上限；公开配置中最大 cell exposure 约 2.1，代码校验上限不超过 8。[M4]

## 13.4 Simulated epoching

小规模 rung 不可能真的吃 18T tokens，但如果直接按短 budget 抽样，其数据重复结构与 Hero 不一致。Simulated epoching 让小 run 的 mixture/epoch structure 模拟目标预算；当实验 compute 大到一定阈值，系统改用 raw mixture，避免昂贵实验继续模拟一个更大 horizon。[M4]

## 13.5 数据污染与顺序同样重要

Marin 32B 的 contamination 和 shuffle anomaly 说明，数据质量不仅是“文档内容”，还包括 test leakage、缓存版本、sampling order 与 permutation algorithm。[M22] Datakit 当前使用 exact 13-word n-gram 匹配做 benchmark decontamination，并在现行 policy 下再移除 13.66B tokens；这能降低已知 benchmark 的直接泄漏，却不能证明所有语义近邻或未知测试集都被清除。[M92] 对大型模型而言，数据 pipeline 也是实验的一部分，必须有 artifact fingerprint、版本和 provenance。

# 第 14 章　Data mixture：把 token budget 当成优化问题

## 14.1 每个 token 成本相近，学习价值不同

一个低质量重复网页 token 与一个高质量数学推导 token，在训练 FLOPs 上可能相近，但对 generalization、reasoning、coding 与知识的边际贡献不同。因此目标不是“拥有最多 token”，而是最大化：

**单位训练 FLOP 带来的 downstream capability improvement。**

## 14.2 训练阶段与 candidate mixture

Hero data recipe 使用 pretrain phase 与 cooldown/midtraining phase。公开 reference 是 15T + 3.75T；phase 1 大约在整体 steps 的 80% 处切换。[M4]

9 月 13 日公开的 H100 mixture candidate artifact 记录了更细的三段 configured weights：0–25% 为 Harrier；25% 到约 80% 增加 command-line agent transcripts、law 与 news，并减少 general web code、finance、history/literature 与 math；最后阶段增加 natural-science research 与 classifier 最高质量 bucket，同时保留 low-level code/agents。[M90] 这些是 sampling configuration，不是 measured token counts。9 月 15 日，production handoff 进一步确认 live Hero 已从 step 108,000 加载与 PR #9162 一致的新 phase weights；未来 cooldown 权重在 step 312,192 切换。[M93][M94]

## 14.3 Bayesian optimization

PR #8633 建议把多个历史 data-mixing swarm 的 observation 合并到 Gaussian Process surrogate，在候选 mixture 中预测更有潜力的权重组合，并保存 exact artifacts 与 provenance。[M9]

> **概念解释｜为什么用 Gaussian Process**
>
> 每一次完整 data-mix 训练都昂贵，无法穷举 200 维 simplex。Gaussian Process 用已有实验拟合“mixture → eval”的不确定函数，再通过 acquisition function 选择最值得试的候选。它不是直接替代训练，而是决定下一笔实验预算花在哪里。

## 14.4 当前的 recalibration 信号

8 月 24 日 standup 表示，launch mix 相比此前 A2B run 的 mixture 看起来“每 token 学习效率更低”，团队希望在约 10% 进度附近 recalibrate。[M6] 最终 ladder 给出三个方向一致的 endpoints：d768 低 0.41%、d1024 低 0.70%，d1536 在 90,767 updates 后为 0.918442 BPB，对 original ladder 的 0.925068，低 0.72%；16 个 subsets 中 15 个改善，在 equal throughput 下对应 1.20× compute-equivalent speedup。[M84][M89][M95] D512 swarm 另估算 1.17× macro speedup，但它参与 candidate selection，不能当作独立 validation set。[M109] Wikipedia 仍退化 0.50%，d768 在 switch 前已领先，hardware、EP size 与 optimizer recipe 也不完全相同，因此这些结果加强 scale-transfer 信号，却不能给 mixture 一个无混杂的因果效应。Deployment 事实来自独立 production handoff，而不是从实验 endpoint 推导。[M93][M94]

## 14.5 Mix 变化会怎样影响 scaling projection

预注册 trajectory 假设 4K context、固定 datamix 与固定 token horizon。Hero 在 8 月 19 日已使用相对 scaling ladder 更新过的 mix，未来 context 与 mix 还可能变化。因此 scaling curve 是 counterfactual reference，不是必须逐点重合的“命运线”。[M4]

# 第 15 章　Scaling ladder：用约 1% 计算预算提前检查规模风险

![Hero scaling ladder](marin_tutorial_assets/04_scaling_ladder.png)

## 15.1 五个 rungs

| Rung | Racks | Batch | Steps | Tokens | Active params |
|---|---:|---:|---:|---:|---:|
| d768 | 1 | 1,024 | 11,420 | 48B | 61M |
| d1024 | 2 | 2,048 | 15,276 | 128B | 162M |
| d1536 | 6 | 6,144 | 15,128 | 381B | 481M |
| d2048 | 11 | 11,264 | 20,072 | 926B | 1.2B |
| d6144 Hero | 11 | 11,264 | 390,139 | 18.0T | 22.76B |

所有 rungs 保持约 791 tokens / active parameter，并尽量共享 architecture、mixture 与 epoch structure。[M4]

## 15.2 扩展律不是只预测 final loss

Marin 用 ladder 做四类工作：

- 比较新 recipe 是否优于旧 recipe；
- 预测 Hero 在每个中间 token point 的 loss/eval；
- 观察 gradient norm 与 token drop 如何随规模变化；
- 当 Hero 出现异常时，区分“规模下正常的动态”与真正偏航。

例如，小 rungs 曾显示 gradient norm 在前约 40% 持续增长，之后随 LR decay 回落。Hero 若出现相似形态，不应仅因“grad norm 变大”就仓促干预。[M2]

## 15.3 预注册的重要性

如果团队在看到 Hero 结果后才选择对自己有利的 baseline，很容易产生 hindsight bias。预先写下预测与风险点，能让后续判断更诚实。

Mixture ladder 给了一个具体例子：最终 d1536 BPB 为 0.918442，和后期冻结的 adjusted forecast 只差约 0.00023。[M95] 这说明在训练后段、固定拟合窗口后，forecast 可以成为高价值的 proceed-or-defer 输入；但单次命中不证明方法总能泛化，也不能抹掉 pre-switch separation、recipe differences 与 subset regression。

## 15.4 与 GPT-4 式 predictive scaling 的关系

Frontier labs 公开资料表明，用小规模 run 预测大 run 是行业核心方法，而非 Marin 特例。GPT-4 technical report 就强调使用远小于主训练预算的模型预测 final loss 与部分能力。[F1] Marin 的价值是把类似方法的配置、rungs 与运行讨论公开出来。

## 15.5 质量收益不等于 wall-clock 收益

Fast-track feature screen 给出了一个很清楚的反例。Attention residuals 在 d512 与 d768 都改善 loss，且没有明显吞吐代价；d768 的 throughput-adjusted speedup 达到 1.19×。Cross-layer KV 与 tied embeddings 也给出较小但方向一致的收益。[M111]

192-dimensional MLA head 的质量账面同样漂亮：d768 loss 改善 0.0153，若假设吞吐不变，对应 1.12× compute-equivalent speedup。但它离开 FA4 fast path 后，MFU 只有 1.3–1.5%，throughput-adjusted speedup 反而跌到 0.16×。因此 feature ranking 至少要同时看两列：**相同 token 预算下学得更快吗？相同 wall-clock 下跑得更快吗？** 这 26 个 d512/d768 runs 只是进入更大 ladder 的筛选证据，不是 current 535B Hero 已采用这些 feature 的 production 证据。

9 月 22 日完成的另一组 d512→d1280 data-matched screen 把这个判断推进了一步：在 MLA + Inkling MoE stack 上，2× residual width 在四个 rungs 都降低 Paloma macro loss，其 FLOP efficiency 约为 0.99–1.03×，近乎中性；但较宽矩阵把 d768 MFU 从 7.2% 提到 11.9%，报告据此推导出 1.13–1.28× wall-clock speedup。[M114] 3× width 的 MFU 更高，却因额外 FLOPs 增长更快而只有 0.84–0.92× FLOP efficiency。

这里的 wall-clock speedup 是“实测 throughput × fitted scaling law”的推导值，不是直接 matched 的 equal-quality time measurement。它说明 hardware utilization 可以让 FLOP-neutral architecture 在现实时间里更快，也提醒我们不要把推导结果写成 production Hero 已验证；当前 535B recipe、tokenizer、拓扑与训练跨度都不同。

# 第 16 章　硬件拓扑与并行策略

![Hero hardware topology](marin_tutorial_assets/05_hardware_topology.png)

## 16.1 为什么是 704 个 active ranks

Hero 使用 11 个 GB200 NVL72 rack，但 expert axis 配置为每 rack 16 nodes × 4 GPUs = 64 active GPUs，因此公开日志多次出现 704 ranks/processes。[M4][M17]

## 16.2 Data Parallel（DP）

DP 让不同 replica 处理不同 batch shard，再聚合梯度。它提高吞吐，但跨 rack 梯度同步会受到 DCN latency/bandwidth 影响。

## 16.3 Expert Parallel（EP）

EP 将不同 experts 放在不同设备。Router 选择后，token activation 必须发送到 expert 所在 GPU，计算后再返回。这导致 all-to-all，是 MoE 最关键的系统成本之一。

## 16.4 Tensor/Model sharding

超大矩阵无法完全复制到每个 GPU，需要沿 model 轴切分。Attention、LM head、embedding 与 expert weight 的 sharding 选择必须兼顾矩阵计算、collective 与 HBM。

## 16.5 为什么 Muon 正交化限制在 rack 内

Newton–Schulz 需要矩阵乘法和重分片。如果 collective 穿越 11 racks 的较慢 DCN，optimizer overhead 会显著上升。Hero 的 distributed Muon 选择 rack 内轴，避免慢链路。[M4]

# 第 17 章　MFU、tokens/s 与 GPU 为什么“看起来很忙却没在训练”

## 17.1 MFU 定义

Model FLOPs Utilization 近似是：

**MFU = 模型有效 FLOPs/秒 ÷ 硬件理论峰值 FLOPs/秒。**

MFU 的分子必须按真实 architecture 计算。若 local attention 被误当 full attention，或忽略 LatentMoE 压缩，MFU 会被高估。

## 17.2 MFU 不等于 GPU utilization

GPU utilization 只说明 kernel 在运行；kernel 可能是低效率内存操作、通信或非模型计算。MFU 尝试衡量理论 tensor compute 中有多少真正完成了模型数学。

## 17.3 Throughput 不等于项目进度

一个 run 在活跃 step 中可能有高 tokens/s，但频繁 checkpoint、eval、restart、redo steps，最终 wall-clock 仍然慢。因此 Hero dashboard后来加入 active share 与 progress efficiency。[M12][M13]

## 17.4 Kernel co-design

Hero 使用定制 FA4、fused linear-softmax cross-entropy、Pallas ShortConv、QuACK symmetric GEMM、fused expert MLP 等。每个优化都在减少 HBM traffic、避免 materialization、提高 tensor-core 使用或降低 collective。[M4]

# 第 18 章　Pooled-wave all-to-all：Hero 启动时的 MoE 运输系统

## 18.1 All-to-all 的含义

每个 sender rank 都可能给每个 receiver rank 发送不同数量 token。通用 ragged collective 需要处理动态长度与 metadata；但 JAX/XLA 对静态 shape 更友好。

## 18.2 Fixed pooled-wave 设计

Hero 启动时的 hand-rolled backend 将发送数据打包到固定 pool，分 3 个 static waves 发送，receiver 使用固定容量 buffer。Expert ID 作为 header 与 activation 同行，避免额外 metadata collective。[M4]

## 18.3 LatentMoE 为什么能减半通信

Hidden width 是 6144；token 在发给 experts 前先投影到 latent 3072，all-to-all 运输较窄 representation，返回后再投影回 hidden。这样两个方向的 transport bytes 约减半。[M4]

## 18.4 为什么仍然会 drop

静态 capacity 保证 compile-time shape 与 bounded memory，却无法容纳任意 skew。当前 pooled-wave 在真实 trained router 的 Hero-shape A/B 中约有 2.67% expert assignment drop。[M7]

# 第 19 章　Evaluation、risk points 与主训练的“体检计划”

## 19.1 Train loss 不是最终能力

Train loss 会受 data mix、重复度与 packing 影响；validation loss 更接近 generalization；downstream eval 才能回答数学、代码、知识、agent 能力。Hero 计划使用 Paloma macro loss、C4 bits-per-byte、uncheatable eval 等。[M4]

## 19.2 Dropped 与 dropless eval

训练时 transport 可能 drop，但 evaluation 可以使用 dropless backend，帮助分离：模型参数本身的能力 vs 训练 transport 对当前 forward 的影响。

## 19.3 预先定义的风险窗口

公开讨论将 warmup 结束前后视为第一风险点，关注 initialization、gradient runaway 与高 drop；约 30% 处关注 gradient norm 是否按 ladder 见顶；context extension 和 data phase 切换又是新的 distribution shift。[M2][M4]

## 19.4 最终 eval 尚未出现意味着什么

“训练正常”只说明没有明显 divergence，不等于模型已经强。最终能力必须等待相应 checkpoint、完整 evaluation 与 post-training。教程应抵制用参数规模替代结果的冲动。

## 19.5 Prompt completions 是质性 probe，不是 benchmark

固定 completion 报告把 checkpoint 102,000 与 108,000 的样本连同 checkpoint URI、step、timestamp、source revision、tokenizer revision、release 和 sampling settings 一起保存。[M110] 这些 provenance 字段让读者能回答“这个输出来自哪份权重、哪版代码与哪种采样设置”，也能在后续 checkpoint 中追踪重复、格式失败或推理策略变化。

但单条 completion 的选择、prompt 难度与 sampling randomness 都可能造成 selection bias。正确用途是提出 failure-mode 假设，再用预先定义、覆盖充分的 evaluation 验证；错误用途是挑一条漂亮样本，宣称模型整体能力已经达到某个水平。

# 第 20 章　长上下文与 post-training 路线图

## 20.1 公开计划

Hero 从 4K 开始，若早期 extension data 平滑，团队考虑约 50% 处到 8K、约 95% 处到 65K，最后做 targeted 262K phase。具体进度会依赖 EP kernel、drop 与 side experiment。[M2]

## 20.2 QK scaling

扩 context 需要调整 qk multiplier，公开 issue 提到测试类似：

**mscale = X × ln(new_length / old_length) + 1。**

并在单 rack 快速评估 X 附近的候选。[M2]

## 20.3 67B side experiment

截至 8 月 28 日，团队在一个 67B-A2B checkpoint 上准备从 65K 到 262K 的 1,000-step 对照实验；treatment 只把 >64K 长文档的采样率提高 2 倍，其他 optimizer、schedule、mesh、batch、offset 与质量权重保持一致。[M26]

这个实验不是 Hero 已经扩到 262K，而是较小模型在替 Hero 预演。

## 20.4 535B-shape 的 262K 单 rack probe

8 月 28 日公开的 issue #8754 记录了一次更接近 Hero 尺寸的 side experiment：分支从 Hero step 6,000 checkpoint 恢复，用 EP16×CP4、global batch 16 在一个 GB200 NVL72 rack 上运行 262,144 context。该 probe 完成到 step 6,100，稳态窗口约为 **113.5 s/step、8.78% MFU、127.6 GiB peak HBM**，说明 535B shape 在这个分片方案下可以 compile、restore 并进入训练。[M33]

但 routing capacity 还没有过 gate：`moe/drop_fraction` 中位数约 **18%**，且从 16.8% 升到 20.7%。在 batch 16 时，每个 expert coordinate 看到的独立文档太少，文档内相关的 token 路由使 4K 训练调好的 1.15/1.15 capacity factors 发生大量 clipping。另外，该 probe 的 LR 只约为 checkpoint rate 的 2%，因此它能证明系统可行性与当前 routing 瓶颈，不能证明 262K 训练稳定性，更不能写成 Hero 主 run 已进入 262K。

## 20.5 新 context-parallel draft 的 40-step 证据

9 月 11 日公开的 draft PR #9119 把 sequence-sharded residual、context-aware MoE routing、FA4 queries 与 short-convolution halo 组合到新的 Hero context path。一个 review 前的 revision 在 64 张 GB200 上用 EP16×CP4、global batch 16、sequence length 262,144 完成 40 个 updates，测得 **10.03% median MFU** 与 **1.42% mean dropped assignments**。[M80]

1.42% 明显低于 8 月 probe 的 18%，但这不是“capacity 问题已经解决”的确认：代码 revision、观察窗口与运行条件并不完全相同，而且 40 updates 只能验证短期 systems behavior，不能验证 long-context learning quality。更重要的是，#9119 仍叠在多个 feature branches 上，base 不是 main；没有 Hero handoff checkpoint、launch record 或 ongoing-status 更新。因此它是 **experimental systems evidence + planned integration**，不是 4K production Hero 已进入 262K phase。

> **小练习｜怎样确认 phase transition**
>
> Draft PR、单 rack 的 40-step run、代码 merge、主 run launch record、W&B 新 lineage 五种证据里，哪些足以单独证明 Hero 已切到 262K？答案：都不能单独证明；至少需要生产 launch/handoff 证据和持续产生 optimizer progress 的主 run 记录。短 side run 只能证明候选 path 能执行。

## 20.6 H100 上的 65K full-shape probe

9 月 19 日新增的 H100 side experiment 在 192 张 H100 上，以 fresh init 与 synthetic data 跑完整 535B shape 的 65,536 context。标准 PP24/EP8 在十个 finite updates 中测得 15.52% median MFU、174.43 秒/step；PP24/EP4/CP2 变体为 9.88% MFU、68.54 秒/update。 两者 global batch 分别为 384 与 96，tokens/update 相差四倍，且 helper versions 不同；不能由每步秒数直接判断 CP2 更快。[M105] 它确认两种 H100 sharding path 可以执行，却没有恢复 production checkpoint、没有验证学习质量或长期稳定性，也没有改变 GB200 上仍处于 4K 的 production Hero。

## 20.7 Post-training 为什么提前准备

Pretraining 完成后才开始搭 RL infra 会浪费数月。Standup 显示，团队已经并行设计 RL observability、run identity、Grafana view、serving 与 post-training planning。[M6] 这与 frontier lab 的 pipeline 工作方式一致：多个阶段并行研发，checkpoint 到来时后续系统已经就绪。

---

# 第四部分　Hero 之前：配方是怎样演进出来的

# 第 21 章　从小模型到 32B、67B 与 535B：Marin 的经验链

## 21.1 Hero 不是第一台飞机

大型训练最危险的误解是把最终 config 看成一组天才研究者一次性写出的正确答案。实际上 Hero 的大量选择来自前代模型与小规模实验：8B recipe 提供初始 baseline；32B 暴露 attention stability、contamination 与 shuffle 问题；67B-A2B 承担长上下文和 cooldown 预演；Delphi 与 scaling suite 提供扩展律工具；Agent MoE experiments 对 architecture、router、optimizer 与 kernel 做系统筛选。[M21][M22][M23]

## 21.2 Marin 32B：为什么失败记录比最终分数更有价值

32B 的四阶段非常适合学习 mid-flight intervention：

| 阶段 | 现象 | 主要行动 | 结果 |
|---|---|---|---|
| Phase 1 | 70K 后 loss spikes 增多 | 更严 grad clip、update clip、skip bad steps | 只能减轻，不能根治 |
| Phase 2 | 80K 后持续失稳 | 重建 optimizer state、尝试 Muon | 短暂缓解，仍复发 |
| Phase 3 | 结构性判断 | warm-start 切换 QK-Norm backbone | 约 10B tokens 恢复，spikes 消失 |
| Phase 4 | cooldown | 修 contamination 与 shuffle | Mantis 重新训练并改善结果 |

这说明诊断顺序应该从“是否偶发异常”逐渐升级到“是否需要结构改动”。如果所有 optimizer-side mitigation 都只能短暂缓解，根因可能在 attention stack 或 model state。[M22]

## 21.3 67B-A2B：Hero 的阶段预演器

Hero 的 long-context plan 明确参考 67B-A2B 从 65K 到 262K 的实验。较小模型可以快速测试 qk multiplier、长文档权重、transport drop、serving 与 post-training interface；它像航天项目的全尺寸地面试验台。

## 21.4 Delphi：扩展律基础设施

Open Athena/Marin 的 Delphi scaling suite 把一套 recipe 从约 3×10¹⁸ 扩展到 10²³ FLOPs，并报告在远超 fit range 的预算上仍取得很小预测误差。[M23] Hero scaling ladder 是同一种研究文化的更大规模应用：不是只训练模型，而是训练“预测模型会怎样训练”的能力。

# 第 22 章　Architecture ablation：哪些想法进入了 Hero，哪些没有

## 22.1 怎样隔离一个 feature 的影响

一个 bundle 同时加入十项 feature，即使 loss 变好也无法知道原因。常见方式是在统一 baseline 上逐项移除，比较 train/eval、MFU、gradient、drop 与稳定性。Standup 记录显示，Hero launch 前做了 4-of-192 到 8-of-384、capacity factor、SConv site、latent RMSNorm 等 ablation。[M5]

## 22.2 Agent MoE Experiment Digest

Marin 的 Agent MoE digest 汇总数十个实验，并把结果分为 worked、promising、mixed、did not work、not evaluated 与 in progress。[M21] 这类数据库的价值是防止团队重复踩坑，也让“被丢弃的想法”成为可搜索资产。

## 22.3 负结果是 recipe 的边界条件

一个 router modification 在 d768 无收益，不代表永远无效；它可能需要更大 scale 或不同 data。反之，小规模收益也不保证 Hero 有收益。好的实验记录应包含：

- tested scale 与 compute；
- matched baseline；
- metric 与不确定性；
- system caveat；
- 是否存在 implementation risk；
- 推荐下一步，而不是简单“赢/输”。

## 22.4 从 4-of-192 到 8-of-384

增加 expert 数与 Top-K 会同时改变容量、每 expert token 数、router statistics、all-to-all shape 和 kernel efficiency。Hero 的选择最终与 EP64 rack、half-width experts、LatentMoE 和 shared experts绑定，不能把某个数字脱离整体系统评价。

## 22.5 一个错误比较怎样触发实验重做

Issue #9110 测试 `down(h) → RMSNorm → gate → router + experts` 的 latent routing treatment。最早的 Hero-shape treatment 曾与跨 architecture、recipe、hardware 与 evaluation settings 的 May reference 比较，得到 3.8425 对 3.5422 与 0.138 modeled effective speedup；官方记录后来明确撤回“因此 gate 失败”的解释。第一组 Larry-matched replacements 又被发现使用了错误 optimizer class：scalar hyperparameters 看似一致，但 parameter mask 实际把 GatedNorm 等矩阵分配给不同 optimizer，因此早期 loss gap 也无效。[M81]

团队随后用明确记录为 `grug_moe_muonh_v1` 的 optimizer 重跑 matched treatments。最终 d512 为 3.569422，对 reference 3.570037，差值 −0.000615，近乎持平；d768 为 3.219741，对 3.214935，差值 +0.004806，略差。两个 treatments 的最后 100 steps 都显示 load balance 略弱、overflow 为 0。每个 cell 只有一个 seed，所以不能宣称统计显著；可以谨慎地说，在这两个 matched cells 中没有观察到质量或 balance gain，因此没有启动更大 cells。[M81]

这次更重要的教材结论不是“gate 有害”，而是：**optimizer identity 不等于一组标量超参数**。可靠 ablation 还要核对 parameter-to-optimizer mask、上传的 live config、run identity、checkpoint root 与 source commit。发现这些不匹配时，应撤回旧结论并重跑，而不是用更强措辞包装一个失效比较。

# 第 23 章　Launch gates、run contract 与预注册

## 23.1 为什么不能“代码 merge 了就 launch”

Hero burndown issue 把 launch gates 分成 architecture/numerics、data、optimizer、checkpoint/recovery、evaluation、W&B identity、output root 等。[M27] 一次大型 run 必须有 run contract：

- DRI 与值班责任；
- exact commit/config；
- topology 与硬件；
- token/compute budget；
- data artifact fingerprint；
- preregistered loss/eval；
- checkpoint retention；
- recovery policy；
- stop/shorten rules。

## 23.2 Run identity

如果 relaunch 产生新的 W&B ID、output path 或 dataset offset，后续曲线与 checkpoint lineage 会混乱。Hero 的事故处理反复强调保留同一个 run ID 和 output lineage，从最新完整 checkpoint 恢复。[M3]

## 23.3 Recovery policy 是设计，不是事故后临时决定

Hero issue 提前写明：若在约 25% token budget 之前发生超出 buffer 的延误，可以缩短 token horizon，重算 linear LR decay 和 data mix。[M2] 这说明项目管理与 optimizer schedule 互相耦合。

## 23.4 Pre-registration 不是僵化

预注册是为了明确“在什么假设下预测什么”。当 context 或 datamix 改变时，团队可以偏离预测，但必须记录 recipe divergence。它提供的是可解释性，而不是禁止 mid-flight learning。

## 23.5 Hero cutover 已被写成可复用 playbook

已合并的 PR #8873 把 ragged migration 的经验固化为 deploy-Hero-change playbook：先约定 handoff checkpoint、run ID、200-step gate 与切换时间；从干净 main worktree 启动并保留旧 lineage；用相同 batches 做 matched comparison；监控以 Finelog 而不是延迟更高的 W&B 为准；失败时重新启动旧 commit。[M82]

这项 merge 确认的是**组织流程资产进入仓库**，不是新的 Hero deployment。它把此前逐次事故中总结出来的隐性操作知识变成可审查、可复用、可回滚的 pipeline。

---

# 第五部分　Live Run：8 月 19–28 日发生了什么

# 第 24 章　启动与第一个风险窗口

## 24.1 启动时刻

Hero issue 创建于 8 月 18 日，公开状态日志记录主训练从 8 月 19 日开始。[M2][M3] 启动后的首要任务不是庆祝 loss 下降，而是确认：

- 初始化、warmup 与 gradient 是否健康；
- route/drop 是否在预期范围；
- step time 与 MFU 是否接近 ladder；
- checkpoint 是否能写、能读、能恢复；
- 11-rack collective 是否稳定。

## 24.2 早期模型健康信号

Parameter-norm health check 没有发现 exploding/collapsing norms 或 NaN/Inf。MuonH/AdamH norm 平坦，Adam group 正常演化；`attn_gate` 与 `router_bias` 从零增长被解释为预期行为。[M4]

团队也把前约 3% warmup 窗口标记为 clear。这个结论只表示“没有 early catastrophic model instability”，不表示最终 recipe 已经成功。

## 24.3 系统问题很快成为主角

启动几天内出现 host OOM、NVLink uncorrectable error、checkpoint serialization OOM、coordinator OOM 与节点失联。值得注意的是，多数事件并未伴随 train loss、gradient 或 CUDA/NCCL model exception；它们属于 infrastructure failure domain。[M3]

![前十天事故时间线](marin_tutorial_assets/07_failure_timeline.png)

# 第 25 章　Checkpoint OOM：为什么“存档”比训练一步还危险

## 25.1 Distributed checkpoint 保存什么

可恢复 state 往往包括：

- model parameters；
- FP32 master parameters 或其替代布局；
- optimizer moments/momentum；
- scheduler 与 step；
- RNG 与 data position；
- sharding metadata；
- run/config fingerprint。

535B 参数即使以 BF16 也超过 1TB；再加 FP32、optimizer state 与分片 staging，保存不是一次简单文件写入。

## 25.2 step 11,252 的 OOM

公开日志记录一次训练在 step 11,252 附近 checkpoint-time OOM，实例 relaunch，从最新完整 checkpoint 恢复。[M3] 团队随后比较 writer ranks 与 non-writer ranks 的 RSS：前 128 个 writer 的 memory floor 在第一次保存后上升约 11.7 GiB，第二次再上升约 4.4 GiB，而 non-writer 没有同样趋势。[M3]

这种 rank-localized pattern 是强证据：问题更可能在 checkpoint writer path，而不是所有训练参数或 activation 同时膨胀。

## 25.3 Root cause：completed futures 仍持有 source references

排查发现长期存在的 `GlobalAsyncCheckpointManager` 会保留已经完成的 TensorStore commit futures，间接持有源数组/缓冲区引用；CUDA pinned-host BFC allocator 还会保留一块 memory floor。[M3]

> **概念解释｜内存泄漏与 allocator cache**
>
> “进程 RSS 不下降”不一定都是经典 leak。可能是对象仍被引用，也可能是 allocator 为后续复用保留已释放 block。诊断需要 heap profile、对象生命周期、rank 对照和多次 checkpoint 后的 baseline 变化。

## 25.4 Task OOM 与 coordinator OOM 的级联

8 月 24 日一次 training task 在 checkpoint serialization 时 OOM；16 秒后只有 2GB RAM 的 coordinator 也 OOM，而 retry budget 为 0，最终整个 176-task child job 停止。[M3]

这暴露两层问题：

1. writer memory path 的根因；
2. orchestration control process 不应因小内存和零重试把局部故障放大成全局停机。

PR #8617 把 coordinator RAM 从 2GB 提到 4GB、retry 提到 1000，并固定 production trigger。[M18]

# 第 26 章　Restore、数据缓存与对象存储：隐形的 IO 放大

## 26.1 Restore amplification

公开 PR 记录：旧 restore 路径让 704 ranks 各自读取约 91.19 GiB，即为了恢复约 4.88 TiB checkpoint，产生约 62.69 TiB addressable reads，放大约 12.85 倍。[M17]

理想策略是让 replica 只读取一次，再在本地或 rack 内广播，而不是每个 rank 重复从对象存储拉取重叠 shards。

## 26.2 Region-local rolling checkpoints

为了降低跨区 S3 读取与恢复时间，团队增加 region-local rolling checkpoint：保留短周期本地恢复点，同时较低频写永久 checkpoint。[M19]

## 26.3 125GB/process 数据缓存

TensorStore decoded-chunk cache 原可增长到 125GB/process。A/B 测试把它限制到 1GB 后，loader steady throughput 只下降约 3–4%，仍约为 Hero 所需消费速度的 18.6 倍，而 cache 稳定在约 0.923 GiB/process。[M14]

这是一条经典系统原则：如果 producer 已有 18× headroom，不应为了局部 benchmark 多 3% 吞吐而牺牲数十至上百 GB 的稳定内存。

## 26.4 Cold-start dependency storm

另一个 PR 记录 704 ranks cold cache 安装依赖时触发大量 S3 `SlowDown`。大型 gang 的“每个进程做一次小下载”会瞬间变成对象存储风暴。[M28] 解决方法通常是预烘镜像、node-local cache、分层 distribution 或并发限流。

# 第 27 章　Checkpoint pipeline：用 overlap 隐藏 I/O

## 27.1 串行流程的浪费

旧流程先等待 TensorStore/S3 target open，再 stage GPU shards 到 host，然后 write/commit。如果 target open 需要几十秒，training thread 会无意义等待。

## 27.2 异步 open 与 staging 重叠

PR #8647 让 TensorStore open 与 device-to-host staging 并行；在 staging capacity 足够时，training thread 更早返回，database setup 与 writes 在后台继续。[M15]

这与 FlashAttention 的思想相通：性能优化不仅减少运算，还重排时间和数据移动。

## 27.3 Telemetry 不能破坏被测系统

PR #8663 增加 staging duration、async commit、total checkpoint duration、staged bytes 与 peak RSS 等指标。[M16] 但重度 debug 模式在 matched test 中让 checkpoint 后 step 从 10.17 秒增至 84.02 秒，即时长约为原来的 8.26 倍（增加约 726%），对应吞吐下降约 87.9%。

> **概念解释｜Observer effect**
>
> 测量本身会改变系统。高频 heap trace、同步日志、全 rank histogram 可能污染 performance。Production observability 需要低开销常驻指标与短时高开销诊断模式分离。

## 27.4 GC 与 allocator 也是 distributed timing 的一部分

Issue #9205 把周期性 timestamp gaps 定位为错开的 full Python GC：不同 ranks 在不同时间暂停，随后在 checkpoint-decision broadcast 处互相等待。慢窗口从约 16.715 增至 18.458 秒/update，历史 excess time 约占 3.83%；PR #9224 的 64-GPU coordinated-GC test 将 elapsed time 从 795.576 降到 776.003 秒，改善 2.46%。[M102][M103]

但 production adoption 仍有一道门槛。另一个六-step checkpoint experiment 显示，立即执行 jemalloc purge 会把 99.4/97.7 秒窗口拉长到 121.7/113.5 秒，却让每 node 少保留约 64–69 GiB memory。[M104] 当前 `hero-main-step121638` 显式设置 `gc_interval=None`；production batch、eval transition 与长期 memory 尚未验证，因此 coordinated GC 与 purge policy 都仍是实验或计划，不是已部署优化。[M99]

# 第 28 章　Goodput：为什么 22% MFU 仍可能浪费大量日历时间

## 28.1 四个不同问题

| 指标 | 回答的问题 |
|---|---|
| GPU utilization | GPU 是否在执行 kernel？ |
| MFU | 理论峰值中多少用于模型 FLOPs？ |
| Active share | Wall-clock 中 training process 有多少时间存活？ |
| Progress efficiency | 实际 tokens 相对理想持续吞吐前进了多少？ |

## 28.2 Hero 的早期数字

团队测得一个阶段 active share 约 89–90%，而 progress efficiency 约 65%。[M12][M13] 差值来自 checkpoint、eval、低吞吐 step、restart、rollback 与不产生新 token 的 active 时间。

![训练控制室指标分层](marin_tutorial_assets/08_metrics_stack.png)

## 28.3 Time-to-trained-model

最终商业/科研目标不是“某个 kernel benchmark 最快”，而是最短时间、最低风险地得到达到目标质量的 checkpoint。一个 2.5M tok/s、95% progress efficiency 的系统，可能胜过 3.0M tok/s、70% efficiency 的系统。

## 28.4 Goodput 是跨层优化

提高 goodput 可能来自：

- 修 memory leak；
- 缩短 checkpoint pause；
- 更快 restore；
- 降低 node failure blast radius；
- 减少 telemetry overhead；
- 提升 MFU；
- 避免错误 intervention 与重复训练。

因此 foundation-model training team 的优化对象是整艘船，而不是单个 kernel。

# 第 29 章　Observability：从 global curve 下钻到 layer、expert 与 rank

## 29.1 只看 loss 的危险

Loss spike 可能来自模型、数据、evaluation sampling、restore 或 logging。必须结合 gradient norm、parameter norm、router entropy、drop、step time、memory 与 phase。

## 29.2 Per-layer norms

Hero 48 层通过 `ArrayStacked` 存储。旧 logging 把 layer axis 合成一个 norm，可能掩盖单层 runaway。PR #8689 已合并：为每层参数和梯度发布独立 key，使“第 31 层异常”不再被 47 个正常层平均掉。[M25]

## 29.3 Telemetry 本身成为 Big Data 系统

相关 PR 记录：Levanter training telemetry 占持久化 rows 的约 66.2%；10.08GiB replay 含约 4.32 亿 rows，生产迁移处理约 21.73 亿 input rows。[M29]

团队把真正训练指标改为 process 0 发布；loss/phase/progress 每 step 保留，其他 scalar 降到每 10 steps；histogram 用 typed row；表中直接包含 run_id/step。Hero health query 被压到约 2.6–3.2 秒。[M29]

## 29.4 Control plane 也可能被监控压垮

原整理稿曾给出 DCGM discovery 的精确流量降幅，但 M30 仅指向 PR 搜索页，本次未定位到支持这些数字的固定原文，故撤下数字、保留待复核提示。一般而言，node-local 过滤与缓存可以减少监控发现请求；是否改善某次运行，需要具体 PR 与测量记录。[M30]

这说明“监控 GPU 的服务”也可能成为 cluster risk。大规模系统里，没有真正免费的 observability。

## 29.5 图表默认值也是分析方法的一部分

已合并的 PR #9120 把 Hero MFU 视图设为 0–30% soft range、train loss 设为 1.20–1.60 nats/token，并默认过滤累计 token 少于全程 1% 的早期 Paloma evaluations，同时允许切回 Full run。[M83] 目的不是删除数据，而是防止早期极值压缩后期变化；extreme samples 仍会扩展坐标轴而不是被 percentile clipping 隐藏。

这提醒我们：dashboard 的默认 viewport 会影响人的判断。好的默认值应突出当前信号，同时保留恢复完整历史的路径。PR 已合并只证明代码状态，不能单凭这一点断言 Grafana production 已部署。

# 第 30 章　节点失联与 Gang Recovery：失败是常态，恢复才是产品

## 30.1 8 月 27 日节点故障

一台 GB200 node 失去 connectivity，JAX 发现多个 process 不再 heartbeat；Kubernetes 标记 NotReady，平台 cordon/reboot。故障前没有 OOM、CUDA、NCCL 或 training exception。[M3]

## 30.2 为什么要整 gang 原子重试

Distributed step 中所有 ranks 共享 collective sequence。只重启一个 rank，其他 ranks 的通信状态、参数与 step 可能不一致。Iris 因而重启整个 176-task gang，从同一完整 checkpoint 恢复，并在 step 27,000 左右继续训练。[M3]

## 30.3 Fault tolerance 的目标

不是消灭 hardware failure，而是：

- 快速检测；
- 限制 blast radius；
- 选择一致 checkpoint；
- 保持 run identity；
- 恢复 data/RNG/optimizer state；
- 验证 loss continuity；
- 自动继续。

这也是为什么 checkpointing、scheduler 与 training semantics 不能被视为外围基础设施。

# 第 31 章　Ragged All-to-All：从实验胜利到 Production Migration

![Ragged backend 的 productionization 流程](marin_tutorial_assets/09_migration_pipeline.png)

## 31.1 Hero-shape matched A/B

从真实 Hero step-6000 checkpoint，在同一 rack、同一数据上只改变 transport：

| 指标 | Pooled-wave | Ragged |
|---|---:|---:|
| MFU | 22.71% | 22.87% |
| Expert assignment drop | 2.67% | 0.018% |
| Device peak | 149.9 GiB | 137.9 GiB |

较长 d768 ablation 也出现更低 train loss 与 eval BPB 的方向性证据。[M7]

## 31.2 为什么 stock XLA 不够

真实 trained router 产生 skew，stock XLA 的 CTA assignment 导致 workload imbalance，MFU 约 19.4%；patched balanced-CTA path 才达到上述性能。[M7]

这说明 model algorithm、compiler、GPU scheduler 与 network transport 需要联合优化。

## 31.3 JAX 0.11.1 blocker

Ragged collective flags 要求 JAX 0.11.1；升级后 `dot_general` 对 batch-dimension sharding 要求更严格，GQA expansion 后 K 丢失 head-axis sharding，reference attention 失败。PR #8716 使用 `auto_axes` 让 compiler 选择 intermediate layout，并固定 output 跟随 Q sharding；1,523 个 root tests、1,355 个 Levanter tests 以及 H100/TPU 路径验证后合并。[M31]

## 31.4 代码合入 ≠ 持续部署

PR #8549 已把 ragged backend 合入 main，但明确不改变 Hero default。[M7] PR #8684 才提出让 ragged 成为 Hero 默认，并于 8 月 31 日合并。[M8] 9 月 2 日的 11-rack candidate 证明这套代码确实进入了 production trial；但 trial 两次 hang 后回滚，PR #8884 随后把 d6144 Hero recipe 明确改回 pooled-wave。[M42][M43][M44][M49] 9 月 4 日的新 production run 也由直接 launch 记录与 W&B 共同确认使用 pooled-wave。[M47][M52] 到 9 月 9 日，新的 main-commit ragged run 又通过 200-step gate 并被官方指定为此后的 Hero。[M68][M69] 因此 deployment status 必须带时间：代码合入、trial、rollback 与重新成为 production Hero 是四个不同事件。

## 31.5 Checkpoint state semantics

拟议 migration 同时取消 pinned-host FP32 master，把 FP32 authoritative parameters 留在 device。旧 checkpoint 中可能同时存在 FP32 master 与 BF16 working copy；若新代码静默从 BF16 恢复，程序可以成功运行，却不再是数学上相同的 trajectory。[M8]

> **概念解释｜Silent numerical corruption**
>
> Crash 很容易发现；错误精度或错误 optimizer state 的成功恢复更危险。它可能让 loss 看似连续，却在数十万 steps 中累积偏差。Production migration 必须验证参数来源、optimizer slots、step、RNG、data offset 与短期 loss continuity。

## 31.6 一次安全切换需要什么

PR checklist 要求：真实 Hero checkpoint 恢复、FP32 migration 验证、MFU/drop/memory 验证、受控 restart、约 200 steps 观测窗口与明确 rollback commit。[M8]

在 9 月 2 日切换前，公开 checklist 表明前五项预生产检查已通过：最新 Hero checkpoint 能被恢复并保持 loss continuity，单 rack MFU 约 22.5–23%，drop 低于 0.05%，peak HBM 低于 138.2 GiB threshold。真实 11-rack trial 随后仍然两次 hang，说明 checklist 是进入 production gate 的必要条件，却不是稳定性保证。[M42][M43]

这是一堂“如何修改正在运行的数百万美元实验”的课。

## 31.7 Latency 优化已进入 trial，但收益不能单独归因

PR #8753 在一个 GB200 NVL72 rack 上，用 Hero step-6,000 与 step-24,000 checkpoint 做 matched control/treatment restore。Carry offload 让 latency-hiding scheduler 可以用于 ragged transport，并将一组测试的 peak HBM 从 137.95 GiB 降到 116.50 GiB；再加上 packed gate/up interleave 与更宽的 FA4 forward tile，PR 估算三项改动合计约提升 4% tokens/s。该 PR 已于 9 月 1 日合并。[M34]

这些结果回答的是“优化在隔离的 Hero-shape 实验里是否有效”。相关 stack 后来进入 9 月 2 日的 ragged production candidate，但多项改动同时切换，因此不能把 trial 的 MFU 变化归因给某一个 PR；而且整个 candidate 已回滚，不能把隔离收益写成当前实时 throughput。[M42][M44]

## 31.8 为什么一个常数 zero 也会吃掉 0.4 MFU

PR #8822 发现，`ragged_all_to_all` 的 literal zero-init 会被 XLA hoist 到 48-layer scan 之外，再由 CopyInsertion 在每层复制到 collective output slot。Hero shape 上，这些 `MemcpyD2D` 一度占约 785 ms/step；让 zero-init 依赖 traced size 并按 call site 区分后，复制时间降到约 4 ms/step，单 rack matched restore 测得约 +0.4 MFU。该 PR 已于 9 月 2 日合并。[M40]

这是一类典型 compiler/runtime interaction：数学上完全相同的 zero，在 HLO 中的“常数”或“loop-local write-only fill”身份会改变内存复制行为。它进入了 9 月 2 日 ragged candidate 所用的 main stack，但 production trial 无法隔离它的单独贡献，而且整个 candidate 已回滚。

## 31.9 真实规模 gate 揭示了单 rack 没覆盖的故障域

9 月 2 日，团队停止旧 pooled-wave run（最高到 step 54,262），从永久 step-54,000 checkpoint 启动新的 ragged run ID，以保持旧 checkpoint tree 与 W&B lineage 不被覆盖。前 70 个 steps loss 逐步匹配旧 run，assignment drop 从约 3.4% 降到低于 0.01%，MFU 从 20.5% 升到约 23.4%。[M42]

但 attempt 0 在 step 54,071 后 hang；attempt 1 从同一 checkpoint 重试后又在 step 54,001 hang，且没有 NCCL、XLA、CUDA 或 Kubernetes error。进一步取证纠正了最初的 watch-step 解释：部署配置使用 inline watch，并没有两个不同 executable 交替，连续两个 steps 在 XLA/NCCL 层是相同路径。当前只能把 stall 收窄到 LSA barrier；精确触发器仍未知。[M43][M45][M48]

团队在约三小时后执行 rollback：旧 commit `04751985c7` 从 step 54,000 恢复，loss 与自身旧 trajectory 匹配。[M44] 9 月 3 日，团队又暂停恢复后的 Hero，在相同 step-54K state、完整 11-rack shape 与重叠 batches 上运行两个 ragged reproduction jobs，共完成 235 个正常 steps，没有复现 hang；loss 与失败 attempt 匹配到约七位有效数字。这排除了“某个固定 batch 或 model state 必然触发故障”，却没有排除 timing-sensitive fault；按 job-step 计算，先前 75 次 attempts 中两次 hang、此次 235 次全部正常的一侧检验约为 p=0.06，仍不足以宣告问题消失。[M48]

第一次调试窗口结束后，团队从强制保存并核验完整的 step-58,014 temporary checkpoint 恢复 production。新 run 保持 pooled-wave，同时正式启用峰值 0.02、随训练线性衰减到零的 gate/router weight decay。[M41][M47][M50]

9 月 4 日的第二次 11-rack telemetry window 使用带 barrier instrumentation 的 ragged stack，完成 183 steps 且没有 hang。它第一次测到 rack 间不对称：六次事件中，一个 late rank 让同一 EP clique 的其他 63 ranks 在 pre-copy barrier 等待约 80–160 ms；这些 stragglers 在 replica indices 8–10 的不同 nodes 间游走。它们比 45 秒 timeout 小三个数量级，因此目前不能断言 silent hang 是这条 latency distribution 的极端尾部。[M55]

同一调查又找到一个独立且可复现的缺陷：Hero candidate 固定的 QuACK 0.6.1 CLC scheduler 在四 GPU、另一进程制造 contention 的 synthetic comparison 中，三个 cases 出现 GEMM output regions 保持 sentinel、即没有被写入；narrow drain fix 与 no-CLC controls 未发现错误。历史 cache keys 中确实存在 unsafe drain，但实验没有复现 timeout，使用的也不是原始 production dimensions，因此它与 Hero hang 的因果关系仍未证明。[M56]

QuACK 0.6.4 upgrade branch 后来纳入 upstream CLC scheduling fix，并适配新的 batch-first tensor-view convention；PR #8959 先通过 lint、type check、1,529 个 safe tests 与 28 个选定的 GB200 kernel/attention cases，再于 9 月 9 日合并。[M60][M64] 随后的 ragged production launch 明确包含该 commit，因此“QuACK 0.6.4 已部署”现已确认；但它对 hang 与 MFU 的单独贡献仍不能从组合 stack 中分离。

另一个调查分支找到了重复 executable 的来源，但不是先前被否定的“watch mode 切换”。Step counter 起初带着与 training mesh 不一致的 sharding，导致第二个 step 再编译一份 XLA executable；两份 executable 随后会在同一 arena/address 上各注册一组 NCCL symmetric windows。已合并的 PR #8911 把 step counter 初始化为 replicated sharding。在一 rack Hero-shape 测量中，train-step compilations 从两次降为一次，每 rank 的 20,293,761,024-byte registrations 从两次降为一次；在没有修复的 11-rack 记录里，704 ranks 共注册了 1,408 个 windows。[M65]

这是一项已确认的代码修复与局部机制测量，但因果边界仍然严格：#8870 的失败 attempts 都观察到每 rank 两份 executable，不等于“两份 executable 已被证明导致 hang”。9 月 9 日 launch record 证明新 ragged production 已加载 single-executable fix，因此部署状态从 planned 变为 confirmed；之后同 signature 再次出现，则进一步证明该修复本身并没有消除 hang。[M65][M68][M71]

团队先把 pooled-wave run 推进到 step 81,919，并保护 step 81,716 handoff checkpoint；随后合并 PR #9043，把 ragged all-to-all 与 fp32 weights on device 恢复为 Hero default。[M67] 首个 main launch 还使用 QuACK 0.6.4 与 single-executable fix，但旧 wheel 的 compiled NCCL headers 为 2.29.7、runtime 为 2.30.7；它四次 attempts 四次 hang。团队随后合并 PR #9062，把 PJRT wheel 的 compiled headers 对齐到 2.30.7，并从同一 step 81,716 重新部署。[M64][M65][M68][M70]

新 main run 的前 200-step 配对 gate 通过：ragged steady-state MFU 23.11% 对 pooled-wave 21.46%，capacity overflow 7.8e-5 对 3.4e-2，peak HBM 103.6 对 136.3 GiB，loss delta 平均 −0.00650 nats。官方记录据此宣布该 run 成为此后的 Hero。[M69] 但这是组合 stack 的短窗口结果，不能把全部差异归因于 header alignment，也不能推出 long-horizon reliability。

第二次窗口结束后，pooled-wave production run 从强制保存的 step-61,806 checkpoint 恢复。9 月 5 日，它在 step 65,069 后又出现与 ragged attempts 形态相似的 device-side silence：这次没有 ragged kernel 参与，15 分钟后 rack 10 首先报出 `CUDA_ERROR_CONTAINED`，指向 NVLink peer-memory access 或 hardware error。整个 gang 随后从 step 64,944 恢复，回退 125 steps。[M58][M59][M52]

这次 production 事件一度改变了调查权重。Rack 10 既是本次 fault origin，也是 telemetry window 的 straggler 来源；rack 8 既对应 ragged attempt 0 的 stalled node set，又出现 5.009 秒的首次 NVLS bind 与持续增长的 link-recovery counter。当时 fabric fault 被提升为最强解释，因为它似乎可以统一说明 pooled-wave 的显性 CUDA error 与 ragged barrier 的静默等待；但 attempt 1 所在 rack 4 没有匹配证据，所以该说法始终只是推断。[M55][M58][M59] 后续官方关闭记录进一步纠正：header 变化改变了 hang exposure，两类 failure modes 也已经分离，不能再把 fabric 写成 #8870 的 leading explanation。[M76]

9 月 7 日，另一个 rack 的节点报出 Xid 149 `NETIR_LINK_DOWN` 与 Xid 154 `Drain and Reset`，taint manager 删除故障 task 后，Iris 再次重新排队整个 gang。中断前 attempt 到达 step 72,344，最近完整的 temporary checkpoint 为 step 72,183；公开 W&B 后来推进到 step 72,348，证明 job-level recovery 已经成功。[M62][M52] 这说明 fabric/node-link health 已经是反复影响 goodput 的生产风险，但它仍不等于此前 ragged hangs 的共同根因被证实。

新的 ragged Hero 随后连续运行 1,590 steps，在完成 step 83,307 后再次出现 #8870 signature：一个 rack 的 CPU 使用约为其他 racks 的一半，65 个 AllReduce communicators 出现冻结的跨 rank operation-count gaps，step 83,308 永不返回。Watchdog 终止 gang 后，Iris 从新 run 自己的 step 83,305 checkpoint 恢复，重放三个 steps，并在 21 分钟内越过原 stall step。[M71][M72] 这同时证明“header alignment 没有消除 hang”和“新 checkpoint tree 可以恢复”。

恢复后的 attempt 1 又因另一个明确的 failure mode 中止：rack index 9 上两个 tasks 报出 `CUDA_ERROR_NVLINK_UNCORRECTABLE`，Iris 立即重试。[M74] NVLink error 发生在 silent hang 已恢复之后，不能被倒推成前一次 hang 的 initiating event。公开 W&B 随后显示 replacement execution 继续到 step 88,963。[M73]

9 月 11 日的 source audit 又排除了两条诱人的代码级解释：remote GIN branch 中确实存在两个 deadlock schedules，但 Hero 使用 `gin=false`；实际执行的 LSA branch 没有发现缺失的 local CTA synchronization。Finelog timing 还显示 ragged 有 11 个超过 median 1.5× 的 intervals 落在 checkpoint step 到 step+4，而 pooled-wave 只有 1 个，但真实 hangs 同时出现在 step 54,072、54,001、81,759、83,308，另有三次在 restore 后首 step 失败；这只能生成 checkpoint/watch-boundary 假设，不能建立因果。下一项决定性证据仍是第一个 blocked GPU operation、per-rank/CTA barrier epochs 与 stream dependencies。[M75]

硬件侧也出现了一次很有价值的“部分命中”：手工 sweep 提前五天点名 `s9jvxs64` GPU 0 link 14，之后正是该 link 报出 Xid 149。CoreWeave hold 该节点、通过 L12 qualification，并于 09:15:31Z 把它送回 production；但公开 telemetry 的 per-link counters 目前没有数据，四组相关 metric specs 与 Grafana panels 也是空的，节点返回后还没有 load 证据。[M76][M77] 因此“预警精确命中”是 confirmed，“link 14 已在负载下健康”仍是 unknown，“它解释 #8870 hang”则是已撤回的过度归因。

另一个 open research branch 正尝试用 `jax.lax.ragged_dot` 与 XLA/cuDNN 替换 QuACK expert MLP。单 rack、55-step Hero-shape comparison 中，XLA branch 的 median MFU 为 23.77%、peak HBM 109.7 GiB，QuACK control 为 24.84% 与 114.0 GiB，loss 差异在 5e-5 内；四次 XLA runs 中两次 hang，QuACK runs 没有 hang。[M78] 这说明较低显存并没有自动换来更高 throughput 或更高可靠性，而且该 branch 仍需要新版 cuDNN/cuBLAS、更多修复与 promoted wheel，不能写成 production Hero 已切换。

9 月 16 日，团队把 PDL visibility hazard 当作一个可检验的 production hypothesis：PR #9183 让 QuACK grouped GEMMs 不再使用 PDL，PR #9179 提供另一对 GB200 racks 上测得 +2.766% throughput 的 validated PJRT wheel。[M97][M98] 真正的 production handoff 从 step 108,778 开始，194 个 paired steps 中 mean loss delta 为 −3.8e-5、max absolute delta 为 3.8e-4，MFU 从 23.03% 升到 23.62%，tokens/s 提升 2.6%，drop/peak/router metrics 匹配；该 run 留在 production 并越过 2,052 steps 未 hang。[M96]

这是一条很好的因果边界练习：结果与“PDL 造成跨 kernel 可见性风险”的机制一致，却不能证明它就是 #8870 root cause；同一 stack 同时换了 wheel，CLC scheduling 与其他 timing-sensitive mechanisms 仍是替代解释。之后 9 月 18 日的 clean-main handoff 又用 200 paired updates 验证 checkpoint identity、loss continuity、duration 与 HBM，并成为新的 production lineage。[M99][M100]

9 月 17–19 日的恢复记录也说明“所有 no-progress 都是同一种 hang”是错误分类。公开证据分别记录了 checkpoint shutdown、InfiniBand port failure、permanent-checkpoint metadata deletion failure，以及后来带 GPU reset/NVLink mask 的 `CUDA_ERROR_CONTAINED`；Iris 均恢复了 optimizer progress。9 月 17 日的记录把 step 114,000 failure 定位为 remote metadata copy 后的 temporary-source delete 被 bucket policy 拒绝，PR #9215 随后移除这条 remote delete path。Checkpoint 126,000 在新的 metadata-publication path 下成功完成，但其 restore 尚未公开测试。[M107][M108][M115]

> **概念解释｜Job 恢复不等于故障域恢复**
>
> W&B step 超过事故前最高点，可以确认训练 job 已经恢复；它不能告诉我们故障 rack 是否完成 reboot 与 health checks、是否被 quarantine，或者 scheduler 是否改用了其他 rack。恢复证据必须注明层级：**job-level progress** 已确认，**node/rack-level health** 仍未知。

> **小练习｜判断恢复证据的边界**
>
> 已知事故记录在 10:55Z 显示 attempt 2 仍在 building，稍后的 W&B 从 step 72,344 增长到 72,348。可以确认什么？答案：可以确认同一 run lineage 已重新产生 optimizer progress；不能据此确认 rack 394 已修复或仍在 placement 中。[M62][M52]

> **概念解释｜Scale-dependent failure domain**
>
> 单 rack 测试可以覆盖一个 EP domain 内的 kernel、显存和 collective；11 racks 才会出现多个 EP domains 与跨 rack AllReduce 的交互。反过来，一次 multi-rack replay 跑过 235 steps 也不能证明低概率、timing-sensitive 的故障已经消失。规模测试要同时考虑**拓扑覆盖**与**观察时长**。

> **概念解释｜部署事件与处理效果是两种证据**
>
> 新 run 已经启用 0.02 weight decay，是可由 launch record 与 W&B 验证的部署事实；它是否改善最终 loss、gate norm 或 eval，则要靠更长时间的 treatment/control 比较。不能因为“已经上线”就写成“已经有效”。

> **概念解释｜如何确认 planned → confirmed**
>
> PR #9043 合并只能证明默认配置变了；launch comment 证明干净 main commit 与 checkpoint 被提交；200-step result 证明新 run 实际产生了 optimizer progress；W&B 继续增长则证明它仍在运行。四层证据连起来，才足以把“ragged 将重返 production”改写成“ragged 已成为 production Hero”。[M67][M68][M69][M73]

> **小练习｜部署确认与效果归因**
>
> 哪些说法成立？①“Hero production 已切到 ragged”；②“QuACK 0.6.4 单独带来 1.65 percentage points MFU”；③“NCCL header alignment 已修复 hang”；④“新 run 能从自己的 checkpoint 恢复”。答案：①与④已确认；②无法从组合 candidate 隔离；③错误，因为同 signature 已在 step 83,308 再次出现。[M64][M68][M69][M71][M72]

> **概念解释｜观测到异常不等于找到根因**
>
> Barrier telemetry、QuACK test 与 pooled-wave NVLink fault 都是高价值证据，但证据强度不同。Pooled-wave 事件曾把“特定 fabric domain 故障”提升为最强假设；后续 source audit 与官方 closing record 又迫使这个解释降级。正确的因果链仍需捕获“某一具体 event → 某 rank 无法到达 barrier → 其 EP peers 永久等待”，不能用一次正确的 link 预警补齐没有被观测的中间环节。[M75][M76]

> **小练习｜局部预测正确，不等于整体因果故事正确**
>
> 已知 link 14 的 505-event warning 精确预告了同一 link 五天后的 Xid 149。请判断：① per-link telemetry 有预测价值；② 整个 fleet 正在退化；③ 该 link fault 导致了此前 silent ragged hang。答案：①有直接证据；②与官方 96% training availability 和观测 fault rate 不符；③缺少 blocked operation 与同一 failure path，不能成立。[M76][M77]

> **概念解释｜质性 probe 不是 benchmark**
>
> 单条 prompt completion 很适合发现 failure mode：step-78K 样本既展示了正确的中间推理，也暴露了低温下的 repetition loop。但一个样本没有任务分布、对照组、置信区间或统一评分规则，不能估计模型的总体能力，也不能替代固定 eval。[M66]

> **小练习｜把观察与结论分开**
>
> 请判断三句话：①“step-78K 样本解出了这道题”；②“Hero 的推理能力已经整体提升”；③“ragged 已再次部署到 production”。答案：①已确认；②缺少 benchmark，只能视为未支持的推断；③现在已确认，因为 main launch、200-step result 与持续增长的 W&B run 共同构成 production evidence。[M66][M68][M69][M73]

# 第 32 章　截至 9 月 22 日的状态、未决问题与观察清单

## 32.1 已确认

- 选定 data mixture 已从 permanent step-108,000 checkpoint 进入 production；phase weights 与已合并的 PR #9162 一致，step 108,004 已产生正常训练指标；[M93][M94]
- PDL-off + validated-wheel handoff 通过 194 个 paired steps，MFU 23.62% 对 control 23.03%、tokens/s +2.6%，并继续越过 2,052 steps；这是组合 candidate 的部署证据，不是 PDL root-cause proof；[M96][M97][M98]
- 9 月 18 日的 clean-main handoff 从经过核验的 step-121,638 checkpoint 恢复，通过 200-step gate，成为 `hero-main-step121638` production lineage；[M99]
- 截至 9 月 22 日，公开 W&B 位于 step 139,999，最新 point 为 instantaneous train loss 1.2145、instantaneous MFU 24.43%、16.07 秒/step；step 137,999 live eval 为 Paloma 0.79771、UncheatableEval 0.51879；[M100]
- 9 月 20 日的固定 completion 报告保存 checkpoint 102,000 与 108,000 的 prompt samples，并附 checkpoint、source revision、tokenizer 与 sampling provenance；它们是质性记录，不是 benchmark；[M110]
- 9 月 17–19 日的 checkpoint、InfiniBand、metadata 与 contained-CUDA interruptions 均已恢复；step 114,000 的 metadata failure 已定位到被 policy 拒绝的 remote delete，permanent checkpoint 126,000 已在新 metadata path 下完成，但 restore 未测试；[M107][M108][M115]
- Checkpoint-101,316 frozen probes 显示 `lm_head` 贡献约 95% total gradient norm，并排除了 kernel artifact 与 dropped-token direct effect；团队将其视为稳定的 new normal，不建议 intervention；[M101]
- 535.3B / 22.76B Hero 已在 4K context pretraining；
- scaling ladder 与 risk logic 已公开；
- 早期模型 parameter norm 未见 NaN/Inf 或明显爆炸；
- 多次 checkpoint/host-memory 故障被定位并缓解；
- coordinator、cache、checkpoint overlap、telemetry 与 recovery 路径已得到加强；
- 一次节点连接故障后整个 gang 自动恢复；
- pooled-wave 在 backend trial 前到达 step 54,262；回滚后又推进到完整的 step-58,014 temporary checkpoint；[M42][M47]
- ragged all-to-all backend 与 JAX 0.11.1 支持已合入 main；
- ragged candidate 在真实 11-rack topology 完成 70 个正常 steps，达到约 23.4% MFU、assignment drop 低于 0.01%，随后两次 hang；[M42][M43]
- production rollback 已完成并核验；新的 `hero-wd-gate-router-p02-step58k` run 已从 step 58,014 恢复，明确使用 pooled-wave 并启用 0.02 gate/router weight decay；[M41][M47][M49][M50]
- 第二次 ragged telemetry window 后，production 又从强制保存的 step-61,806 checkpoint 恢复；[M54][M55]
- 9 月 5 日 pooled-wave production 在 step 65,069 后静默 15 分钟，随后 rack 10 报出 contained CUDA/NVLink fault；Iris 从 step 64,944 重启，回退 125 steps；[M58][M59]
- 9 月 7 日，另一个 rack 报出 Xid 149 NETIR_LINK_DOWN 与 Xid 154 Drain and Reset，Iris 重新排队整个 gang；中断前 attempt 到达 step 72,344；[M62]
- Pooled-wave lineage 推进到 step 81,919，并提供 step 81,716 handoff checkpoint；新的 main-commit run 从该点恢复；[M68]
- PR #8959、#9043 与 #9062 已合并；single-executable fix、QuACK 0.6.4、ragged all-to-all 与 NCCL 2.30.7-header PJRT wheel 已由 launch record 确认进入 production；[M64][M65][M67][M68][M70]
- main-commit ragged run 通过配对 200-step gate，官方记录明确将它作为此后的 Hero；[M69]
- 9 月 14 日历史快照的旧 ragged lineage 曾推进到 step 102,898；它随后经过 mixture、PDL-off 与 clean-main 三次有证据的 handoff，不能再被当作当前 run；[M73][M93][M96][M99]
- 新 run 在完成 step 83,307 后再次 hang；watchdog 终止 gang，Iris 从 step 83,305 恢复并越过原 stall step；[M71][M72]
- 恢复后的 attempt 又因 rack index 9 的 uncorrectable NVLink fault 终止，Iris 再次重试；[M74]
- source audit 在 Hero 实际执行的 LSA path 中没有发现缺失的 local CTA synchronization；remote GIN branch 的两个 deadlock schedules 不适用于 `gin=false` 的 Hero path；[M75]
- `s9jvxs64` GPU 0 link 14 的手工 warning 提前五天点中了同一 link 的 Xid 149；该节点通过 L12 qualification 后已返回 production；[M76][M77]
- 官方关闭记录撤回“fabric faults 是 #8870 leading explanation”的早期归因；fleet training availability 为 96%，观测 fault rate 不支持 fleet 正在恶化；[M76]
- PR #8911 的 replicated-sharding 修复现已由 production launch 确认加载，但之后再次发生 hang，证明它本身没有消除故障；[M65][M68][M71]
- 公开记录确认 step-78,000 checkpoint 已完成一条 prompt-completion sample；它是 checkpoint 存在与质性行为的证据，不是 benchmark；[M66]
- 固定公开评测已经覆盖到 step 45,837 checkpoint：dropless Paloma macro BPB 0.8188、UncheatableEval BPB 0.5362；[M35][M36]
- 最终 open-weight sweep 测得 DeepSeek V4 Pro 的 Paloma macro BPB 为 0.6759，并以 0.4491 领先当前 15-subset UncheatableEval；这不是 Hero 最终能力实测；[M35][M61]
- PR #8873 已把 clean-main launch、handoff checkpoint、200-step matched gate、Finelog monitoring 与 rollback 写成可复用 Hero cutover playbook；[M82]
- PR #9120 已合并 Hero chart range 与早期 Paloma filtering changes；这确认代码进入 main，不确认 Grafana production 已部署；[M83]
- 固定 H100 mixture artifact 已披露 candidate 的三段 configured sampling weights；它确认 candidate recipe 的构造，不确认 production Hero 已加载；[M90]
- Open Athena 的 Datakit 报告确认 research pipeline 从 152 个开放数据集、25.25T Llama-3 tokens 出发，经 global deduplication 移除 2.33B documents 与 2.13T tokens，再分入 40×5 cells；当前公开 proxy dataset 有 872 条 observations。[M92]
- per-layer norm logging 已合入。

## 32.2 实验中

- 67B 上的 262K/长文档 skew side experiment 已建立；
- 535B-shape 的 262K 单 rack probe 已 compile、restore 并完成，但它仍是 side experiment；
- ragged EP 的多项 latency 优化在单 rack A/B 中约提升 4% tokens/s，zero-init 优化另测得约 +0.4 MFU；相关 stack 在 9 月 2 日 trial 后回滚；9 月 10 日 ragged 又通过 production gate。此条描述早期实验，不能据此判断截至快照的 backend，也无法隔离单项优化贡献；[M34][M40][M42][M44]
- step-48K checkpoint 上，把 attention-gate logit scale 从 1.0 降到 0.8 仅让 macro loss 增加 0.010；降到 0.6、0.4 则分别升至 2.7852、8.4599，说明 learned gate 已经 load-bearing；[M37]
- faithful 11-rack ragged replay 在同一 state 与重叠 batches 上完成 235 steps 且未 hang，未在该窗口复现相同 data/state 下的确定性触发；有限窗口不能排除其他确定性触发条件，也不足以证明 timing-sensitive fault 已消失；[M48]
- 第二次 183-step 11-rack window 测得六次 80–160 ms pre-copy straggler events，集中在 replica indices 8–10 且在不同 nodes 间游走；尚不确定它是否与 hang 同源；[M55]
- QuACK 0.6.1 原 scheduler 在 synthetic GB200 contention 下三次产生未写入的 GEMM outputs；修复与 no-CLC controls 正常，但与 Hero hang 的因果关系未证实；[M56]
- 配对 200-step window 测得 ragged MFU 23.11% 对 pooled-wave 21.46%、capacity overflow 7.8e-5 对 3.4e-2、peak HBM 103.6 对 136.3 GiB；这是组合 candidate 结果，不能隔离单项贡献；[M69]
- checkpoint timing 显示 ragged 有 11 个超过 median 1.5× 的 intervals 落在 checkpoint step 到 step+4，pooled-wave 只有 1 个；实际 hangs 的分布仍然混合，不能推断 checkpoint 或 watch boundary 是根因；[M75]
- 单 rack、55-step XLA `ragged_dot` replacement 测得 median MFU 23.77%、peak HBM 109.7 GiB，QuACK control 为 24.84% 与 114.0 GiB；四次 XLA runs 中两次 hang，它仍是 open research branch，不是 production Hero change；[M78]
- Draft #9119 的 earlier revision 在 sequence length 262,144、EP16×CP4、global batch 16 下完成 40 个单 rack Hero-shape updates，测得 median MFU 10.03%、mean dropped assignments 1.42%；它不能证明 long-context quality 或 production phase change；[M80]
- 修正后的 Larry-matched gated-latent treatments 已全部完成：d512 为 3.569422 对 3.570037，近乎持平；d768 为 3.219741 对 3.214935，略差。每个 cell 只有一个 seed，未观察到 loss 或 load-balance gain，也没有启动更大 cells；它不是 production Hero change；[M81]
- 最终 H100 mixture report 测得 d1536 Paloma macro BPB 0.918442 对 original ladder 0.925068（低 0.72%，15/16 subsets 改善），对应 1.20× compute-equivalent speedup；Wikipedia 退化 0.50%，pre-switch separation 与 recipe differences 仍阻止无混杂因果归因；[M84][M95][M109]
- Coordinated Python GC 的单 rack checkpoint-enabled validation 完成 410 updates、5 次 saves 与 3 次 evaluations；rank-0 HBM 平稳，current RSS 在 saves 后恢复。PR #9266 已把 interval 100 合入 Hero launcher，但没有 matched control、704-rank 最慢 collector 或成熟 checkpoint restore 证据，也没有新的 production launch record；[M99][M102][M103][M113]
- Fresh-init synthetic-data 的 535B-shape 65K run 在 192 张 H100 上完成十个 finite updates，PP24/EP8 median MFU 15.52%；它不验证 production-checkpoint continuation、长期稳定性或学习质量；[M105]
- 完成的 d512/d768 fast-track feature screen 显示 attention residuals 在 d768 达到 1.19× throughput-adjusted speedup；192-dimensional MLA 虽改善 loss，却因离开 FA4 fast path 而降至 0.16× throughput-adjusted speedup。它们是 small-scale experiments，不是 current Hero change；[M111]
- 完成的 d512→d1280 residual-width screen 中，2× width 的 FLOP efficiency 为 0.99–1.03×，结合 MFU 后推导 wall-clock speedup 为 1.13–1.28×；3× width 的 FLOP efficiency 只有 0.84–0.92×。这些是 MLA + Inkling small-ladder 结果，不是 current Hero change；[M114]
- 一条 step-78K、temperature 0.2 的 prompt sample 正确推导出 day 14，却反复核验约 35 次直到 4,096-token context limit，且没有输出要求的 boxed answer；这是质性 failure-mode probe；[M66]
- 0.02 gate/router weight decay 已进入 production；它的部署是已确认事实，但收益仍需长期观测。[M41][M47][M52]

## 32.3 计划中或待确认

- multi-rack ragged hang 的精确根因；source audit 已排除两个不在 Hero path 的 GIN deadlocks，也没有在 LSA path 找到 local synchronization 缺口，第一个 blocked GPU operation 仍未捕获；[M45][M75]
- infra 能否提供 host XID/NVSwitch logs，并在下一轮加入 per-rack NVLink preflight 与对齐 barrier reports 的 1 Hz sampler；[M58][M59]
- rack 394 的 Xid 149 起因、哪些 nodes 完成了 provider recovery，以及该 rack 是否被 quarantine；[M62]
- #8870 hang 的 initiating rank、kernel、NIC 或 fabric event；header alignment 可能降低频率，但已经确认没有消除故障；[M45][M70][M71]
- 为什么旧 header wheel 四次立即失败，而新 header builds 合计约 1,900 steps 后才复现；这需要可比 allocation 与更长 exposure，不能从观察数据直接归因；[M70][M71]
- #9086 是否能把 L0–L17 recovery counters 稳定接入 main、修复四个 dead metric specs，并在真实 load 下重新观测 link 14；L12 是否检查这些 counters、相关 NVSwitch firmware 是否含对应修复仍未知；[M76][M77]
- XLA `ragged_dot` branch 的两次 hang 原因、dependency/wheel promotion 与多 rack correctness；没有这些证据时不能替代 QuACK production path；[M78]
- #9116–#9119 context-parallel draft stack 是否能完成 review、进入 main 并通过 production handoff gate；当前 4K Hero 尚未确认进入 long-context phase；[M63][M80]
- Mixture 已部署、d1536 也已完成；剩余未知是 mixture 在 production trajectory 上的因果效果，因为 live data 在 handoff 时改变，而 scaling ladders 仍有 recipe differences；[M93][M95]
- PDL-off 的长窗口与 hazard mechanism 一致，却不能证明 PDL 是 #8870 root cause；CLC scheduling 与其他 timing-sensitive alternatives 仍需第一个 blocked GPU operation 来区分；[M45][M96][M97]
- Coordinated GC 已合入 launcher，最新 standup 计划把它与 SM100-native attention kernels 部署到 Hero；在出现新的 launch/handoff 证据前，两者仍是计划而不是 production 状态；[M99][M112][M113]
- checkpoint 126,000 是否能 clean restore；metadata publication 已成功，不等于 restore semantics 已验证；[M107][M108][M115]
- 65K H100 short run 能否转移到 production checkpoint continuation、长时间稳定性与学习质量；[M105]
- attention residuals、cross-layer KV 与 tied embeddings 能否在完整 d1024/d1280 ladder 保持收益，并最终进入 535B recipe；当前没有 production handoff 证据；[M111]
- MLA + Inkling residual-width 结果能否转移到 current 535B architecture、tokenizer、GB200 topology 与长训练跨度；1.13–1.28× 目前是 scaling-law-assisted estimate，不是 direct time-to-quality measurement；[M114]
- 0.02 gate/router weight decay 对长期 loss、gate norm 与 eval trajectory 的实际影响；[M41][M47]
- #8870 新增了一条“diagnosis 与 capture limitations 已更新”的公开通知，但所链 Echo note 要求 Marin Google 登录；公开证据无法核验其内容，因此 initiating operation 与精确根因仍未知；[M86]
- 动态 W&B step、token 与 eval trajectory 如何继续变化；
- 30% gradient peak 是否匹配 ladder；
- 4K→8K→65K→262K 的最终 schedule；
- early cooldown、midtraining 与 RL checkpoint；
- final base model 与 post-trained model 的能力。

## 32.4 Operational ETA 是动态推断，不是承诺

已合并的 PR #9082 用当前 W&B run ID 下实际推进的 steps 除以 elapsed wall time，再把剩余 steps 外推为 Grafana completion date。它不会把继承 checkpoint 的历史 steps 算作当前 run 的速度，restart、checkpoint、eval 与 outage 都会降低观测 rate；在 step 85,956 时，projection 指向 11 月 18 日。[M79]

这比用峰值 tokens/s 推算更接近真实 goodput，但仍是 **inference**：只要未来 throughput、故障率或训练 recipe 改变，日期就会移动。它不是官方保证的 finish date，更不是模型发布或本站 deployment schedule。

## 32.5 实测 checkpoint 与最终预测不能混在一起

固定报告把两种性质不同的数字放在了一起：[M35][M53]

- **实测值**：step 45,837 checkpoint 的 dropless Paloma macro BPB 为 0.8188；
- **推断值**：预注册 recipe 预测最终 Paloma BPB 为 0.7406。

9 月 22 日的 live W&B 在 step 137,999 记录了 Paloma macro BPB 0.79771 与 UncheatableEval macro BPB 0.51879。[M100] 它们是实测值，不是预测；但动态 summary 会随新 evaluation 覆盖，也没有固定报告的永久版本语义。正确引用方式是“截至快照时的 live W&B evaluation”，而不是“最新固定报告”。

0.7406 来自对最终 dropless loss 的预测与 loss→BPB 换算，并假设原始 4K context、data mixture 和 token horizon 继续成立。报告给出的换算 bootstrap 区间只覆盖 conversion uncertainty，不覆盖训练预测误差；如果 recipe 中途改变，这个反事实比较的解释力也会下降。因此它可以回答“原始计划按预测走完时可能在哪里”，不能回答“最终模型已经达到什么能力”。

9 月 4 日扩展报告加入 Kimi K2 Base：其**实测** Paloma macro BPB 为 0.6754，比 Hero 的**预测** 0.7406 低 8.8%，并在 16 个 subsets 中有 14 个更低。[M53] Seed OSS 36B 与 OLMo 3 32B 也完成同版本 full-coverage 评测，分别为 0.8089 与 0.8146。Training-data overlap 仍未知。这说明 macro forecast 可以用于航线校准，却不能压缩成“Hero 已经超过现有 open-weight baseline”的能力结论。

随后加入的 DeepSeek V4 Flash Base 实测 Paloma macro BPB 为 0.7351，比 Hero forecast 低 0.8%；但 subset 比较方向混合：Flash 在 7/16 subsets 更低，Hero forecast 在 9/16 更低。[M57] 最终固定报告又加入 DeepSeek V4 Pro Base 与 Mistral Large 3 Base：前者 Paloma 为 0.6759，接近 Kimi K2 的 0.6754，并以 0.4491 领先当前 15-subset UncheatableEval；后者两项分别为 0.7759 与 0.4909。[M61] Hero 没有当前 suite 的 UncheatableEval forecast 或最终实测，因此这些数字不能压缩成最终能力排名。

> **小练习｜给证据贴标签**
>
> 请分别给下面五句话标注“已确认、计划中、实验中、推断或未知”：① ragged Hero 已从 main commit 运行并通过 200-step gate；② 所有 ragged hangs 都由同一种 fabric fault 导致；③ QuACK 0.6.4 已进入 production；④ NCCL header alignment 已经消除 hang；⑤ Hero 最终 Paloma BPB 会是 0.7406。答案：①已确认；②未知；③已确认，但效果未隔离；④错误，step 83,308 已复现；⑤推断。[M61][M64][M68][M69][M71]

## 32.6 最值得每日跟踪的七条主线

1. **Loss/eval vs scaling projection**；
2. **Gradient norm：global 与 per-layer**；
3. **MoE routing/drop 与 expert load**；
4. **MFU/tokens/s/progress efficiency**；
5. **Data mixture 与 phase transition**；
6. **Transport/backend/precision migration**；
7. **Checkpoint、restore、node failure 与 uptime**。

---

# 第六部分　把它变成你的 Large-Scale LLM Training 课程

# 第 33 章　每天怎样读 W&B 与 GitHub，而不是被信息淹没

## 33.1 先问“今天真的变了什么”

每日更新应按以下顺序：

1. 主 run 的 step/phase 是否变化；
2. 发生 production intervention 了吗；
3. loss/eval/gradient/drop 是否偏离；
4. 新 PR 是 production 已部署、实验结果，还是只是 draft；
5. side experiment 与 Hero 主 run 是否被混淆；
6. 今天新增的概念是什么。

## 33.2 W&B 五图法

初学者每天只需要先看：

- Train loss（平滑与 raw）；
- Validation/Paloma；
- Global + per-layer gradient norm；
- Expert drop/load/router entropy；
- MFU/tokens/s 与 step duration。

然后结合 LR、data phase、checkpoint/eval 标记解释曲线。

## 33.3 GitHub issue 与 PR 的状态词

- **Open issue**：问题存在或实验进行中；
- **Draft PR**：代码/方案还在形成；
- **Merged PR**：代码进入 main，但不保证已经部署到正在运行的 Hero；
- **Production trigger/relaunch**：才可能改变主 run；
- **Matched A/B**：强于非对照 benchmark，但仍需检查 scale、checkpoint 与 runtime；
- **Conclusion**：实验作者的归纳，仍需看证据。

## 33.4 建立自己的 Voyage Log

建议每天记录一行：

| 日期 | 已确认进度 | 生产变化 | 模型信号 | 系统信号 | 今日概念 | 未决问题 |
|---|---|---|---|---|---|---|

三个月后，你得到的不是 90 篇新闻，而是一条可追溯的 training trajectory。

# 第 34 章　诊断 Playbook：看到异常时先做什么

## 34.1 第一步：划分 failure domain

**模型/数值域**：loss spike、grad runaway、NaN、parameter norm、router collapse。

**数据域**：train loss phase shift、validation 不变、source/cell 变化、contamination、shuffle。

**性能域**：MFU 降、step time 增、collective tail、kernel regression。

**可靠性域**：OOM、node loss、checkpoint/restore、scheduler、object storage。

## 34.2 第二步：定位 topology

- 所有 ranks 还是 writer ranks？
- 所有 layers 还是深层？
- 所有 experts 还是少数热点？
- 每 step 还是 checkpoint/eval step？
- 全局 data phase 还是单 source/cell？

## 34.3 第三步：找 reference

- scaling ladder 同位置是否有相同动态；
- 上一 checkpoint 是否正常；
- matched control 是否复现；
- 小规模 synthetic benchmark 是否一致；
- code/config/data artifact 是否变化。

## 34.4 第四步：最小干预

优先选择可回滚、影响边界明确的 intervention：增加 coordinator retry、限制 cache、修 retained futures、增加 telemetry，而不是在没有证据时全局砍 LR 或改 architecture。

## 34.5 第五步：验证数学连续性

任何 restore 或 migration 后至少检查：loss continuity、parameter hash/norm、optimizer slots、LR/step、data offset、RNG、drop 与 MFU。

# 第 35 章　12 周学习计划：Virtual Frontier Model Training Residency

![12 周学习路线](marin_tutorial_assets/10_study_plan.png)

## Week 1–2：从零实现 30M–100M Dense LM

学习 tokenizer、embedding、causal attention、RMSNorm、SwiGLU、cross-entropy、AdamW。产出：能在小语料上稳定训练、保存、恢复，并解释每个 tensor shape。主教材可使用 Stanford CS336 的 tokenizer/model/optimizer assignment。[M32]

## Week 3：性能模型

学习 FLOPs、arithmetic intensity、HBM、SRAM、kernel launch、profile。产出：为自己的模型计算理论 FLOPs、实测 tokens/s、估算 MFU。

## Week 4：Attention kernel 与精度

比较 naive attention、PyTorch SDPA/FlashAttention；理解 BF16/FP32 master、loss scaling、fused CE。产出：profile report。

## Week 5：分布式并行

在 2–8 GPU 上实现/使用 DP、FSDP，画出 TP/EP 的数据流。产出：一次可恢复 distributed run。

## Week 6：Scaling ladder

训练 4 个规模或 4 个 compute budget，拟合 loss 与 compute 的 power law，预测 held-out rung。产出：预注册报告与预测误差。

## Week 7：数据工程

做语言识别、质量特征、exact/fuzzy dedup、污染扫描、train/validation split。产出：dataset card 与 artifact fingerprint。

## Week 8：Data mixture

设计至少两个 mixture 与一个 cooldown；比较每 token learning efficiency。产出：matched A/B 与结论边界。

## Week 9：Toy MoE

把 dense FFN 替换为 8–32 experts、Top-1/Top-2；记录 routing entropy、expert load 与 drop。产出：MoE dashboard。

## Week 10：Load balance 与 capacity

改变 capacity factor、aux loss、router noise，分析质量/吞吐/drop trade-off。

## Week 11：All-to-all、checkpoint 与 fault injection

模拟 rank failure、checkpoint interruption、错误 data offset；验证恢复一致性。产出：incident retrospective。

## Week 12：Mini Hero Run

把以上组件组合成一个 100M–300M total MoE / 20M–50M active 的完整项目：run contract、scaling prediction、data artifact、W&B、checkpoint、eval、postmortem。

# 第 36 章　六个必须亲手完成的实验

## 实验 1：Loss prediction

训练三个小 rungs，拟合：

**L(C) = A · C^(−α) + B。**

在第四个 rung 之前写下预测区间，再训练验证。学习目标：扩展律不是画一条漂亮曲线，而是做可证伪预测。

## 实验 2：Token drop heatmap

记录 `layer × expert` 的 token count、drop 与 entropy。人为制造 skew，观察 global average 如何掩盖局部热点。

## 实验 3：Checkpoint consistency

保存 FP32 master + BF16 working copy；写一个错误 migration 从 BF16 恢复，再比较 1,000 steps 后 trajectory。学习 silent numerical corruption。

## 实验 4：Goodput

人为每 100 steps 暂停、失败、恢复。比较 peak tokens/s、active share 与 progress efficiency，证明最快 step 不等于最快完成。

## 实验 5：Data phase shift

不改 model，只改变 data source 顺序或 mixture，观察 train loss 与 validation 的不同响应。学习区分 data shift 与 model instability。

## 实验 6：Production change gate

为一个更快 kernel 建立：unit correctness → microbench → short training → checkpoint A/B → migration plan → rollback。学习从 research result 到 production adoption 的门槛。

# 第 37 章　历史上的开放训练项目：Marin 的前辈与差异

![开放训练的历史谱系](marin_tutorial_assets/11_open_training_history.png)

## 37.1 BigScience BLOOM

BLOOM 是 176B dense multilingual model，由 BigScience 协作训练并公开模型、数据卡、技术栈与多个 intermediate checkpoints。它证明大规模协作式 open science 可以完成工业规模训练。[O1]

## 37.2 Pythia

Pythia 提供 70M–12B 的统一 suite，每个模型保存 154 个 checkpoints，模型按相同数据顺序训练，特别适合研究 learning dynamics 与 causal intervention。[O2]

## 37.3 LLM360

LLM360 承诺公开训练数据及其 step mapping、最多数百个 checkpoints、metrics 与 preprocessing/training code，强调“最终权重不足以理解模型”。[O4]

## 37.4 OLMo

Ai2 的 OLMo/OLMoE 开放 data、code、recipe、intermediate checkpoints、evaluation 与 post-training artifacts，形成更完整的 fully-open model flow。[O3]

## 37.5 Marin 的差异

Marin 不是第一个开放训练项目；它的新意在于把现代大规模 MoE、custom JAX/XLA kernels、GB200 topology、live PR/incident log 与 mid-run decisions 放在同一个 open-development system 中。它更接近“开放一个 2026 年的 frontier model control room”。

# 第 38 章　学完 Marin，是否等于加入 OpenAI/Anthropic/DeepMind 训练组？

## 38.1 高层生命周期高度相似

大型实验室同样需要 data pipeline、scaling experiments、architecture/optimizer selection、distributed training、checkpoint/recovery、eval、long-context、SFT/RL 与 safety。公开技术报告也显示 predictive scaling、fault tolerance 与大规模并行是 frontier model development 的核心。[F1][F2]

## 38.2 Marin 能给你的三类能力

1. **术语与系统图**：看到 EP、MFU、z-loss、data mix、checkpoint schema 时知道它们处在什么位置。
2. **诊断思维**：从 symptom 划分 failure domain，寻找 matched control，避免过度干预。
3. **实验治理**：run contract、pre-registration、artifact provenance、PR gate、rollback 与 retrospective。

## 38.3 它不能替代的 tacit knowledge

真正的 frontier lab 还包含 proprietary data、内部 eval、超大 cluster scheduling、未公开 architecture、成本与资源争夺、安全审核、值班制度，以及亲手承担数千万美元 run 风险积累的判断力。

因此更准确的定位是：

> **Marin 是公开世界中非常接近 foundation-model training apprenticeship 的项目，但不是对内部经验的完全替代。**

## 38.4 你应该达到的毕业标准

三个月后，你不需要声称“可以独立训练 Claude”。更现实且有价值的标准是：

- 读懂大型 training config；
- 画出数据与通信拓扑；
- 解读 loss/grad/drop/MFU/checkpoint 指标；
- 区分模型、数据、系统与观测问题；
- 设计 scaling ladder 与 matched A/B；
- 为 mid-run migration 写出 state-semantics 与 rollback checklist；
- 能和 foundation-model engineer 进行具体技术对话。

---

# 附录 A　核心术语表

| 术语 | 简明定义 | 在 Hero 中的具体含义 |
|---|---|---|
| Active parameters | 每个 token 实际调用的参数 | 约 22.76B |
| All-to-all | 每个 rank 向多个 rank 发送不同数据 | token 往返 experts |
| Capacity factor | expert buffer 相对平均负载的容量倍数 | 1.15 |
| Checkpoint | 可恢复的训练状态快照 | 参数、optimizer、step、sharding 等 |
| Cooldown | 训练后期改变 LR/data 的集中学习阶段 | reference mix 后 20% |
| Data cell | 语义 cluster × 质量层级 | Harrier 200 cells |
| Data Parallel | 不同 replica 处理不同 batch shard | 跨 11 racks |
| Expert Parallel | experts 分布在不同设备 | rack 内 EP64 |
| GQA | 多个 Q heads 共享 K/V heads | local 12 KV、global 6 KV |
| Goodput | wall-clock 中转化成有效进度的比例 | progress efficiency |
| MFU | 有效模型 FLOPs / 理论峰值 FLOPs | Hero transport A/B 约 22% |
| MoE | 每 token 只激活部分 experts | 384 选 8 + 2 shared |
| Muon | 对矩阵更新做正交化的 optimizer family | Hero 使用 MuonH |
| Paloma | 多域语言模型 evaluation suite | macro loss 监控 |
| Ragged collective | 支持动态长度的 collective | 新 all-to-all backend |
| RoPE | 旋转位置编码 | Hero 使用 half-RoPE |
| Router | 为 token 选择 experts 的模块 | QB histogram balancing |
| Scaling ladder | 多个小规模 rungs 预测大 run | 61M active → 22.76B active |
| Token drop | 超过 expert/transport capacity 的 assignment 被丢弃 | pooled 约 2.67%，ragged A/B 约 0.018% |
| Z-loss | 控制 logits 尺度的辅助 loss | final logit z-loss 1e-4 |

# 附录 B　公式与数量级速查

## B.1 每 step token

**Tokens/step = Batch_seq × SeqLen。**

Hero nominal：**11,264 × 4,096 ≈ 46.14M tokens。**

## B.2 Progress efficiency

**PE = actual new tokens ÷ (reference tokens/sec × wall-clock seconds)。**

## B.3 MFU

**MFU = (analytic model FLOPs per step ÷ step seconds) ÷ aggregate hardware peak FLOPs。**

## B.4 MoE average capacity

简化表达：

**Capacity per expert ≈ (Tokens × K ÷ E) × CapacityFactor。**

## B.5 Scaling law

常用经验形式：

**L(C) = A · C^(−α) + B。**

其中 B 是不可约或拟合 floor，α 控制随 compute 改善的速度。

# 附录 C　每日学习简报模板

## 今日状态

- 日期：
- 当前确认 step/token：
- 当前阶段：pretrain / cooldown / context extension / post-training
- 主 run 是否发生 production change：

## 新事实

1. 发生了什么？
2. 官方证据是什么？
3. 这是主 run、side experiment 还是计划？

## 技术解释

- 影响模型能力、数值稳定、性能、可靠性还是项目进度？
- 它与之前哪条主线相连？
- 哪些指标应该验证？

## 风险与未决问题

- 是否存在 recipe divergence？
- 是否需要 matched control？
- 是否有 silent state risk？

## 今日课程

- 一个概念：
- 一个公式/图：
- 一个小练习：

# 附录 D　大型训练 Incident Retrospective 模板

1. **摘要**：时间、影响、丢失进度、是否影响参数质量。
2. **检测**：哪个 alert/metric 首先发现。
3. **Timeline**：逐分钟事件。
4. **Failure domain**：模型/数据/系统/观测。
5. **Root cause**：直接原因、促成因素、为何未提前发现。
6. **Recovery**：从哪个 checkpoint、是否保持 run identity、验证了什么。
7. **Corrective action**：立即修复、长期修复、owner、deadline。
8. **Regression test**：怎样防止复发。
9. **Learning**：对 architecture、infra 或 process 的更新。

# 附录 E　学习检查题

1. 为什么 535B-A23B 不能简单与 23B dense 等价？
2. 在固定 token batch 下，context 增大为何可能加剧 expert drop？
3. Scaling ladder 为什么能发现只在大规模发生的 gradient dynamics？
4. Train loss phase shift、validation 不变时，为什么应优先怀疑 data path？
5. Writer ranks RSS 上升而 non-writer 不变，如何缩小故障域？
6. MFU、active share 与 progress efficiency 各自遗漏了什么？
7. 为什么一个 merged PR 不等于 production Hero 已经改变？
8. FP32 master → BF16 working copy 的错误 migration 为什么危险？
9. 为什么监控系统也会影响训练 goodput？
10. 设计一次从 pooled-wave 切到 ragged 的完整 rollback checklist。

# 附录 F　来源索引

以下来源优先选择 Marin 官方 GitHub、官方文档、Open Athena/Marin 报告、Stanford 课程与原始论文。访问日期截至 2026-09-22。

## Marin 主项目与 Hero Run

- **[M1]** [Marin GitHub README：Open Development 与当前工作](https://github.com/marin-community/marin/blob/main/README.md)
- **[M2]** [Hero Run #8435：535B-A23B on 18T tokens](https://github.com/marin-community/marin/issues/8435)
- **[M3]** [Hero Run Ongoing Status #8506](https://github.com/marin-community/marin/issues/8506)
- **[M4]** [Hero Run #8435 的完整模型配置、optimizer、拓扑与输出评论](https://github.com/marin-community/marin/issues/8435#issuecomment-5335872267)
- **[M5]** [Marin Standup — Week of August 17, 2026](https://github.com/marin-community/marin/issues/8394)
- **[M6]** [Marin Standup — Week of August 24, 2026](https://github.com/marin-community/marin/issues/8669)
- **[M7]** [PR #8549：Ragged All-to-All Expert Parallelism](https://github.com/marin-community/marin/pull/8549)
- **[M8]** [PR #8684：Make Ragged All-to-All the Hero Default](https://github.com/marin-community/marin/pull/8684)
- **[M9]** [PR #8633：Transfer Gaussian Process for Data Mixtures](https://github.com/marin-community/marin/pull/8633)
- **[M10]** [Hero Scaling Ladder Source](https://github.com/marin-community/marin/blob/main/experiments/grug/moe_hero_ep/launch_scaling_ladder.py)
- **[M11]** [Fixed Pooled-Wave Expert Parallelism Report](https://storage.googleapis.com/marin-public/rav/moe-fixed-wave-a2a-384/2026.08.17/index.html)
- **[M12]** [PR #8623：Hero Progress Efficiency](https://github.com/marin-community/marin/pull/8623)
- **[M13]** [PR #8619：Training Active Share](https://github.com/marin-community/marin/pull/8619)
- **[M14]** [PR #8642：TensorStore cache 125GB → 1GB](https://github.com/marin-community/marin/pull/8642)
- **[M15]** [PR #8647：Overlap TensorStore Open with Checkpoint Staging](https://github.com/marin-community/marin/pull/8647)
- **[M16]** [PR #8663：Checkpoint Telemetry](https://github.com/marin-community/marin/pull/8663)
- **[M17]** [PR #8589：Restore One Replica and Broadcast](https://github.com/marin-community/marin/pull/8589)
- **[M18]** [PR #8617：Production Hero Trigger / Coordinator Retry](https://github.com/marin-community/marin/pull/8617)
- **[M19]** [PR #8559：Region-local Rolling Checkpoints](https://github.com/marin-community/marin/pull/8559)
- **[M20]** [PR #8566：W&B Full Loss Curve](https://github.com/marin-community/marin/pull/8566)
- **[M21]** [Agent MoE Experiment Digest](https://marin.readthedocs.io/en/latest/reports/agent-moe-experiments/)
- **[M22]** [Marin 32B Retrospective](https://marin.readthedocs.io/en/latest/reports/marin-32b-retro/)
- **[M23]** [Delphi：Scaling Laws That Extrapolate 300× Past the Fit](https://openathena.ai/blog/delphi/)
- **[M24]** [Mixture of Experts Quantile Balancing](https://openathena.ai/blog/quantile-balancing/)
- **[M25]** [PR #8689：Per-layer Parameter/Gradient Norm Logging](https://github.com/marin-community/marin/pull/8689)
- **[M26]** [Issue #8734：2× Long-context Data Skew at 262K](https://github.com/marin-community/marin/issues/8734)
- **[M27]** [Issue #8233：Next Hero Run Burndown](https://github.com/marin-community/marin/issues/8233)
- **[M28]** [PR #8556：Cold-cache Install / S3 SlowDown](https://github.com/marin-community/marin/pull/8556)
- **[M29]** [PR #8571：Levanter Telemetry Separation](https://github.com/marin-community/marin/pull/8571)
- **[M30]** [Node-agent/DCGM discovery optimization](https://github.com/marin-community/marin/pulls?q=is%3Apr+dcgm+node+agent)
- **[M31]** [PR #8716：Upgrade JAX to 0.11.1](https://github.com/marin-community/marin/pull/8716)
- **[M32]** [Stanford CS336：Language Modeling from Scratch](https://cs336.stanford.edu/)
- **[M33]** [Issue #8754：535B-shape 262K One-rack Probe](https://github.com/marin-community/marin/issues/8754)
- **[M34]** [PR #8753：Ragged EP Latency Optimizations](https://github.com/marin-community/marin/pull/8753)
- **[M35]** [Issue #8824：Compare Hero to Open-weight Base Models on PPL](https://github.com/marin-community/marin/issues/8824)
- **[M36]** [固定报告：Hero BPB Forecast and Open-weight Comparison](https://storage.googleapis.com/marin-public/held/hero-open-weight-ppl/2026.08.31.4/index.html)
- **[M37]** [Issue #8818：Hero Attention-gate Checkpoint Analysis](https://github.com/marin-community/marin/issues/8818)
- **[M38]** [Marin Standup — Week of August 31, 2026](https://github.com/marin-community/marin/issues/8830)
- **[M39]** [Hero step-50K IB Recovery Record](https://github.com/marin-community/marin/issues/8506#issuecomment-5502471700)
- **[M40]** [PR #8822：Remove Ragged Zero-init Copies](https://github.com/marin-community/marin/pull/8822)
- **[M41]** [PR #8833：Gate/Router Weight Decay](https://github.com/marin-community/marin/pull/8833)
- **[M42]** [Hero Ragged Production Trial Launch](https://github.com/marin-community/marin/issues/8506#issuecomment-5518372559)
- **[M43]** [Hero Ragged Production Trial Rollback](https://github.com/marin-community/marin/issues/8506#issuecomment-5518830230)
- **[M44]** [Pooled-wave Rollback Verification](https://github.com/marin-community/marin/issues/8506#issuecomment-5518941160)
- **[M45]** [Issue #8870：Multi-rack Ragged EP Hang](https://github.com/marin-community/marin/issues/8870)
- **[M46]** [固定报告：Expanded Hero BPB and Open-weight Comparison](https://storage.googleapis.com/marin-public/held/hero-open-weight-ppl/2026.09.03.2/index.html)
- **[M47]** [Hero Step-58,014 Production Relaunch](https://github.com/marin-community/marin/issues/8506#issuecomment-5534208221)
- **[M48]** [11-rack Ragged Reproduction Result](https://github.com/marin-community/marin/issues/8870#issuecomment-5534213125)
- **[M49]** [PR #8884：Pooled-wave Fallback for the EP Hero](https://github.com/marin-community/marin/pull/8884)
- **[M50]** [PR #8890：Hand Hero Relaunch Off from Step 58,014](https://github.com/marin-community/marin/pull/8890)
- **[M51]** [PR #8858：Record Hero Launch Source Provenance](https://github.com/marin-community/marin/pull/8858)
- **[M52]** [公开 W&B：Hero Step-58K Continuation](https://wandb.ai/marin-community/marin_moe/runs/hero-wd-gate-router-p02-step58k)
- **[M53]** [固定报告：2026-09-04 Hero BPB and Open-weight Comparison](https://storage.googleapis.com/marin-public/held/hero-open-weight-ppl/2026.09.04.1/index.html)
- **[M54]** [Hero Step-61,806 Relaunch Request](https://github.com/marin-community/marin/issues/8506#issuecomment-5547644106)
- **[M55]** [11-rack Barrier Telemetry Window](https://github.com/marin-community/marin/issues/8870#issuecomment-5547757908)
- **[M56]** [QuACK 0.6.1 GB200 Corruption Reproduction](https://github.com/marin-community/marin/issues/8870#issuecomment-5548861875)
- **[M57]** [固定报告：Hero Forecast and DeepSeek V4 Flash Comparison](https://storage.googleapis.com/marin-public/held/hero-open-weight-ppl/2026.09.04.2/index.html)
- **[M58]** [Pooled-wave Hero NVLink Fault and Recovery](https://github.com/marin-community/marin/issues/8870#issuecomment-5554893088)
- **[M59]** [Issue #8934：GB200 NVLink Fabric Fault Investigation](https://github.com/marin-community/marin/issues/8934)
- **[M60]** [QuACK 0.6.4 Upgrade Branch Status](https://github.com/marin-community/marin/issues/8870#issuecomment-5555213202)
- **[M61]** [固定报告：Final Hero Forecast and Open-weight Baseline Sweep](https://storage.googleapis.com/marin-public/held/hero-open-weight-ppl/2026.09.05.1/index.html)
- **[M62]** [Rack-394 Xid 149 Production Incident](https://github.com/marin-community/marin/issues/8934#issuecomment-5569621715)
- **[M63]** [Marin Standup — Week of September 7, 2026](https://github.com/marin-community/marin/issues/8970)
- **[M64]** [PR #8959：Upgrade QuACK with the CLC Scheduling Fix](https://github.com/marin-community/marin/pull/8959)
- **[M65]** [PR #8911：Fix Duplicated Hero Train-step Compilation](https://github.com/marin-community/marin/pull/8911)
- **[M66]** [Hero Step-78K Prompt Completion Sample](https://github.com/marin-community/marin/issues/8827#issuecomment-5594290387)
- **[M67]** [PR #9043：Return the EP Hero to Ragged All-to-All](https://github.com/marin-community/marin/pull/9043)
- **[M68]** [Ragged Hero Redeployed from Main](https://github.com/marin-community/marin/issues/8506#issuecomment-5609817090)
- **[M69]** [Ragged Hero 200-step Production Result](https://github.com/marin-community/marin/issues/8506#issuecomment-5610467489)
- **[M70]** [PR #9062：Use a PJRT Wheel Built with NCCL 2.30.7 Headers](https://github.com/marin-community/marin/pull/9062)
- **[M71]** [First Hang on the New Ragged Hero](https://github.com/marin-community/marin/issues/8506#issuecomment-5614639876)
- **[M72]** [Ragged Hero Hang Recovery](https://github.com/marin-community/marin/issues/8506#issuecomment-5614680529)
- **[M73]** [公开 W&B：Ragged Hero Step-81K Continuation](https://wandb.ai/marin-community/marin_moe/runs/hero-ragged_a2a-nccl2307-ep-step81k)
- **[M74]** [Ragged Hero Rack-9 NVLink Fault](https://github.com/marin-community/marin/issues/8506#issuecomment-5615346838)
- **[M75]** [Ragged Hero Source Audit and Checkpoint Timing](https://github.com/marin-community/marin/issues/8870#issuecomment-5622750841)
- **[M76]** [NVLink Attribution Correction and Issue Closure](https://github.com/marin-community/marin/issues/8934#issuecomment-5625217090)
- **[M77]** [Issue #9086：Per-link NVLink Counter Collection](https://github.com/marin-community/marin/issues/9086)
- **[M78]** [Issue #9077：Replace QuACK Expert MLP with XLA Ragged Dot](https://github.com/marin-community/marin/issues/9077)
- **[M79]** [PR #9082：Project Hero Completion Date in Grafana](https://github.com/marin-community/marin/pull/9082)
- **[M80]** [PR #9119：Enable Context-parallel Hero Training](https://github.com/marin-community/marin/pull/9119)
- **[M81]** [Issue #9110：Gate RMS-normalized Latent Features for Routing](https://github.com/marin-community/marin/issues/9110)
- **[M82]** [PR #8873：Deploy Hero Change Playbook](https://github.com/marin-community/marin/pull/8873)
- **[M83]** [PR #9120：Set Hero Chart Ranges and Filter Early Evaluations](https://github.com/marin-community/marin/pull/9120)
- **[M84]** [Issue #9126：Compare the Mixture-swap Scaling Ladder](https://github.com/marin-community/marin/issues/9126)
- **[M85]** [固定报告：H100 Mixture-swap Paloma Comparison](https://storage.googleapis.com/marin-public/held/h100-mix25-paloma/2026.09.12.3/index.html)
- **[M86]** [Ragged-hang Diagnosis Update Notice](https://github.com/marin-community/marin/issues/8870#issuecomment-5649942949)
- **[M87]** [公开 W&B：H100 Mixture-swap d1024](https://wandb.ai/marin-community/marin_moe/runs/h100-mix25-20260912-d1024)
- **[M88]** [公开 W&B：H100 Mixture-swap d1536](https://wandb.ai/marin-community/marin_moe/runs/h100-mix25-20260912-d1536)
- **[M89]** [固定报告：更新后的 H100 Mixture-swap Paloma Comparison](https://storage.googleapis.com/marin-public/held/h100-mix25-paloma/2026.09.13.2/index.html)
- **[M90]** [固定报告：H100 Mixture-swap Phase Weights](https://storage.googleapis.com/marin-public/held/h100-mix25-paloma/mixture-phases-2026.09.13.1/index.html)
- **[M91]** [固定报告：H100 Mixture-swap d1536 Forecast and Backtests](https://storage.googleapis.com/marin-public/held/h100-mix25-paloma/forecast-2026.09.13.1/index.html)
- **[M92]** [Open Athena：Curating 25 Trillion Tokens for LLM Pretraining](https://openathena.ai/blog/marin-data-pipeline-overview/)
- **[M93]** [Hero Mixture Production Handoff](https://github.com/marin-community/marin/issues/8506#issuecomment-5684891157)
- **[M94]** [PR #9162：Check in the Selected Hero Mixture Phases](https://github.com/marin-community/marin/pull/9162)
- **[M95]** [固定报告：Final H100 Mixture-swap Scaling Report](https://storage.googleapis.com/marin-public/held/h100-mix25-paloma/final-2026.09.15.1/index.html)
- **[M96]** [PDL-off Hero 200-step Production Gate](https://github.com/marin-community/marin/issues/8506#issuecomment-5690222518)
- **[M97]** [PR #9183：Launch QuACK Grouped GEMMs without PDL](https://github.com/marin-community/marin/pull/9183)
- **[M98]** [PR #9179：Deploy the Validated Ragged A2A PJRT Wheel](https://github.com/marin-community/marin/pull/9179)
- **[M99]** [Main-branch Hero Cutover from Step 121,638](https://github.com/marin-community/marin/issues/8506#issuecomment-5734989379)
- **[M100]** [公开 W&B：Hero Main Continuation from Step 121,638](https://wandb.ai/marin-community/marin_moe/runs/hero-main-step121638)
- **[M101]** [Issue #9148：Hero Gradient-norm Diagnosis](https://github.com/marin-community/marin/issues/9148)
- **[M102]** [Issue #9205：Hero Python-GC Timing Diagnosis](https://github.com/marin-community/marin/issues/9205)
- **[M103]** [PR #9224：Coordinate Python Garbage Collection across Ranks](https://github.com/marin-community/marin/pull/9224)
- **[M104]** [Issue #9180：Checkpoint-time Jemalloc Purge Experiment](https://github.com/marin-community/marin/issues/9180)
- **[M105]** [Issue #9277：535B-shape 65K H100 Side Experiment](https://github.com/marin-community/marin/issues/9277)
- **[M106]** [Marin Standup — Week of September 14, 2026](https://github.com/marin-community/marin/issues/9171)
- **[M107]** [September 19 Hero Incident and Recovery](https://github.com/marin-community/marin/issues/8870#issuecomment-5746060303)
- **[M108]** [PR #9215：Publish Remote Checkpoint Metadata without Delete](https://github.com/marin-community/marin/pull/9215)
- **[M109]** [固定报告：H100 Mixture Swarm](https://storage.googleapis.com/marin-public/held/h100-mix25-paloma/swarm-2026.09.14.1/index.html)
- **[M110]** [固定报告：Hero Checkpoint Completions（2026-09-20）](https://storage.googleapis.com/marin-public/rav/hero-completions/2026.09.20/index.html)
- **[M111]** [Issue #9290 最终评论：Fast-track MoE Feature-addition Results](https://github.com/marin-community/marin/issues/9290#issuecomment-5751106823)
- **[M112]** [Marin Standup — Week of September 21, 2026](https://github.com/marin-community/marin/issues/9324)
- **[M113]** [PR #9266：Enable Coordinated GC in the Hero Launcher](https://github.com/marin-community/marin/pull/9266)
- **[M114]** [Issue #9317：Residual-stream Scaling on the MLA + Inkling MoE Stack](https://github.com/marin-community/marin/issues/9317)
- **[M115]** [Step-114K Checkpoint Metadata Failure Diagnosis](https://github.com/marin-community/marin/issues/8506#issuecomment-5707969984)

## 基础论文

- **[P1]** [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- **[P2]** [GQA: Training Generalized Multi-Query Transformer Models](https://arxiv.org/abs/2305.13245)
- **[P3]** [RoFormer: Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
- **[P4]** [Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467)
- **[P5]** [FlashAttention](https://arxiv.org/abs/2205.14135)
- **[P6]** [Switch Transformers](https://arxiv.org/abs/2101.03961)
- **[P7]** [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)
- **[P8]** [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556)
- **[P9]** [Muon is Scalable for LLM Training](https://arxiv.org/abs/2502.16982)
- **[P10]** [ST-MoE: Designing Stable and Transferable Sparse Expert Models](https://arxiv.org/abs/2202.08906)

## 开放训练历史

- **[O1]** [BigScience BLOOM Model Card](https://huggingface.co/bigscience/bloom)
- **[O2]** [EleutherAI Pythia](https://github.com/EleutherAI/pythia)
- **[O3]** [Ai2 OLMo / Fully Open Model Flow](https://allenai.org/olmo)
- **[O4]** [LLM360：Fully Transparent Open-source LLMs](https://www.llm360.ai/news/introducing-llm360-fully-transparent-open-source-llms.html)

## Frontier lab 对照资料

- **[F1]** [GPT-4 Technical Report](https://arxiv.org/abs/2303.08774)
- **[F2]** [Gemini Technical Report](https://arxiv.org/abs/2312.11805)

# 结语

Marin 535B-A23B 最值得学习的不是某个数字、某个 optimizer 或某次事故，而是一种完整的研究方法：**先用小实验建立预测；用公开 run contract 把假设写清；让数据、模型与系统共同可观测；故障时先定位 failure domain；任何 mid-run change 都必须保护 state semantics；最终用评测而不是规模验证成功。**

如果你把这次三个月 voyage 真正跟完，并亲手完成第 35–36 章的实验，你获得的将不只是“看懂一篇模型报告”，而是一套能迁移到未来任何 foundation-model 项目的训练思维。
