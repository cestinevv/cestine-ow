# ========================================
# Stage 1: Base
# ========================================
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache libc6-compat

# ========================================
# Stage 2: Builder
# ========================================
FROM base AS builder

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    autoconf \
    automake \
    libtool \
    nasm
RUN corepack enable pnpm

# 接收构建参数
ARG MODEL=production
ARG GIT_COMMIT=dev

WORKDIR /app

# 禁用 husky 在 CI 环境中（Docker 构建没有 .git）
ENV HUSKY=0

# 复制依赖文件（含 workspace：minimumReleaseAgeExclude 等策略）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装所有依赖（使用 BuildKit 缓存）
# --ignore-scripts 跳过需要 .git 的安装后脚本
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# 复制源代码
COPY . .

# 根据环境构建应用
ENV VITE_APP_VERSION=${GIT_COMMIT}

RUN echo "🔨 Building application for $MODEL environment (version=$GIT_COMMIT)..." && \
    if [ "$MODEL" = "development" ]; then \
      echo "📦 Using development mode (.env.development)..." && pnpm build:dev; \
    elif [ "$MODEL" = "test" ]; then \
      echo "📦 Using test mode (.env.test)..." && pnpm build:test; \
    else \
      echo "📦 Using production mode (.env.production)..." && pnpm build:production; \
    fi && \
    test -f public/version.json && \
    test -f .output/public/version.json && \
    grep -q '"/version.json"' .output/server/index.mjs

# ========================================
# Stage 3: Runner
# ========================================
FROM base AS runner

ARG GIT_COMMIT=dev

WORKDIR /app

# 运行环境参数
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# 从 builder 阶段复制构建产物（设置正确的权限）
COPY --from=builder --chown=nodejs:nodejs /app/.output ./.output
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# 切换到非 root 用户
USER nodejs:nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", ".output/server/index.mjs"]