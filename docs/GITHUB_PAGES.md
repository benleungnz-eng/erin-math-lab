# GitHub Pages 发布与验收

目标仓库：`benleungnz-eng/erin-math-lab`；自动发布分支 main。
预定网址：**https://benleungnz-eng.github.io/erin-math-lab/**

网址只有在 Actions deploy 成功、HTTP 返回应用后才算已上线。不要把预定网址当成已验证结果。

## 首次设置

1. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
2. 使用免费 Pages 时确认仓库是 Public。公开前检查所有分支/标签历史；当前源文件通过扫描不等于历史与 Git 作者邮箱已被抹除。本次不擅自改写历史或公开一个尚未核实的私有仓库。
3. Actions 启用后，main 提交触发 `.github/workflows/pages.yml`；也可在 Actions 手动运行。
4. workflow先测试后部署，部署 job 仅 `pages:write` 与 `id-token:write`，其他 job 只有 `contents:read`；不填写个人Token或服务密钥。

## 自动检查

npm ci → 公开文件扫描 → 格式 → 逻辑/构建测试 → build → dist清单检查 → Chromium功能与PWA验收 → 上传静态artifact → deploy-pages。

第三方依赖仅用于开发/CI；学生访问时只有同源静态文件，不调用 GitHub API、CDN、AI或后台。官方Actions均固定到已核对的commit。

## 子路径与更新

- HTML、模块、图片、manifest均使用相对路径，支持 `/erin-math-lab/`。
- manifest `start_url`/`scope` 为 `./`，SW脚本也从当前目录注册，不能控制其他仓库路径。
- 构建会生成 `.nojekyll`；全量资源清单生成离线缓存。
- SW缓存名包括 package版本、资源内容哈希与路径。即使未手动改版本，资源变动也能触发新版安装。
- 新版等待学生确认，未完成session不强制刷新；更新不调用删除数据库或清localStorage。旧版本缓存保留保护旧标签。
- IndexedDB名字和schema保持原样。改域名属于不同浏览器存储源，必须主动导出导入；不能承诺自动跨域。

## iPad 真实验收

1. Safari 打开正式地址，确认显示 v1.0.1，等待“离线已就绪”。若首次在线访问失败，不能靠PWA离线功能完成首次安装。
2. 分享 → 添加到主屏幕；以后直接点同一个图标，main更新不需要换链接。
3. 做到第三题，填半个答案、展开帮助、写草稿；关闭再开，确认同题、输入和笔迹仍在。
4. 用“带我一步一步做”实际完成微步骤，完成五题，放置/移动基地物件。
5. 缓存完成后断网、彻底关页，从图标重开，完成练习或建造。Pencil、横竖屏和画布外滚动需真机确认。
6. 新版发布后联网打开，完成当前轮再点更新，确认历史、库存和基地均在。不要用清站点数据更新。

## 当前环境权限与状态

Git HTTPS读写已验证。GitHub管理API与Pages域名最初被云环境网络策略403拦截，所需域名已存入环境配置草稿：api.github.com、benleungnz-eng.github.io。需要环境设置保存/发布后重试。GitHub API认证尚不能据此判定有效或无效。

在管理API/站点访问恢复前，不能核实可见性、启用Pages、读取Actions日志或宣称URL已部署。后续以实际远端工作流状态和HTTP检查补充。本地测试结果不是远端发布成功。

## 公开内容与历史检查结果

- 新 main 的当前文件已去除私人交接摘录、个人联系方式、诊断附件和旧部署账号地址；自动扫描覆盖已追踪文本与禁止文件类型。
- 未发现密钥文件、学习备份或真实作答数据。运行资源只有HTML/CSS/JS、本地生成图片和图标。
- 旧 production-v1 分支和 v1.0.0 标签曾发布早期背景说明；Git作者邮箱也在历史元数据中。这些旧引用没有被擅自删除或重写，当前文件扫描不应被解读为整个仓库历史已清洗。
- 新main快照以原始main为父提交，不把旧production-v1历史并入main。若仓库仍为私有，公开前仍需仓库所有者审阅其他分支/标签和作者元数据。若需要清理旧发布引用，应单独批准，避免丢失版本回退依据。

## 本地验证记录（v1.0.1）

26 项逻辑/构建测试、19 个浏览器场景、6 个PWA恢复场景通过；增加同版本号资源修改后缓存标识变化的回归。构建清单验证相对路径、manifest、全量缓存资源与.nojekyll。现有学习数据库名字和schema未改动。

本地构建与公开文件扫描通过不代表远端Actions已运行或Pages已上线。管理API与正式URL访问仍被环境策略阻断，后续以实际状态补充。
