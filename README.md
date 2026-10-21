# 幻蓝想要和你表白

一场约 2–3 分钟的视觉小说互动体验。直播结束后，幻蓝为你打开了一条私人频道。

## 本地运行

无需安装依赖，运行：

```sh
python3 -m http.server 8765 --directory dist
```

然后在浏览器打开 `http://127.0.0.1:8765/`。

## 功能

- 昵称输入、三幕选择与心动值反馈
- 按回应生成“安心坐标”“同频心动”“双向奔赴”结尾寄语
- 逐字对白、对话回看、可开关的原创程序配乐
- 带昵称与结尾寄语的 PNG 纪念卡
- 手机和桌面适配，支持重新游玩

昵称、选择和回忆仅保存在当前页面内存中，刷新后清除；不会提交到服务器。

## GitHub Pages

本仓库使用 GitHub Actions 发布 `dist/`。在仓库 **Settings → Pages → Build and deployment** 中，将 Source 设为 **GitHub Actions**。推送到 `main` 分支后自动部署。

## 文件

- `dist/index.html`：页面结构
- `dist/styles.css`：响应式样式与演出
- `dist/app.js`：剧情、分支、配乐与纪念卡
- `dist/assets/`：幻蓝新版插画
- `ASSET_PROMPTS.md`：插画的生成提示词

幻蓝是项目所有者的自有 IP。插画依据所有者提供的参考重新设计，未额外附加开源授权。
