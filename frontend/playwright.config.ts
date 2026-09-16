import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// 统一运行入口：npm run test:e2e
// 自动构建并起 Vite 预览服务器，测试真实 localStorage 与文件下载/上传往返。
//
// 部分受限环境没有 root 安装 Chromium 系统依赖；若本地存在用户态解压的
// 依赖目录（~/.local/chromium-libs），通过 LD_LIBRARY_PATH 注入，无需 sudo。
const localChromiumLibDirs = [
  `${process.env.HOME}/.local/chromium-libs/usr/lib/aarch64-linux-gnu`,
  `${process.env.HOME}/.local/chromium-libs/lib/aarch64-linux-gnu`,
  `${process.env.HOME}/.local/chromium-libs/usr/lib`,
  `${process.env.HOME}/.local/chromium-libs/lib`,
].filter((dir) => fs.existsSync(dir));
const launchEnv: NodeJS.ProcessEnv = { ...process.env };
if (localChromiumLibDirs.length > 0) {
  launchEnv.LD_LIBRARY_PATH = [...localChromiumLibDirs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:28310',
    trace: 'on-first-retry',
    launchOptions: { env: launchEnv },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:28310',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
