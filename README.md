<p align="center">
  <img src="./frontend/public/yingxu-logo.svg" width="112" height="112" alt="映序 Yingxu Logo" />
</p>

<h1 align="center">映序 · Yingxu</h1>

<p align="center"><strong>映你所寻，序你所藏。</strong></p>
<p align="center">面向个人服务器与 NAS 的媒体发现、订阅与入库管理工具。</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.3.0-2563eb?style=flat-square" alt="版本 1.3.0" />
  <img src="https://img.shields.io/badge/platform-Linux%20amd64-334155?style=flat-square" alt="Linux amd64" />
  <img src="https://img.shields.io/badge/deploy-Docker-2496ed?style=flat-square&amp;logo=docker&amp;logoColor=white" alt="Docker 部署" />
  <img src="https://img.shields.io/badge/DockerHub-v1.3.0-2496ed?style=flat-square&amp;logo=docker" alt="DockerHub 镜像 v1.3.0" />
</p>

<p align="center">
  <a href="#主要功能">主要功能</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#首次配置">首次配置</a> ·
  <a href="#emby-302-反代">Emby 302</a> ·
  <a href="#re0-自动订阅与积分">自动订阅</a> ·
  <a href="#数据备份与升级">备份升级</a> ·
  <a href="https://github.com/wiltonicp/yingxu/issues">问题反馈</a>
</p>

---

映序将影视发现、订阅、资源匹配、115 入库、整理刮削和 STRM 输出串联为清晰、可追踪的流程。既适合个人媒体库，也支持管理员审核与普通用户订阅申请。

**发现 / 订阅 → 资源匹配 → 115 核对入库 → 整理刮削 → STRM / NFO → 媒体服务**

