import { Language, TyphoonCase } from '../../types';
import { MOCK_CASES } from '../../utils/dataGenerator';

export const DUAL_TYPHOON_CASE_ID = 'GONI_ATSANI_2015';
// 双台风是展示层合并案例，原始数据仍保留为两个独立台风。
export const DUAL_TYPHOON_STORM_CODES = ['GONI_2015', 'ATSANI_2015'];

export interface CaseSelectorOption {
  id: string;
  nameEn: string;
  nameZh: string;
}

// stormCode 统一转成大写键，便于和云图目录、双台风配置做匹配。
export const getStormCodeKey = (typhoonCase: TyphoonCase): string =>
  String(typhoonCase.stormCode || '').trim().toUpperCase();

const isDualTyphoonSourceCase = (typhoonCase: TyphoonCase): boolean =>
  DUAL_TYPHOON_STORM_CODES.includes(getStormCodeKey(typhoonCase));

// 选择器只暴露合并后的双台风入口，避免用户在列表中看到重复的 GONI/ATSANI 单项。
export const CASE_SELECTOR_OPTIONS: CaseSelectorOption[] = [
  {
    id: DUAL_TYPHOON_CASE_ID,
    nameEn: 'GONI / ATSANI (2015)',
    nameZh: '天鹅 / 艾莎尼(2015)',
  },
  ...MOCK_CASES
    .filter(typhoonCase => !isDualTyphoonSourceCase(typhoonCase))
    .map(({ id, nameEn, nameZh }) => ({ id, nameEn, nameZh })),
];

