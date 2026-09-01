# Sentry 健康报告 · 查询与版式

## 查询

环境过滤一律 `environment:{env}`。本仓库测网 Vite `MODE` 是 **`testenv`**，禁止写成 `test` / `staging`。组织/项目**以本次 MCP 解析结果为准**，不要沿用文档里的旧 slug。

查询**优先用 telemetry-kit 0.3 tag**；title 字符串只给升包前的旧事件兜底。慢接口与 API 失败可能是 warning，**不要**只查 `level:error`，否则会漏断网和慢接口。

| 目的 | dataset | 要点 |
|---|---|---|
| 最早/最晚事件 | `errors` | `fields: timestamp`，`sort: timestamp` / `-timestamp`，`limit: 1` |
| 失败总量 | `errors` | 排除 `perf_type:slow_api`；`count()`、`count_unique(user)` |
| 慢接口总量 | `errors` | **`tags[perf_type]:slow_api`**（不要写裸 `perf_type:slow_api`，Discover 会报 Unknown attribute）；`count()`、`count_unique(user)` |
| 失败构成 | `errors` | 优先 `api.failure`：`timeout` / `network` / `http` / `business` / `parse`；无该 tag 且非慢接口 → 前端崩溃。旧事件兜底：title 含 `Network Error` / `timeout` / `status code` |
| Top 慢接口 | `search_issues` | `perf_type:slow_api` 或 title 含 Slow API，`sort: freq`；**按归一化路径归并**（去掉毫秒后缀） |
| HTTP / 业务码失败 | `search_issues` | `api.failure:http` 或 `api.failure:business` |
| 前端崩溃 | `search_issues` | 无 `api.failure`、无 `perf_type:slow_api`：TypeError / ReferenceError / chunk 等 |
| 网络情况 | `errors` | 只在 `api.failure:network` 与 `tags[perf_type]:slow_api` 上聚 `net.offline`、`net.effective_type`；写成「一、」表后一段 callout |
| 错误落在哪页 | `errors` | 本窗口告警（可含偏慢）的 `transaction` + `count()`；`/play*` 合成「播放页」 |
| 体验 | `spans` | `transaction.op:pageload` 的 `p75(measurements.lcp|fcp|cls|ttfb)`；`has:measurements.inp` 的 p75 |
| 首页请求 | `spans` | `transaction:/`；接口用 `span.op:http.client`；脚本/图用 `resource.script` / `resource.img`；`avg` + `p95` + `count()` |

`count()` 在 metrics 校验里有时要带参数；失败则换 spans/errors 聚合。

`net.*` 不进 fingerprint，不能用来定责 CDN。全局 `window.error` / `unhandledrejection` **没有** kit 的 `category` 和 `net.*`。

## 归类口径

领导稿饼图沿用旧口径：**把偏慢和失败画在同一张「错误构成」里**（分母 = 本窗口告警总次数）。表里仍要分清两盘账，避免把「成功但慢」说成崩溃。

| 盘 | 识别 | 含义 | 出现位置 |
|---|---|---|---|
| 成功但慢 | `perf_type:slow_api` | 请求成功，超过环境阈值（生产约 5s，测网约 8s） | 饼图「接口偏慢」+ 偏慢接口表 |
| 失败 | 有 `api.failure`，或前端崩溃 | 请求发出去了但没有成功结果 | 饼图其余扇区 + 请求失败表 + 前端异常表 |

失败细分：

- **超时**：`api.failure:timeout`
- **网络中断**：`api.failure:network`；默认 warning
- **HTTP**：`api.failure:http`（5xx；4xx 仅 404/429 等白名单）
- **业务码**：`api.failure:business`
- **解析**：`api.failure:parse`
- **前端崩溃**：无上述 tag

饼图各类占比之和应对齐**告警总次数**；对不齐时以总量为准，构成写「约」。第三张卡写「接口偏慢占比」= 慢接口次数 / 告警总次数。

## 网络情况（版式）

偏慢表下：有 `net.effective_type` 才画 4g / 3g / 未标注饼图（可并列「中断时的网速」）。全空则省略，不要画 100% 未标注。**不要**离线饼图。未标注必须解释。图例带占比。

页面条：只画 Top 5。次数高、用户极少且未进 Top 5 的，用图表下一行说明，不要追加细柱。

## 请求失败（版式）

饼图 + 四类一句定义 + 表（含占比）。表下只写 401/取消/大部分 4xx 不上报。定义见 SKILL。

## 前端异常（版式）

四列：`问题`（产品语言 + Issue 短链，不要 Replay）| `大概原因` | `次数 / 用户` | `影响范围`（保留局部红 / 接口级橙）。映射见 SKILL。

## 降噪（解释「变少」时必须带一句）

kit 默认**不上报**：取消请求、鉴权 401/403（及配置的鉴权业务码）、大部分客户端 4xx（404/429 会报）。报告里「HTTP 失败变少」可能只是被滤掉，不是产品变好了。

## 抖音实验室对照（2026-08-19 GTmetrix，未重测则沿用）

| 项 | 抖音 |
|---|---|
| 主内容出现 | 约 3.7 秒 |
| 首次有内容 | 约 2.9 秒 |
| 网页开始返回 | 约 1.0 秒 |
| 页面跳动 | 约 0.01 |
| 点了之后有反应 | 实验室未测 |

我们侧用 Sentry 现场 P75。两边条件不同，只看量级。测网样本量通常很小，对照仍可画，但结论写「仅看量级」。

## PDF 章节骨架（对齐 8 月 24 日那份）

1. 标题「{展示名} {生产\|测网}环境问题汇总」+ 芯片：环境、`actualStart — end（北京时间）`
2. 数据来源一段：Sentry 真实用户；体验约 5% 采样；对照来源（若开启）；测网注明与生产共用项目。**不要**「打开原始列表」链接。
3. 怎么读：发生次数 / 涉及用户 / 偏慢 vs 请求失败 / 未标注 / 页面加载采样（约 5%）
4. 汇总结论（产品现象，不要在这里展开网络）
5. 三卡：发生次数 / 涉及用户 / 接口偏慢占比
6. **一、错误在报什么**：饼图 + 页面条形
7. 偏慢的接口表 + 网速饼图（有数据才画；4g/3g/未标注，不画离线）
8. 请求失败：构成饼图 + 定义 + 表（含占比）
9. 前端异常表（问题 / 大概原因 / 次数 / 影响范围，保留红橙 pill）
10. **二、页面体验** + 首页请求表（再次点明这是页面加载采样）

## 导出

```bash
# HTML 仅临时目录；PDF 仅当前用户桌面（不要写死 /Users/...）
# macOS / Linux: $HOME/Desktop
# Windows: %USERPROFILE%\Desktop
# 生产文件名：{展示名}生产环境问题汇总-YYYY-MM-DD.pdf
# 测网文件名：{展示名}测网环境问题汇总-YYYY-MM-DD.pdf

# macOS 示例
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --font-render-hinting=none --force-device-scale-factor=2 \
  --no-pdf-header-footer \
  --print-to-pdf="$HOME/Desktop/${PDF_BASENAME}.pdf" \
  "file:///tmp/sentry-health-report.html"
rm -f /tmp/sentry-health-report.html
open -a Preview "$HOME/Desktop/${PDF_BASENAME}.pdf"
```

Windows 把 Chrome 换成本机 `chrome.exe`，桌面用 `%USERPROFILE%\Desktop`，用 `start` 打开 PDF。同环境同日多次刷新则覆盖同名文件。
