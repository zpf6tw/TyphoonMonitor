
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import { TyphoonPoint, Language } from '../types';
import { TRANSLATIONS } from '../constants';

// 修复默认标记图标
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface TyphoonMapProps {
  data: TyphoonPoint[];
  currentIndex: number;
  language: Language;
  isRightPanelOpen: boolean; // 添加 prop 以根据侧边栏状态控制布局
  showCloudMap: boolean;
}

const MapController: React.FC<{ center: [number, number], bounds: L.LatLngBoundsExpression }> = ({ center, bounds }) => {
  const map = useMap();

  // 处理边界和缩放限制
  useEffect(() => {
    const leafletBounds = L.latLngBounds(bounds);

    const updateMapConstraints = () => {
      map.invalidateSize();
      // inside=true 确保地图视口始终完全包含在 bounds 内，防止出现灰色未覆盖区域
      const minZoom = map.getBoundsZoom(leafletBounds, true);
      map.setMinZoom(minZoom);
      map.setMaxBounds(leafletBounds);

      // 如果当前缩放级别小于新的最小缩放级别，则自动放大
      if (map.getZoom() < minZoom) {
        map.setZoom(minZoom);
      }
    };

    // 初始化更新
    updateMapConstraints();

    // 监听容器大小变化（如侧边栏收缩/展开）
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        updateMapConstraints();
      });
    });

    resizeObserver.observe(map.getContainer());

    return () => {
      resizeObserver.disconnect();
    };
  }, [map, bounds]);

  // 处理中心点平移
  useEffect(() => {
    // 持续时间略小于 1000ms 间隔，以获得更平滑的视觉连续性
    map.panTo(center, { animate: true, duration: 0.8 });
  }, [center, map]);

  return null;
};

// 内风圈保持恒定颜色，防止模拟过程中颜色偏移
const INNER_RING_COLOR = '#3b82f6'; 

export const TyphoonMap: React.FC<TyphoonMapProps> = ({ data, currentIndex, language, isRightPanelOpen, showCloudMap }) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  const currentPoint = data[currentIndex];
  
  const path = useMemo(() => data.map(p => [p.lat, p.lng] as [number, number]), [data]);
  const currentPos = useMemo(() => [currentPoint.lat, currentPoint.lng] as [number, number], [currentPoint]);

  // 固定的云图覆盖范围：60°S - 60°N, 80°E - 160°W (200°E)
  const imageBounds: L.LatLngBoundsExpression = [
    [-60, 80], // [South, West]
    [60, 200]  // [North, East]
  ];

  // 使用本地 public 目录下的图片
  const cloudImageUrl = '/cloud_image.png';

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={currentPos} 
        zoom={5} 
        minZoom={4}
        maxBounds={imageBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true} 
        className="z-0"
        zoomControl={false}
      >
        {/* 切换到高德地图以支持中文标签和地缘政治合规性 */}
        <TileLayer
          attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={['1', '2', '3', '4']}
        />
        
        <Polyline 
          positions={path} 
          color="#94a3b8" 
          weight={2} 
          dashArray="5, 10" 
          opacity={0.6}
        />
        
        <Polyline 
          positions={path.slice(0, currentIndex + 1)} 
          color="#3b82f6" 
          weight={3} 
          opacity={1}
        />

        {/* 卫星云图叠加层 */}
        {showCloudMap && (
          <ImageOverlay
            url={cloudImageUrl}
            bounds={imageBounds}
            opacity={0.5}
            className="satellite-cloud-overlay"
          />
        )}

        {/* 外风圈 - 可视化 IDOL 预测结构 */}
        <Circle
          center={currentPos}
          radius={currentPoint.outer_radius_pred * 1000}
          pathOptions={{ 
            color: '#3b82f6', 
            weight: 1, 
            fillOpacity: 0.05, 
            fillColor: '#3b82f6',
            className: 'outer-wind-ring'
          }}
        />

        {/* 内风圈 - 可视化 IDOL 预测结构 */}
        <Circle
          center={currentPos}
          radius={currentPoint.inner_radius_pred * 1000}
          pathOptions={{ 
            fillColor: INNER_RING_COLOR, 
            fillOpacity: 0.4, 
            color: '#fff', 
            weight: 2,
            className: 'inner-wind-ring'
          }}
        />

        {/* 当前位置脉冲标记 */}
        <Marker position={currentPos} icon={new L.DivIcon({
          className: 'custom-div-icon',
          html: `
            <div class="relative flex h-4 w-4">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white"></span>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })}>
          <Popup className="meteo-popup">
            <div className="p-1">
              <p className="text-[10px] text-slate-500 font-bold">{currentPoint.time}</p>
              <hr className="my-1 border-slate-100" />
              <div className="space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">{t('lat')}</span>
                  <span className="text-[10px] text-slate-700 font-bold">{currentPoint.lat.toFixed(2)}°</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">{t('lng')}</span>
                  <span className="text-[10px] text-slate-700 font-bold">{currentPoint.lng.toFixed(2)}°</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        <MapController center={currentPos} bounds={imageBounds} />
      </MapContainer>

      {/* 内核呼吸动画样式 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes innerBreathing {
          0% { fill-opacity: 0.35; stroke-width: 1.5; }
          50% { fill-opacity: 0.55; stroke-width: 2.5; }
          100% { fill-opacity: 0.35; stroke-width: 1.5; }
        }
        .inner-wind-ring {
          animation: innerBreathing 2.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};