// 个例说明按 stormCode 管理，中文和英文文案保持同一业务含义。
const TYPHOON_FEATURES: Record<string, { en: string; zh: string }> = {
  GONI_ATSANI_2015: {
    en: 'Goni and Atsani formed a simultaneous dual-typhoon scene over the western North Pacific in August 2015. The combined case presents the western and eastern systems on one map, with shared satellite imagery at matching timestamps.',
    zh: '天鹅和艾莎尼构成 2015 年 8 月西北太平洋的同期双台风过程。合并场次在同一张地图上呈现西侧和东侧两个系统，并在相同时间点使用共享的卫星云图背景。',
  },
  ATSANI_2015: {
    en: 'Atsani was the eastern system in the 2015 dual-typhoon process. It developed mainly over the open western North Pacific, reached super-typhoon intensity, and displayed a distinct eye wall with strong convection. Compared with Goni, its characteristics are concentrated in offshore intensification and mature typhoon structure.',
    zh: '艾莎尼是 2015 年双台风过程中的东侧系统，主要在西北太平洋开阔海面发展并达到超强台风强度，具有清晰眼墙和强对流结构。与天鹅相比，艾莎尼的陆地影响较弱，主要特点集中在海上快速增强和成熟台风结构演变。',
  },
  GONI_2015: {
    en: 'Goni was the western system in the same dual-typhoon process. It moved westward toward the Philippine Sea and the Luzon Strait, then recurved north to northeast and affected the Ryukyu Islands, Kyushu, and adjacent seas. The case features recurvature, near-coastal passage, and subsequent impacts around Japan.',
    zh: '天鹅是同期双台风过程中的西侧系统，先向菲律宾海和吕宋海峡附近移动，随后转向北到东北，影响琉球群岛、日本九州及周边海域。该过程体现了强台风转向、近岸擦过以及后续影响日本的典型特征。',
  },
  TALAS_2017: {
    en: 'Talas was a short-lived tropical cyclone from the South China Sea toward Indochina. Its main features are near-land genesis, a compact track, rapid landfall, and fast weakening after land interaction, rather than extreme central intensity.',
    zh: '塔拉斯是南海到中南半岛方向的短生命史热带气旋。其主要特点不是极端中心强度，而是生成位置靠近陆地、移动路径短、登陆快，并在登陆后迅速减弱。',
  },
  TRAMI_2018: {
    en: 'Trami was notable for both intensity and size. It reached super-typhoon intensity and had a broad 34-kt wind field, slowed south of the Ryukyu Islands, then recurved and affected the Ryukyu Islands and mainland Japan.',
    zh: '潭美是强度和尺度都很突出的强台风，达到超强台风强度并具有较大的 34 kt 风圈。它在琉球以南海域移动变慢后转向，随后影响琉球和日本本土，体现了强台风慢速移动、转向和大范围风场的特点。',
  },
  WIPHA_2019: {
    en: 'Wipha had modest central intensity, but its broad circulation, rainbands, monsoon interaction, and coastal impacts were significant across South China, Hainan, the Gulf of Tonkin, and northern Vietnam.',
    zh: '韦帕中心强度不高，但外围环流、雨带和季风配合作用明显，影响华南、海南、北部湾和越南北部。该个例突出中心强度较低时，宽广环流和雨带仍可能带来显著风雨影响和较高预警需求。',
  },
  TAPAH_2019: {
    en: 'Tapah had moderate peak intensity but an exceptionally broad 34-kt wind field. It moved northward across the East China Sea and near the Korea Strait before transitioning toward an extratropical system, highlighting that wind risk cannot be judged by central intensity alone.',
    zh: '塔巴峰值强度中等，但 34 kt 风圈范围很大。它北上穿过东海和朝鲜海峡附近后逐渐转化为温带气旋，主要特点是风场宽广、影响范围大，说明风风险不能只由中心强度判断。',
  },
  NANGKA_2020: {
    en: 'Nangka was a South China Sea storm that moved west to northwest and affected South China and northern Vietnam. Its interaction with the northeast monsoon enhanced coastal winds, showing that center intensity and distance alone do not fully explain warning-level impacts.',
    zh: '浪卡是南海生成、向西到西北移动并影响华南和越南北部的热带风暴。它与东北季风共同作用，使沿岸风力得到增强，体现了风暴中心强度和距离之外的环境背景对预警等级的重要影响。',
  },
  'IN-FA_2021': {
    en: 'In-fa was the most significant East China impact case in this set. It moved slowly, made repeated landfalls, and sustained long-distance water-vapor transport, making rainfall duration and moisture supply as important as the center track.',
    zh: '烟花是本组选集中对中国东部影响最显著的个例，具有移动缓慢、两次登陆和远距离水汽输送等特点。其风险特征不仅体现在中心路径上，也体现在持续降水、水汽输送和登陆后长时间影响。',
  },
};

// 地图主场次使用用户选择的分组；双台风场次返回两个独立数据源共同渲染。
export const getCaseGroupBySelection = (selectedCaseId: string): TyphoonCase[] => {
  if (selectedCaseId === DUAL_TYPHOON_CASE_ID) {
    return DUAL_TYPHOON_STORM_CODES
      .map(stormCode => MOCK_CASES.find(typhoonCase => getStormCodeKey(typhoonCase) === stormCode))
      .filter((typhoonCase): typhoonCase is TyphoonCase => Boolean(typhoonCase));
  }

  const selectedCase = MOCK_CASES.find(typhoonCase => typhoonCase.id === selectedCaseId);
  return selectedCase ? [selectedCase] : [MOCK_CASES[0]].filter(Boolean);
};

// 未配置专属说明的个例使用通用描述，保证右侧面板不会出现空白文本。
export const getTyphoonIntro = (typhoonCase: TyphoonCase, language: Language): string => {
  const stormCode = getStormCodeKey(typhoonCase);
  const configuredIntro = TYPHOON_FEATURES[stormCode]?.[language];
  if (configuredIntro) {
    return configuredIntro;
  }

  return language === 'en'
    ? 'This case represents a characteristic typhoon process within the selected event set.'
    : '该个例代表所选样本中的一种典型台风过程特征。';
};
