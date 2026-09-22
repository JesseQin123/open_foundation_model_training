# Open Foundation Model Training

Solo Unicorn 的中文模型训练学习原型：6 个单元、18 课，包含讲解、例子与理解检查。第 1 课含互动，后续为入门阅读课；38 章 Marin 技术材料可在课程内展开，另有 83 条历史训练记录。

运行：`npm run prototype`，打开 http://localhost:4317。

验证：`npm run verify`。

生产构建：`npm run build`。先验证课程、引用和导航，再将 11 个公开静态资源输出到 `dist/`；本地工具和编辑笔记不进入网站产物。

部署配置：Vercel `jesse-workspace/atlas`，关联此仓库的 `main` 分支。正式域名为 `https://atlas.solounicorn.club`；DNS 由 Cloudflare 管理。后续推送到 `main` 会触发 Vercel 构建。开发环境的布局实验不会在生产站点启用。

- [内容与阅读结构审查](CONTENT_AUDIT.md)：已修正、已对照与待复核项。
- [课程与资料映射](CURRICULUM_INTEGRATION.md)。
- [原型说明](prototype/NOTES.md)与[验证记录](prototype/QA.md)。

默认首页按六个单元组织。原型布局实验仅在 `?layouts=1&variant=A`（或 B / C）开启。历史记录不代表实时状态，来源可达不等于事实已核验。
