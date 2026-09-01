/** @type {import('@ladle/react').UserConfig} */
export default {
  // 确保使用仓库根 vite.config（含 Tailwind / @ 别名）
  viteConfig: `${process.cwd()}/vite.config.ts`,
};
