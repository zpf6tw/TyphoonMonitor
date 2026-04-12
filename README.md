
## 运行项目 (Run Locally)

**环境要求 (Prerequisites):** Node.js

1. 安装依赖 (Install dependencies):
   `npm install`
2. 运行项目 (Run the app):
   `npm run dev`

## 使用技术栈 (Tech Stack)

- **前端框架:** React 18
- **构建工具:** Vite
- **样式方案:** Tailwind CSS
- **地图组件:** React-Leaflet (基于 Leaflet)
- **动画库:** Framer Motion
- **图标库:** Lucide React
- **图表库:** Recharts

## 文件结构 (File Structure)

```text
├── public/                 # 静态资源 (如云图图片等)
├── src/
│   ├── components/         # React 组件 (如地图、图表、页面等)
│   ├── data/               # 数据文件 (如 team.json)
│   ├── papers/             # 论文 PDF 文件
│   ├── utils/              # 工具函数 (如数据生成器)
│   ├── App.tsx             # 主应用入口
│   ├── constants.tsx       # 全局常量与多语言翻译
│   ├── index.css           # 全局样式与 Tailwind 引入
│   ├── main.tsx            # React 挂载点
│   └── types.ts            # TypeScript 类型定义
├── package.json            # 项目依赖与脚本
├── tailwind.config.js      # Tailwind CSS 配置
├── tsconfig.json           # TypeScript 配置
└── vite.config.ts          # Vite 配置
```

## 网站数据更新方法 (How to Update Website Data)

### 1. 论文更新 (Paper Updates)
将论文 PDF 文件重命名为对应格式后，直接放入 `src/papers/` 文件夹即可。系统会自动读取并展示在“学术成果”页面。
- **推荐命名格式:** `YYYY_Conference_Authors_Title.pdf` (例如: `2023_CVPR_JohnDoe_AI_Meteorology.pdf`)
- **降级命名格式:** `YYYY_Conference_Title.pdf`

### 2. 师生数据更新 (Team Data Updates)
直接修改 `src/data/team.json` 文件中的内容。
- 在 `leader` 对象中修改负责人的中英文信息。
- 在 `members` 数组中添加、修改或删除学生的信息。

### 3. 网站其他信息修改 (Other Website Info Updates)
如果您需要修改网站的其他文本、布局或添加新功能，建议使用 **GitHub Copilot**。您可以直接在代码中编写注释，或者在 GitHub 中创建 Issue (议题) 描述您的需求，让 Copilot 辅助您完成代码的修改。
