# AI Meteorolog

**在线域名:** [aimeteorology.cn](http://www.aimeteorology.cn)

## 本地运行

**环境要求:** Node.js

```bash
npm install
npm run dev
```

## 技术栈

- **前端框架:** React 19
- **构建工具:** Vite 6
- **语言:** TypeScript
- **样式方案:** Tailwind CSS 4（通过 `@tailwindcss/vite` 接入）
- **地图组件:** React-Leaflet + Leaflet
- **动画:** Framer Motion
- **图标:** Lucide React
- **图表:** Recharts

## 文件结构

```text
TyphoonMonitor/
├─ scripts/
│  └─ upload-cos-images.mjs       # 上传 image/ 目录到腾讯云 COS / S3 兼容对象存储
├─ src/
│  ├─ components/
│  │  ├─ common/
│  │  │  └─ CollapsiblePanel.tsx  # 通用折叠面板
│  │  ├─ typhoon/
│  │  │  ├─ CaseSelectorDropdown.tsx      # 台风案例选择下拉框
│  │  │  ├─ CloudTemperatureLegend.tsx    # 云图亮温色标图例
│  │  │  ├─ TyphoonAnalysisPanel.tsx      # 右侧特征、指标图表和物理先验面板
│  │  │  ├─ TyphoonOverlayControls.tsx    # 地图顶部场次选择和实时参数浮层
│  │  │  └─ TyphoonTimelineControls.tsx   # 底部播放、云图模式和时间轴控制
│  │  ├─ LabPages.tsx             # 实验室概况、团队、研究方向、论文页面
│  │  ├─ MetricsChart.tsx         # 指标对比图表
│  │  ├─ Sidebar.tsx              # 侧边栏导航与语言切换
│  │  └─ TyphoonMap.tsx           # 台风地图、路径、云图叠加层
│  ├─ data/
│  │  ├─ team.json                # 团队成员数据
│  │  └─ typhoonData.json         # 台风案例与时间序列数据
│  ├─ features/
│  │  └─ typhoon/
│  │     ├─ caseCatalog.ts        # 台风案例选项、双台风分组和案例介绍
│  │     ├─ cloudFrameMatcher.ts  # 时间轴到云图帧 URL 的匹配
│  │     └─ time.ts               # 台风时间标签格式化
│  ├─ papers/
│  │  └─ *.pdf                    # 学术成果 PDF，构建时自动收集
│  ├─ utils/
│  │  ├─ cloudFrames.ts           # COS 云图 URL 生成与风暴云图索引
│  │  ├─ cloudImagePreloader.ts   # 云图预加载、解码和缓存队列
│  │  ├─ dataGenerator.ts         # 导出 typhoonData.json 中的案例数据
│  │  └─ publicationPapers.ts     # 自动解析 papers/ 下的论文信息
│  ├─ App.tsx                     # 应用主入口与跨模块状态编排
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
├─ DEVELOPMENT.md                 # 项目开发文档和维护速查
├─ tsconfig.json                  # TypeScript 配置
├─ vercel.json                    # Vercel 部署配置
└─ vite.config.ts                 # Vite 配置
```

## 数据更新方法

### 1. 更新团队信息

直接修改：

```text
src/data/team.json
```

- `leader`：团队负责人信息
- `members`：学生或团队成员列表

页面会按当前语言自动读取对应的中英文内容。

### 2. 更新论文成果

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
