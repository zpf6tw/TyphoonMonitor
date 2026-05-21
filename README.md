# 智慧气象 AI 平台 / TyphoonMonitor

**在线域名:** [aimeteorology.cn](http://www.aimeteorology.cn)

TyphoonMonitor 是一个基于 React + Vite 的台风智能监测与实验室展示平台，包含台风路径与强度可视化、IDOL 模型估计结果对比、红外云图播放、实验室团队与论文展示等功能。

## 本地运行

**环境要求:** Node.js

```bash
npm install
npm run dev
```

常用脚本：

- `npm run dev`：启动本地开发服务，默认端口为 `3000`
- `npm run build`：构建生产版本到 `dist/`
- `npm run preview`：预览生产构建结果
- `npm run sync:typhoon-data`：根据上级目录中的 CSV 数据重新生成 `src/data/typhoonData.json`

## 技术栈

- **前端框架:** React 19
- **构建工具:** Vite 6
- **语言:** TypeScript
- **样式方案:** Tailwind CSS 4（通过 `@tailwindcss/vite` 接入）
- **地图组件:** React-Leaflet + Leaflet
- **动画:** Framer Motion
- **图标:** Lucide React
- **图表:** Recharts
- **图片处理依赖:** Sharp

## 文件结构

```text
TyphoonMonitor/
├─ image/                         # 本地云图资源暂存目录，已被 .gitignore 忽略
│  └─ zpf/
│     ├─ ATSANI/
│     │  ├─ cool_white/           # 冷白色云图 WebP
│     │  └─ pseudo_color/         # 伪彩色云图 WebP
│     ├─ GONI/
│     ├─ IN-FA/
│     ├─ NANGKA/
│     ├─ TALAS/
│     ├─ TAPAH/
│     ├─ TRAMI/
│     └─ WIPHA/
├─ scripts/
│  └─ upload-r2-images.mjs        # 上传 image/ 目录到对象存储的脚本
├─ src/
│  ├─ components/
│  │  ├─ LabPages.tsx             # 实验室概况、团队、研究方向、论文页面
│  │  ├─ MetricsChart.tsx         # 指标对比图表
│  │  ├─ Sidebar.tsx              # 侧边栏导航与语言切换
│  │  └─ TyphoonMap.tsx           # 台风地图、路径、云图叠加层
│  ├─ data/
│  │  ├─ team.json                # 团队成员数据
│  │  └─ typhoonData.json         # 台风案例与时间序列数据
│  ├─ papers/
│  │  └─ *.pdf                    # 学术成果 PDF，构建时自动收集
│  ├─ utils/
│  │  ├─ cloudFrames.ts           # 根据台风数据生成云图 URL 与时间轴映射
│  │  ├─ dataGenerator.ts         # 导出 typhoonData.json 中的案例数据
│  │  └─ publicationPapers.ts     # 自动解析 papers/ 下的论文信息
│  ├─ App.tsx                     # 应用主入口与视图状态管理
│  ├─ constants.tsx               # 中英文文案与全局常量
│  ├─ index.css                   # 全局样式与 Tailwind 引入
│  ├─ main.tsx                    # React 挂载入口
│  ├─ types.ts                    # TypeScript 类型定义
│  └─ vite-env.d.ts               # Vite 类型声明
├─ .env.local                     # 本地环境变量，例如云图资源基础 URL
├─ generate_json.cjs              # CSV 转台风 JSON 数据脚本
├─ index.html                     # Vite HTML 入口
├─ metadata.json                  # 项目元数据
├─ package.json                   # 依赖与 npm 脚本
├─ package-lock.json              # 依赖锁定文件
├─ tsconfig.json                  # TypeScript 配置
├─ vercel.json                    # Vercel 部署配置
└─ vite.config.ts                 # Vite 配置
```

说明：`node_modules/`、`dist/`、`vite-dev.*.log` 等为依赖、构建产物或日志文件，不作为源码结构维护。


## 数据更新方法

### 1. 更新台风路径与模型指标

修改或替换以下 CSV 文件：

- `../data/SelectedTyphoons_ibtracs.csv`
- `../data/SelectedTyphoons_IDOL_Estimated.csv`

然后在 `TyphoonMonitor/` 目录下运行：

```bash
npm run sync:typhoon-data
```

脚本会重新生成：

```text
src/data/typhoonData.json
```

前端地图、时间轴、指标图表会从该 JSON 中读取台风案例、经纬度、风速、气压、RMW、R34 等数据。

### 2. 更新云图资源

本地云图目录结构需要保持为：

```text
image/zpf/<台风英文名>/<云图类型>/NC_H08_YYYYMMDD_HHMM_R21_FLDK.02401_02401_ch13.webp
```

其中：

- `<台风英文名>` 示例：`ATSANI`、`GONI`、`IN-FA`
- `<云图类型>` 可选：`cool_white`、`pseudo_color`
- 文件名中的时间需要与 `src/data/typhoonData.json` 中的时间点对应

前端默认通过 `VITE_CLOUD_IMAGE_BASE_URL` 拼接远程云图地址。需要更换云图域名时，修改 `.env.local`：

```env
VITE_CLOUD_IMAGE_BASE_URL=https://your-image-domain.example.com/image
```

上传本地 `image/` 目录到对象存储时，可使用：

```bash
node scripts/upload-r2-images.mjs --root image --prefix image
```

该脚本需要提前配置 `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`R2_ACCOUNT_ID`、`R2_BUCKET` 等环境变量。

### 3. 更新团队信息

直接修改：

```text
src/data/team.json
```

- `leader`：团队负责人信息
- `members`：学生或团队成员列表

页面会按当前语言自动读取对应的中英文内容。

### 4. 更新论文成果

将 PDF 文件放入：

```text
src/papers/
```

推荐命名格式：

```text
YYYY_Conference_Authors_Title.pdf
```

也支持降级格式：

```text
YYYY_Conference_Title.pdf
```

`src/utils/publicationPapers.ts` 会在构建时自动扫描 `src/papers/*.pdf`，并按年份倒序展示在“学术成果”页面。
