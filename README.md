# Erin Math Lab · v1.2.0

轻量三科学习PWA：数学保持原有难度，生物和地理用图示与短句建立概念。每次选一科，原创搭档陪完整轮；没有倒计时、排名或补签压力。

- 正式站点：https://benleungnz-eng.github.io/erin-math-lab/
- 家长报告：https://benleungnz-eng.github.io/erin-math-lab/#reports
- [v1.2功能、七天内容、迁移、资源依据与验收](docs/V1_2_HANDOFF.md)
- [部署与iPad步骤](docs/GITHUB_PAGES.md) · [测试记录](docs/QA_REPORT.md)

## 本地开发

Node >=22（Actions使用24），锁定依赖，无运行时第三方服务。

```sh
npm ci
npm test
npm run build
npm run verify:dist
npm start
```

浏览器验收用已有Chromium，默认`/usr/bin/chromium`，或通过`CHROMIUM_PATH`指定Playwright安装的浏览器。启动服务后运行：

```sh
TEST_URL=http://127.0.0.1:4173/ npm run test:browser
npm run test:pwa
npm run format:check
npm run audit:public
```

生产文件在`dist/`，资源与manifest/SW均为相对路径。main提交由GitHub Actions测试、构建、部署到原Pages子路径；PR仅验证。缓存名包含内容哈希，不强制刷新未完成的任何学科练习，不清除IndexedDB、localStorage或其他应用缓存。

## 内容与数据

数学仍为原有精确有理数/整式引擎，基础5题、可选3+2题，日期种子与内容指纹避免原题重复。生物和地理各7次，基础4题、可选2题，共84题；按完成次序推进，周末可做，缺席不惩罚，完成七次后不循环发旧题。

12位原创SVG搭档，每位15类事件状态及4种变化，同事件最近3次避免重复。本轮搭档锁定；完成后解锁新搭档，全部解锁后得星星。旧基地、方块、奖励、数学题面与手写记录保留。旧七个角色位置转换为七位原创搭档，不继续使用官方形象。

原schema2存档自动增加版本化academy扩展，支持导出/保守合并/替换及导入前恢复。新家长报告version2增加学科，向前读取旧version1数学报告，重复导入不重复计数。报告仅文件分享，无远程监控、自动上传、账号或数据库服务。家长记录与学生记录分开保存。

浏览器或系统清理存储仍可能丢本地数据，主屏幕安装不保证永久保存。切换域名前先导出；本次沿用原网址。诊断原件、个人材料、真实学习记录及私密备份不进入公开仓库。公开内容扫描不等于清除Git历史或作者元数据。