> **v1.3.0 已发布**：[DockerHub 镜像](https://hub.docker.com/r/wiltonicp/yingxu/tags)现已支持公开拉取。默认 Web 入口 **3008**，可选 Emby 302 反代入口 **18099**；使用 Linux host 网络，无需端口映射。

## 主要功能

| 能力 | 使用说明 |
| --- | --- |
| 影视发现 | TMDB 搜索与推荐、豆瓣推荐、影视详情及订阅状态。 |
| 持续订阅 | 用户申请与管理员审核；电影达标入库后结束订阅，剧集按准确季集持续补集。 |
| 资源来源 | 归档 TG 公开频道资源，支持种子手动入库及 RE0 手动搜索、定时抓取。 |
| 115 入库 | 扫码连接、目录选择、接收清单核对；复核已有内容后只补缺集。 |
| 整理与刮削 | 分类命名、字幕关联、质量比较及受控洗版。 |
| STRM / NFO | 生成媒体索引和元数据，签名播放入口不向播放器交付网盘凭证。 |
| Emby 联动 | 媒体库展示、账号关联、可选用户同步及带用户权限核对的302反代。 |
| 任务追踪 | 查看任务进度、日志与失败原因，对不明结果先核对再恢复。 |

## 支持环境

| 项目 | v1.3.0 目标 |
| --- | --- |
| 部署方式 | Docker Engine + Docker Compose 插件 |
| CPU 架构 | Linux x86-64 / `linux/amd64` |
| 默认页面端口 | host 网络直接监听 `3008`；可选 Emby 302 入口默认 `18099` |
| 持久化目录 | `/app/data` 和 `/app/library` |
| 容器运行用户 | UID/GID `1000:1000` |

目前不是集群部署方案，不支持多个实例同时写同一数据库或同一账号任务。ARM 平台不在首版验收范围内。

## 快速开始

镜像提供 **`wiltonicp/yingxu:latest`**（当前最新版）和 **`wiltonicp/yingxu:v1.3.0`**（固定版本）。下方使用 `latest`；需要锁定版本时，将 `image` 改为 `wiltonicp/yingxu:v1.3.0`。

部署前请确认：

- 已安装 Docker Engine 和 Docker Compose 插件；本配置使用 Linux host 网络。
- 使用 Linux x86-64 主机，默认端口 **3008** 未被占用。
- 已准备独立的持久化目录，不与其他映序实例共用数据库。

### Docker Compose 部署（latest）

在 Linux 服务器上新建一个空目录，创建 `compose.yaml`：

```yaml
services:
  yingxu:
    image: wiltonicp/yingxu:latest
    platform: linux/amd64
    network_mode: host
    environment:
      YINGXU_DATA_DIR: /app/data
    volumes:
      - ./data:/app/data
      - ./library:/app/library
    restart: unless-stopped
    stop_grace_period: 3m
    init: true
    security_opt:
      - no-new-privileges:true
```

准备好 `compose.yaml` 后执行：

```sh
mkdir -p data library
sudo chown 1000:1000 data library
chmod 700 data
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 yingxu
```

浏览器访问 **`http://服务器地址:3008`**。使用 `network_mode: host` 时，容器与宿主机共享网络，**不配置 `ports` 端口映射**。请确保 3008 未被其他服务占用；host 模式不会自动调整主机防火墙，客户端仍需能够访问该端口。

更新 `latest` 时，在原配置目录执行 `docker compose pull && docker compose up -d`，保留 `data` 和 `library`，更新前做好备份。`latest` 标签会随版本更新，不会自动升级运行中的容器。

### 获取初始化口令并创建管理员

首次启动后，在服务器的 `compose.yaml` 所在目录执行：

```bash
docker compose exec -T yingxu cat /app/data/bootstrap.key
```

这里的 `yingxu` 是 Compose 服务名，不要求容器实际名称也叫 `yingxu`。

如果使用 `docker run` 或 NAS 管理界面部署，可按实际容器名读取。例如容器名为 `yingxu-v100`：

```bash
docker exec yingxu-v100 cat /app/data/bootstrap.key
```

容器名以 `docker ps` 显示的名称为准。采用本文目录挂载方式时，也可在服务器直接读取 `data/bootstrap.key`。

将输出的初始化口令填入首次进入页面时的「本机初始化口令」，再设置管理员用户名和密码。没有默认账号或密码，不开放自行注册。已创建管理员后直接登录，无需重复初始化；不要删除数据库或密钥来重新初始化。

初始化口令、Cookie、API Key 与数据库密钥均应保密，不要粘贴到公开仓库或反馈截图中。

### 反向代理

使用 HTTPS 域名访问时，在 Compose 的 `environment` 中增加实际浏览器入口，例如：

```yaml
YINGXU_WEB_ORIGIN: https://media.example.com
```

填写准确的协议、域名及端口，不包含路径。直接通过 HTTP 的 3008 端口访问时，通常无需设置该项；配置后应与实际浏览器入口一致。反向代理应转发整个 Web 服务和 `/api`，不要只转发前端页面。播放服务地址需设置为媒体服务器或播放器实际可访问的地址。

## 首次配置

1. **TMDB**：在连接设置中选择 API Key 或 Bearer 方式，保存并测试。
2. **115**：扫码授权，选择互不嵌套的待整理和已整理目录。
3. **STRM 输出**：设置输出目录和播放器可访问的服务地址。默认输出保存在宿主机 `./library/strm`。
4. **整理策略**：设置分类、命名、质量偏好和定时间隔。先用少量资源核对结果。
5. **资源来源**：按需配置公开 TG 频道或 RE0 账号。两种来源独立，RE0 自动订阅不依赖 TG 开关。
6. **用户与媒体服务**：按需创建用户、关联 Emby；媒体服务器的目录挂载和路径映射需由你配置。

TG 通知的 Bot Token/用户 ID 仅用于可选通知；公开频道采集不要求个人 Telegram 账号登录。当前不支持私有频道，也不支持其他网盘的自动入库。

## Emby 302 反代

在「连接设置 → Emby 配置」中启用 **302 反代**，默认监听端口 **18099**，可修改。保存后应用，无需为 host 网络增加端口映射。

1. Emby 服务器地址仍填写原服务地址，例如 `http://Emby服务器:8096`，不要填反代地址。
2. Emby 客户端改为连接 `http://映序服务器:18099`，使用原 Emby 账号登录；修改端口后使用对应端口。
3. 对映序签名 STRM，反代核对当前 Emby 用户及媒体播放权限，再按播放器 User-Agent 获取115临时地址并302跳转。不会拿管理员安装密钥替用户播放。
4. 普通媒体、转码请求、媒体控制和 WebSocket 仍由原 Emby 处理；302 不提供转码能力，客户端需支持原始视频格式。

反代不代管 Emby 的媒体目录挂载。仅接管映序生成且签名有效的 STRM，以及下文明确支持的旧版 `/play115/` 链接；不自动读取任意本地 STRM 或转换其他第三方网盘链接。不要让反代端口与映序主服务、Emby 上游或其他服务冲突。

### 兼容旧版 115 STRM

默认支持旧软件生成的以下格式，**无需额外开关、逐条登记或重新生成 STRM**：

```text
http://映序服务器:3008/play115/{pickcode}/{文件ID}/{SHA1}/{文件大小}/{URL编码后的文件名}
```

只需批量把旧的 `http://旧服务器:旧端口` 替换为映序地址，后面的路径、参数和文件名编码原样保留。程序使用现有115 SDK解析提取标识，核对当前授权账号的实际文件ID、提取标识、SHA1和大小，再按播放器User-Agent获取临时直链并302跳转，不依赖旧软件继续运行，也不转存或改动网盘文件。

Emby 302 反代同时支持旧 `/play115/…` 和映序新签名链接，仍先核对Emby用户及播放权限。文件名仅作显示，已重命名但身份核对一致的文件仍可播放；文件信息不符、当前账号无权限或直链要求额外Cookie时会明确报错，不猜测其他文件。

旧链接本身视作播放凭据，请勿公开。新生成的 STRM 继续采用 `/api/playback/{资源标识}/{签名}` 格式；兼容功能不会批量改写历史文件。

### STRM 播放入口地址

输出页可检测并填入当前内网可访问的服务地址，默认部署端口 **3008**；也可点击“使用检测地址”或手动填写域名。配置了 `YINGXU_PUBLIC_BASE_URL` 或 `YINGXU_WEB_ORIGIN` 时优先采用明确配置的入口。多网卡、反向代理或外网访问时请核对实际可达性；检测不明确会提示手动填写，不猜测网卡。

修改地址后需要保存，之后的新输出使用新地址；**不会批量改写已有 STRM**。历史文件中的旧地址应通过明确的索引重建操作更新，不要通过删除网盘影片来处理。

## 每日自动签到

在「连接设置 → 115 网盘」和「连接设置 → RE0 资源」各自的**每日签到**卡片设置：

| 服务 | 默认时间 | 开关 |
| --- | --- | --- |
| 115 | **03:00** | 默认关闭，需先扫码授权 |
| RE0 | **00:10** | 默认关闭，需先配置并启用 RE0 授权 |

两项互相独立，可修改时间并保存，均按**北京时间（Asia/Shanghai，UTC+8）**执行，不受容器系统时区影响。RE0 仅执行普通签到，不使用赌狗模式。

服务需保持运行；当日错过时间，启动后会补执行一次。先核对上游今日状态，已签到不重复提交。每日执行记录持久保存，重启或反复保存不会重复签到；请求超时或结果不明显示「待核对」，当天不盲目重发。次日按保存的时间继续执行。卡片显示最近状态和下次执行时间。

## RE0 自动订阅与积分

在「连接设置 → RE0 账号 → 自动订阅」中开启。

- 默认关闭，默认间隔 60 分钟。
- 单资源和每日积分上限默认均为 **0**，适合先核对免费及已解锁资源。
- 启用后只处理有关注者的有效订阅，暂停或取消关注会阻止新的自动派发。
- 完整文件清单用于识别资源更新，重复轮询与已处理版本不会反复入队；已成功取得的解锁链接加密保存并复用。
- 需要积分的资源受单资源和每日额度约束；每日额度按 **UTC 日期**计算。
- 额度在派发前预留；结果不明不自动退回额度、不盲目重复扣分。先核对上游状态再恢复。
- 清单缺失、截断、重名、身份或季集不明确时暂停，不猜测入库。

RE0 账号和积分由管理员共享配置，普通用户不直接操作积分。上游限流、授权失效或资源校验失败会显示实际错误。

## Telegram 通知

在「连接设置 → TG 通知」保存 Bot Token 和接收者 ID，并打开「任务事件通知」。先给机器人发送 `/start`，再使用页面的测试按钮检查连接。测试模板包括连接、115/RE0 签到、任务失败及影片入库文字示例；示例会明确标注为测试，不触发实际签到或媒体操作。

- **具体影片通知**：订阅申请、审批结果、添加订阅、订阅完成、115 转存完成、整理与 STRM 入库完成；有已知 TMDB 海报时发送图文，无有效海报时发送文字。
- **入库卡片**：显示已知的片名、年份、季集、分类、原始文件声明的版本、文件大小、TMDB 和发布组等；未知字段省略，不把文件名规格当作码流实测。
- **签到和异常**：115/RE0 签到成功、已签到、失败、结果待核对，以及转存/整理/识别等任务异常。主动停止不报失败。
- **去重**：签到按服务与日期去重；任务异常按任务或文件与错误原因去重；已有事件标识保留。只通知启用后新发生的事件，不批量补发历史记录。
- **发送结果不明**：不自动重发图片，也不额外补发一条文字，避免重复消息。通知异常不改变媒体任务本身的结果。

通知记录保留在后台用于去重，不在配置页面展示列表。Token 只在后端加密保存，不会放进通知中。

## 数据备份与升级

必须持久保留：

- **`data/`**：数据库、凭证加密密钥、配置与任务记录。
- **`library/`**：生成的 STRM/NFO 等输出。

**数据库和 `data/credentials.key` 必须成套备份。** 丢失原密钥后，已有加密配置不能靠重新生成密钥恢复。不要把这些目录上传到仓库或发送到工单。

升级前等待转存/整理写入结束，处理完待核对结果，再执行：

```sh
docker compose stop
tar -czf yingxu-backup-$(date +%Y%m%d-%H%M%S).tar.gz data library
# 将 compose.yaml 中的镜像标签改为已发布、已核对的新版本
docker compose pull
docker compose up -d
docker compose logs --tail=100 yingxu
```

不要同时运行旧、新两个实例处理同一份数据。数据库升级后不要盲目回退镜像；必要时恢复升级前完整备份。

## 常见问题

**容器无法写入目录？** 检查挂载路径及 UID/GID 1000 的权限，不要删除已有数据库来解决权限问题。

**STRM 无法播放？** 检查播放服务地址是否可从媒体服务器访问、115 授权是否有效，以及媒体服务是否正确挂载输出目录。容器里的 `127.0.0.1` 不是其他机器的地址。

**没有自动转存？** 检查订阅是否有效、来源是否启用、质量是否匹配、积分额度，以及任务/日志中的真实原因。没有合规免费资源时，0 积分配置下等待属于正常行为。

**操作显示结果待核对？** 先在任务或整理记录中只读核对，避免重复提交接收、移动、删除或解锁。

## 本仓库范围

本公开仓库仅包含 **`frontend/` 前端源码及用户文档**，不包含后端源码、内部构建工具、真实配置或用户数据。

前端源码用于界面开发与审阅，单独启动不等于完整服务。完整应用通过正式发布的 Docker 镜像部署。镜像后端采用 Cython 原生编译降低业务源码暴露风险；这不构成绝对防逆向承诺。前端发布的 JavaScript 本身可被浏览器查看。

仓库中源码的许可证见 [LICENSE](LICENSE)；后端实现不属于本仓库的源码发布范围。

## 反馈

请通过 [GitHub Issues](https://github.com/wiltonicp/yingxu/issues) 提交问题，注明页面版本、镜像标签、部署架构、复现步骤及脱敏错误信息。不要粘贴密码、Cookie、初始化口令、API Key、私钥或带签名的播放链接。
