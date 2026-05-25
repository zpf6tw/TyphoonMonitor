
import { TyphoonCase } from '../types';
import typhoonData from '../data/typhoonData.json';

export const MOCK_CASES: TyphoonCase[] = typhoonData as TyphoonCase[];


import { CloudSeerCase, CloudSeerPoint, CloudSeerBand, CloudSeerModel } from '../types';

// CloudSeer 8个波段定义
export const CLOUDSEER_BANDS: CloudSeerBand[] = [
  { id: '0.64', wavelength: '0.64', nameEn: 'Visible', nameZh: '可见光', unit: 'μm' },
  { id: '1.6', wavelength: '1.6', nameEn: 'Near IR', nameZh: '近红外', unit: 'μm' },
  { id: '3.9', wavelength: '3.9', nameEn: 'Shortwave IR', nameZh: '短波红外', unit: 'μm' },
  { id: '8.6', wavelength: '8.6', nameEn: 'IR Window', nameZh: '红外窗区', unit: 'μm' },
  { id: '10.4', wavelength: '10.4', nameEn: 'IR Window', nameZh: '红外窗区', unit: 'μm' },
  { id: '11.2', wavelength: '11.2', nameEn: 'IR Window', nameZh: '红外窗区', unit: 'μm' },
  { id: '12.3', wavelength: '12.3', nameEn: 'IR Window', nameZh: '红外窗区', unit: 'μm' },
  { id: '13.3', wavelength: '13.3', nameEn: 'IR Window', nameZh: '红外窗区', unit: 'μm' },
];

// CloudSeer 对比模型
export const CLOUDSEER_MODELS: CloudSeerModel[] = [
  { id: 'gt', nameEn: 'Ground Truth', nameZh: '真实值' },
  { id: 'opticalflow', nameEn: 'Optical Flow', nameZh: '光流法' },
  { id: 'convlstm', nameEn: 'ConvLSTM', nameZh: 'ConvLSTM' },
  { id: 'simvp', nameEn: 'SimVP', nameZh: 'SimVP' },
  { id: 'phydnet', nameEn: 'PhyDNet', nameZh: 'PhyDNet' },
  { id: 'cloudseer-t', nameEn: 'CloudSeer-T', nameZh: 'CloudSeer-T', isOurs: true },
  { id: 'cloudseer-b', nameEn: 'CloudSeer-B', nameZh: 'CloudSeer-B', isOurs: true },
];

// 生成 CloudSeer 模拟数据
export const generateCloudSeerData = (caseType: 'typhoon' | 'convection' | 'front'): CloudSeerPoint[] => {
  const points: CloudSeerPoint[] = [];
  const height = 256;
  const width = 256;
  const bands = 8;
  
  // 总共12帧：过去6帧(输入) + 未来6帧(预报)
  for (let i = 0; i < 12; i++) {
    const time = i < 6 ? `T-${(6-i)*30}min` : `T+${(i-5)*30}min`;
    
    // 生成模拟云图数据
    const cloudData: number[][][] = [];
    for (let b = 0; b < bands; b++) {
      const bandData: number[][] = [];
      for (let h = 0; h < height; h++) {
        const row: number[] = [];
        for (let w = 0; w < width; w++) {
          // 生成模拟云结构
          const baseNoise = Math.sin(h * 0.05 + i * 0.1) * Math.cos(w * 0.05 + i * 0.08) * 0.3 + 0.5;
          const spiralNoise = caseType === 'typhoon' 
            ? Math.sin(Math.sqrt(Math.pow(h - height/2, 2) + Math.pow(w - width/2, 2)) * 0.03 + i * 0.15) * 0.2
            : 0;
          const value = Math.max(0, Math.min(1, baseNoise + spiralNoise + (Math.random() - 0.5) * 0.1));
          row.push(value);
        }
        bandData.push(row);
      }
      cloudData.push(bandData);
    }
    
    // 生成模拟位移场
    const displacementField: number[][][] = [];
    for (let h = 0; h < height; h++) {
      const row: number[][] = [];
      for (let w = 0; w < width; w++) {
        const dx = Math.sin(h * 0.02 + i * 0.05) * 2 + (caseType === 'typhoon' ? (w - width/2) * 0.001 : 0);
        const dy = Math.cos(w * 0.02 + i * 0.05) * 2 + (caseType === 'typhoon' ? (h - height/2) * 0.001 : 0);
        row.push([dx, dy]);
      }
      displacementField.push(row);
    }
    
    // 生成模拟指标
    const baseError = i < 6 ? 0 : (i - 5) * 0.08;
    const metrics = {
      mse: 45.69 + baseError * 50 + (Math.random() - 0.5) * 5,
      mae: 3.635 + baseError * 3 + (Math.random() - 0.5) * 0.3,
      psnr: 24.41 - baseError * 10 + (Math.random() - 0.5) * 0.5,
      ssim: 0.680 - baseError * 0.15 + (Math.random() - 0.5) * 0.02,
    };
    
    points.push({
      time,
      cloudData,
      displacementField,
      metrics,
    });
  }
  
  return points;
};

// CloudSeer 测试案例
export const CLOUDSEER_CASES: CloudSeerCase[] = [
  { 
    id: 'cs1', 
    nameEn: 'Typhoon Case', 
    nameZh: '台风案例', 
    type: 'typhoon',
    data: generateCloudSeerData('typhoon') 
  },
  { 
    id: 'cs2', 
    nameEn: 'Severe Convection', 
    nameZh: '强对流案例', 
    type: 'convection',
    data: generateCloudSeerData('convection') 
  },
];