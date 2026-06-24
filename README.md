# AI Meteorology

**在线域名:** [aimeteorology.cn](http://www.aimeteorology.cn)

## 本地运行

```bash
npm install
npm run dev
```

## 常用脚本

```bash
npm run build
npm run preview
npm run sync:typhoon-data
npm run upload:cloud-images
```

`npm run sync:typhoon-data` 会从上级 `data/` 目录中的 CSV 重新生成 `src/data/IDOLTyphoonData.json`。

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- React-Leaflet + Leaflet
- Recharts
- Framer Motion
- Lucide React

## 当前结构

```text
ai-meteorology/
├─ src/
│  ├─ App.tsx
│  ├─ components/
│  │  ├─ common/
│  │  ├─ layout/
│  │  ├─ lab/
│  │  ├─ typhoon-intensity/
│  │  │  └─ IDOL/
│  │  │     ├─ IDOLAnalysisPanel.tsx
│  │  │     ├─ IDOLMap.tsx
│  │  │     ├─ IDOLMetricsChart.tsx
│  │  │     ├─ IDOLOverlayControls.tsx
│  │  │     ├─ IDOLTimelineControls.tsx
│  │  │     ├─ CaseSelectorDropdown.tsx
│  │  │     ├─ CloudTemperatureLegend.tsx
│  │  │     └─ index.ts
│  │  └─ cloud-evolution/
│  │     └─ CloudSeer/
│  │        ├─ CloudSeerView.tsx
│  │        ├─ CloudSeerMap.tsx
│  │        ├─ CloudSeerMetrics.tsx
│  │        ├─ CloudSeerMetricsData.ts
│  │        ├─ MotionVectorField.tsx
│  │        ├─ ComparisonSlider.tsx
│  │        ├─ ModelPrinciplePanel.tsx
│  │        └─ index.ts
│  ├─ data/
│  │  ├─ IDOLTyphoonData.json
│  │  ├─ publications.json
│  │  └─ team.json
│  ├─ features/
│  ├─ utils/
│  ├─ assets/
│  ├─ constants.tsx
│  ├─ main.tsx
│  └─ types.ts
├─ image/
├─ scripts/
├─ generate_json.cjs
├─ package.json
└─ vite.config.ts
```

## 维护入口

- 团队信息：修改 `src/data/team.json`，成员照片放到 `src/assets/lab/members/姓名.jpg`。
- 学术成果：修改 `src/data/publications.json`。
- IDOL 台风数据：更新上级 `data/*.csv` 后运行 `npm run sync:typhoon-data`。
- CloudSeer 指标：修改 `src/components/cloud-evolution/CloudSeer/CloudSeerMetricsData.ts`。
- IDOL 云图：维护 `image/zpf/<台风名>/<pseudo_color|cool_white>/` 并上传 COS。

