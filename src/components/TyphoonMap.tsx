
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  cloudFrameUrls?: string[];
  isPlaying?: boolean;
  onCloudFrameLoaded?: (frameIndex: number) => void;
}

const loadedCloudUrls = new Set<string>();
const loadingCloudPromises = new Map<string, Promise<void>>();

const preloadCloudImage = (url: string): Promise<void> => {
  if (!url) {
    return Promise.resolve();
  }

  if (loadedCloudUrls.has(url)) {
    return Promise.resolve();
  }

  const existing = loadingCloudPromises.get(url);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      // 先完成解码，尽量减少切帧瞬间主线程卡顿。
      try {
        if (typeof image.decode === 'function') {
          await image.decode();
        }
      } catch {
        // decode 失败时退回到普通 onload 结果
      }

      loadedCloudUrls.add(url);
      loadingCloudPromises.delete(url);
      resolve();
    };
    image.onerror = () => {
      loadingCloudPromises.delete(url);
      reject(new Error(`Failed to preload cloud frame: ${url}`));
    };
    image.src = url;
  });

  loadingCloudPromises.set(url, promise);
  return promise;
};

const MapController: React.FC<{ center: [number, number], bounds: L.LatLngBoundsExpression, isPlaying: boolean }> = ({ center, bounds, isPlaying }) => {
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
    // 连续播放时禁用平移动画，降低卡顿风险。
    map.panTo(center, { animate: !isPlaying, duration: isPlaying ? 0 : 0.8 });
  }, [center, map, isPlaying]);

  return null;
};

// 内风圈保持恒定颜色，防止模拟过程中颜色偏移
const INNER_RING_COLOR = '#3b82f6';

export const TyphoonMap: React.FC<TyphoonMapProps> = ({
  data,
  currentIndex,
  language,
  isRightPanelOpen,
  showCloudMap,
  cloudFrameUrls,
  isPlaying = false,
  onCloudFrameLoaded,
}) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  const currentPoint = data[currentIndex];
  const [activeCloudImageUrl, setActiveCloudImageUrl] = useState<string | null>(null);
  const latestRequestedUrl = useRef<string | null>(null);

  const path = useMemo(() => data.map(p => [p.lat, p.lng] as [number, number]), [data]);
  const currentPos = useMemo(() => [currentPoint.lat, currentPoint.lng] as [number, number], [currentPoint]);

  // 固定的云图覆盖范围：60°S - 60°N, 80°E - 160°W (200°E)
  const imageBounds: L.LatLngBoundsExpression = [
    [-60, 80], // [South, West]
    [60, 200]  // [North, East]
  ];

  const availableCloudFrameUrls = cloudFrameUrls && cloudFrameUrls.length > 0
    ? cloudFrameUrls
    : [];

  const cloudUrlIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    availableCloudFrameUrls.forEach((url, index) => {
      map.set(url, index);
    });
    return map;
  }, [availableCloudFrameUrls]);

  const notifyCloudFrameLoaded = (url: string) => {
    if (!onCloudFrameLoaded) {
      return;
    }

    const frameIndex = cloudUrlIndexMap.get(url);
    if (frameIndex !== undefined) {
      onCloudFrameLoaded(frameIndex);
    }
  };

  const targetCloudImageUrl = availableCloudFrameUrls.length > 0
    ? availableCloudFrameUrls[Math.min(currentIndex, availableCloudFrameUrls.length - 1)]
    : null;

  useEffect(() => {
    if (!targetCloudImageUrl) {
      setActiveCloudImageUrl(null);
      return;
    }

    let isCancelled = false;
    latestRequestedUrl.current = targetCloudImageUrl;

    preloadCloudImage(targetCloudImageUrl)
      .then(() => {
        if (!isCancelled && latestRequestedUrl.current === targetCloudImageUrl) {
          setActiveCloudImageUrl(targetCloudImageUrl);
        }

        notifyCloudFrameLoaded(targetCloudImageUrl);
      })
      .catch(() => {
        // 保持上一帧，避免切换时出现空白闪烁
      });

    return () => {
      isCancelled = true;
    };
  }, [targetCloudImageUrl]);

  useEffect(() => {
    if (!availableCloudFrameUrls.length) {
      return;
    }

    const around: string[] = [];
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = currentIndex + offset;
      const prev = currentIndex - offset;

      if (next < availableCloudFrameUrls.length) {
        around.push(availableCloudFrameUrls[next]);
      }
      if (prev >= 0) {
        around.push(availableCloudFrameUrls[prev]);
      }
    }

    around.forEach(url => {
      void preloadCloudImage(url)
        .then(() => {
          notifyCloudFrameLoaded(url);
        })
        .catch(() => undefined);
    });

    const farAhead = availableCloudFrameUrls.slice(currentIndex + 3, currentIndex + 25);
    let timeoutId: number | undefined;

    const prefetchFarFrames = () => {
      farAhead.forEach(url => {
        void preloadCloudImage(url)
          .then(() => {
            notifyCloudFrameLoaded(url);
          })
          .catch(() => undefined);
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback) => number;
        cancelIdleCallback: (handle: number) => void;
      }).requestIdleCallback(() => prefetchFarFrames());

      return () => {
        (window as Window & {
          cancelIdleCallback: (handle: number) => void;
        }).cancelIdleCallback(idleId);
      };
    }

    timeoutId = window.setTimeout(prefetchFarFrames, 200);
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [availableCloudFrameUrls, currentIndex]);

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
        {showCloudMap && activeCloudImageUrl && (
          <ImageOverlay
            url={activeCloudImageUrl}
            bounds={imageBounds}
            opacity={1}
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
        })} />

        <MapController center={currentPos} bounds={imageBounds} isPlaying={isPlaying} />
      </MapContainer>

      {/* 内核呼吸动画样式 */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
