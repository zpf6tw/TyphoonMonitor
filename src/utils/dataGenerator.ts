
import { TyphoonPoint, TyphoonCase } from '../types';

export const generateTyphoonData = (caseName: string, hours: number = 24): TyphoonPoint[] => {
  const points: TyphoonPoint[] = [];
  
  // 不同台风场次的起始位置
  // 漂移因子现在是应用曲率前的基础速度
  const startPos: Record<string, { lat: number; lng: number; drift: number }> = {
    'In-Fa': { lat: 21.5, lng: 128.0, drift: 0.12 },
    'Muifa': { lat: 19.0, lng: 130.0, drift: 0.18 },
  };

  const { lat: baseLat, lng: baseLng, drift } = startPos[caseName] || startPos['In-Fa'];

  for (let i = 0; i <= hours; i += 3) {
    const time = `${String(i).padStart(2, '0')}:00`;
    
    // 1. 模拟移动（真实路径）- 逼真的曲线路径
    let lat, lng;
    const t = i / hours; // 归一化时间 0.0 -> 1.0

    if (caseName === 'In-Fa') {
        // “烟花”风格：较慢、蜿蜒的“S”形曲线（蛇形）
        // 向西北移动，但有明显摆动
        lat = baseLat + (i * drift * 1.1) + (Math.sin(i * 0.3) * 0.4); 
        lng = baseLng - (i * drift * 1.4) + (Math.cos(i * 0.3) * 0.4);
    } else {
        // “梅花”风格：快速转向（抛物线转向）
        // 开始向西北移动，然后转向北，再转向东北偏北（模拟转向）
        // 纬度：向北加速
        lat = baseLat + (i * drift * 0.8) + (i * i * 0.008);
        // 经度：最初向西移动，但速度急剧下降（转向点）
        lng = baseLng - (i * drift * 1.5) + (i * i * 0.02);
    }
    
    // 2. 模拟 IDOL 预测移动（与新的曲线路径略有偏差）
    // 预测通常在转弯时略有滞后或超调
    const latError = (Math.sin(i * 0.8) * 0.08) + (Math.random() * 0.03 - 0.015); 
    const lngError = (Math.cos(i * 0.8) * 0.08) + (Math.random() * 0.03 - 0.015);
    const lat_pred = lat + latError;
    const lng_pred = lng + lngError;

    // 3. 强度（风速）
    // 强度在模拟中间达到峰值
    const baseIntensity = 35 + Math.sin(i / 8) * 20; 
    const intensity_real = Math.round(baseIntensity + Math.random() * 3);
    // 预测有自己的曲线和噪声
    const intensity_pred = Math.round(baseIntensity + (Math.sin(i / 5) * 3) + Math.random() * 4 - 2);
    
    // 4. 气压
    // 与强度成反比
    const pressure = 1000 - (intensity_real * 1.8);
    const pressure_pred = 1000 - (intensity_pred * 1.8) + (Math.random() * 4 - 2);
    
    // 5. 半径（真实与预测）
    // 真实结构会“呼吸”（扩张/收缩）
    const inner_radius_real = Math.round(30 + Math.sin(i / 6) * 8);
    const outer_radius_real = Math.round(200 + Math.cos(i / 10) * 40);
    
    // 预测结构（带误差）
    const inner_radius_pred = Math.round(inner_radius_real + (Math.random() * 10 - 5));
    const outer_radius_pred = Math.round(outer_radius_real + (Math.random() * 20 - 10));

    points.push({
      time,
      lat,
      lng,
      intensity_real,
      intensity_pred,
      pressure,
      lat_pred,
      lng_pred,
      pressure_pred,
      inner_radius_real,
      outer_radius_real,
      inner_radius_pred,
      outer_radius_pred
    });
  }
  return points;
};

export const MOCK_CASES: TyphoonCase[] = [
  { id: '1', nameEn: 'Typhoon In-Fa', nameZh: '台风“烟花”', data: generateTyphoonData('In-Fa', 48) },
  { id: '2', nameEn: 'Typhoon Muifa', nameZh: '台风“梅花”', data: generateTyphoonData('Muifa', 36) }
];
