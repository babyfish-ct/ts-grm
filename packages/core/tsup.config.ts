import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // 同时支持 CommonJS 和 ESM
  dts: true, // 生成 .d.ts 类型声明文件
  splitting: false,
  sourcemap: true,
  clean: true, // 构建前清理输出目录
  minify: false, // 库不需要压缩，让使用者决定
  treeshake: true, // tree-shaking
  outDir: 'dist',
});
