## 1. 启动 Docker 服务的命令

先构建镜像，然后运行容器：

### 构建 Test
```
docker build --build-arg MODEL=test -t web-onestory-www:test .
```

### 启动 Test
```
docker run -p 3000:3000 web-onestory-www:test
```

```bash
# 构建镜像
docker build --build-arg MODEL=development -t web-onestory-www:dev .

# 运行容器（开发模式）
docker run -d \
  --name web-onestory-www-dev \
  -p 3000:3000 \
  web-onestory-www:dev

# 查看日志
docker logs -f web-onestory-www-dev

# 停止容器
docker stop web-onestory-www-dev

# 删除容器
docker rm web-onestory-www-dev
```

## 1. 查看 Dockerfile 改动原因 

### Dockerfile 改动说明：

**主要改动：**

1. **添加了原生模块编译工具**（解决 `bufferutil`、`utf-8-validate`、`keccak`、`gifsicle` 编译失败）：
   - `python3` - node-gyp 需要 Python 来编译原生模块
   - `make` / `g++` - C/C++ 编译工具
   - `autoconf` / `automake` / `libtool` - gifsicle 需要的 GNU 构建工具
   - `nasm` - 汇编器，某些图像处理库需要

2. **锁定 pnpm 版本为 9.x**：
   - pnpm v10+ 引入了新的安全策略 `approve-builds`
   - 需要手动批准某些包的 build scripts（交互式操作）
   - 在 Docker 这种非交互环境会导致构建失败
   - pnpm 9.x 没有这个限制，更适合 CI/CD 环境

3. **移除 `--ignore-scripts=false`**：
   - 使用默认的 `pnpm install` 即可，自动运行必要的 build scripts

## 3. 查看 package.json 变化 

在终端中运行


根据当前的 package.json，我看到了几个关键的依赖：

### 导致构建失败的关键依赖：

1. **`@solana/web3.js`** - 依赖原生加密模块：
   - 间接依赖 `bufferutil` 和 `utf-8-validate`（WebSocket 优化）
   - 依赖 `keccak`（加密哈希算法，需要 C++ 编译）

2. **`sharp`**（图像处理）- 需要编译原生模块

3. **`gifsicle`**（GIF 优化）- 需要 `autoconf`/`automake` 工具链

4. **项目中有图像优化脚本**（optimize-images.ts、optimize-videos.ts）

### 总结

**为什么之前可以正常构建，现在失败？**

可能的原因：
1. **依赖版本更新** - `@solana/web3.js`、`@privy-io/react-auth` 等包的新版本引入了更多原生依赖
2. **pnpm 版本升级** - 本地可能用的是旧版本 pnpm，Docker 安装的是最新版（v10+），有不同的安全策略
3. **缺少构建工具** - 原 Dockerfile 只有 `libc6-compat` 和 `curl`，没有 Python 和 C++ 编译工具

**修复方案（已实施）：**
- ✅ 添加完整的原生模块编译工具链（Python、make、g++、autoconf 等）
- ✅ 锁定 pnpm@9 避免 v10 的交互式限制
- ✅ 使用 `apk update` 确保包索引最新
