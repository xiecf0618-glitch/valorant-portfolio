# VALORANT Portfolio · V6 FINAL RELEASE

谢昌峰的《无畏契约》端游与手游商业化及电竞生态分析作品集。

固定简历链接：**https://xiecf0618-glitch.github.io/valorant-portfolio/**

## 内容基线

**CONTENT LOCKED — 2026-09-07**

唯一基线为《无畏契约端手游商业化与电竞生态分析(2).docx》。上传PDF与DOCX正文、两份工作产出一致，作为网站完整报告提供。公开资料范围保持终稿的2026-09-02；链接检查不构成研究内容更新。

- [23 Scene 内容审计](docs/23-scene-content-audit.md)
- [基线证据与附录边界](docs/baseline-evidence.md)
- [内容锁定回归](docs/content-lock-review.md)
- [逐 Scene 段落映射](docs/scene-baseline-map.json)
- [来源核验](docs/source-link-review.md)
- [V6 本地验收](docs/v6-release-qa.md)
- [素材来源与尺寸](docs/asset-manifest.json)

保留23个Scene锚点，区分FACT、ANALYSIS、HYPOTHESIS、VALIDATION。附录使用终稿真实图1与图2B；原稿只有图2A题注，网站不补造截图。

## 源码与维护

无框架、无第三方运行时依赖的静态网站。`index.html`维护正文与来源，`styles.css`维护视觉，`app.js`负责标签、目录、阅读进度和键盘交互。`assets/`保存本地素材、PDF与工作图；`docs/`保存审计与验收；`scripts/`提供本地服务与构建检查。

使用Node.js 22或更新版本，无需安装依赖：

```sh
node scripts/serve.mjs --port 4173
node scripts/build.mjs
```

本地`/__qa`检查1440×900、1366×768、390×844的实际iframe布局视口。展开完整Scene只用于纵览；精确视口检查时关闭该选项。

构建输出`dist/`，校验Scene、来源及本地资源。旧版gzip/base64解压入口已移除，全部正文直接写入HTML；无JS时可阅读全部标签内容。

## 发布

现有仓库的`main`推送后，由`.github/workflows/pages.yml`自动构建和发布GitHub Pages。只上传`dist/`，开发工具不进入发布产物。继续使用同一仓库与固定公网地址。

原V5提交`54c63b18b7f25277f7a78b9c45fad673ac4d45d1`保留在历史中，可按Git提交回退。Netlify不是本次发布的前置条件。

素材权利归各自权利人。本项目为独立研究与求职展示，非Riot官方项目。
