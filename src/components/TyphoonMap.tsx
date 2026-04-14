
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
  isScrubbing?: boolean;
  onCloudFrameLoaded?: (frameIndex: number) => void;
}

const loadedCloudUrls = new Set<string>();
const loadingCloudPromises = new Map<string, Promise<void>>();

interface PreloadCloudOptions {
  waitForDecode?: boolean;
}

const preloadCloudImage = (url: string, options: PreloadCloudOptions = {}): Promise<void> => {
  if (!url) {
    return Promise.resolve();
  }

  const { waitForDecode = true } = options;
  const promiseKey = `${url}|${waitForDecode ? 'decode' : 'raw'}`;

  if (loadedCloudUrls.has(url)) {
    return Promise.resolve();
  }

  const existing = loadingCloudPromises.get(promiseKey);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      // 播放时优先解码平滑，拖动跳转时优先快速出图。
      if (waitForDecode) {
        try {
          if (typeof image.decode === 'function') {
            await image.decode();
          }
        } catch {
          // decode 失败时退回到普通 onload 结果
        }
      }

      loadedCloudUrls.add(url);
      loadingCloudPromises.delete(`${url}|decode`);
      loadingCloudPromises.delete(`${url}|raw`);
      resolve();
    };
    image.onerror = () => {
      loadingCloudPromises.delete(promiseKey);
      reject(new Error(`Failed to preload cloud frame: ${url}`));
    };
    image.src = url;
  });

  loadingCloudPromises.set(promiseKey, promise);
  return promise;
};

const MapController: React.FC<{ center: [number, number], bounds: L.LatLngBoundsExpression, isPlaying: boolean, isScrubbing: boolean }> = ({ center, bounds, isPlaying, isScrubbing }) => {
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
    if (isScrubbing) {
      return;
    }

    // 连续播放时禁用平移动画，降低卡顿风险。
    map.panTo(center, { animate: !isPlaying, duration: isPlaying ? 0 : 0.8 });
  }, [center, map, isPlaying, isScrubbing]);

  return null;
};

// 内风圈保持恒定颜色，防止模拟过程中颜色偏移
const INNER_RING_COLOR = '#3b82f6';

const CENTER_MARKER_BASE_SIZE = 16;
const CENTER_MARKER_BASE_ZOOM = 5;
const CENTER_MARKER_MIN_SIZE = 3;
const CENTER_MARKER_MAX_SIZE = 24;

const getCenterMarkerSize = (zoom: number): number => {
  const scaledSize = CENTER_MARKER_BASE_SIZE * Math.pow(2, zoom - CENTER_MARKER_BASE_ZOOM);
  return Math.max(CENTER_MARKER_MIN_SIZE, Math.min(CENTER_MARKER_MAX_SIZE, scaledSize));
};

const TyphoonCenterMarker: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => map.getZoom());

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };

    map.on('zoom', updateZoom);
    map.on('zoomend', updateZoom);

    return () => {
      map.off('zoom', updateZoom);
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  const markerSize = Math.round(getCenterMarkerSize(zoom));
  const borderWidth = Math.max(1, Math.round(markerSize / 8));

  const markerIcon = useMemo(() => {
    return new L.DivIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position: relative; display: flex; width: ${markerSize}px; height: ${markerSize}px;">
          <span class="center-marker-ping" style="position: absolute; inset: 0; display: inline-flex; border-radius: 9999px; background: #60a5fa; opacity: 0.75;"></span>
          <span style="position: relative; display: inline-flex; width: ${markerSize}px; height: ${markerSize}px; border-radius: 9999px; background: #2563eb; border: ${borderWidth}px solid #ffffff; box-sizing: border-box;"></span>
        </div>
      `,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
    });
  }, [markerSize, borderWidth]);

  return <Marker position={position} icon={markerIcon} interactive={false} />;
};

export const TyphoonMap: React.FC<TyphoonMapProps> = ({
  data,
  currentIndex,
  language,
  isRightPanelOpen,
  showCloudMap,
  cloudFrameUrls,
  isPlaying = false,
  isScrubbing = false,
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

  const targetCloudFrameIndex = availableCloudFrameUrls.length > 0
    ? Math.min(currentIndex, availableCloudFrameUrls.length - 1)
    : -1;

  const findNearestLoadedUrl = (targetIndex: number): string | null => {
    if (!availableCloudFrameUrls.length || targetIndex < 0) {
      return null;
    }

    for (let offset = 0; offset < availableCloudFrameUrls.length; offset += 1) {
      const left = targetIndex - offset;
      if (left >= 0) {
        const leftUrl = availableCloudFrameUrls[left];
        if (loadedCloudUrls.has(leftUrl)) {
          return leftUrl;
        }
      }

      const right = targetIndex + offset;
      if (right < availableCloudFrameUrls.length) {
        const rightUrl = availableCloudFrameUrls[right];
        if (loadedCloudUrls.has(rightUrl)) {
          return rightUrl;
        }
      }
    }

    return null;
  };

  useEffect(() => {
    if (!targetCloudImageUrl) {
      setActiveCloudImageUrl(null);
      return;
    }

    let isCancelled = false;
    latestRequestedUrl.current = targetCloudImageUrl;

    const nearestLoadedUrl = findNearestLoadedUrl(targetCloudFrameIndex);
    if (nearestLoadedUrl) {
      setActiveCloudImageUrl(nearestLoadedUrl);
    }

    preloadCloudImage(targetCloudImageUrl, { waitForDecode: isPlaying && !isScrubbing })
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
  }, [targetCloudImageUrl, targetCloudFrameIndex, isPlaying, isScrubbing]);

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

        {/* 当前位置脉冲标记（随地图缩放动态变化） */}
        <TyphoonCenterMarker position={currentPos} />

        <MapController center={currentPos} bounds={imageBounds} isPlaying={isPlaying} isScrubbing={isScrubbing} />
      </MapContainer>

      {/* 内核呼吸动画样式 */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes innerBreathing {
          0% { fill-opacity: 0.35; stroke-width: 1.5; }
          50% { fill-opacity: 0.55; stroke-width: 2.5; }
          100% { fill-opacity: 0.35; stroke-width: 1.5; }
        }
        @keyframes centerPing {
          0% { transform: scale(1); opacity: 0.75; }
          75% { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .inner-wind-ring {
          animation: innerBreathing 2.5s ease-in-out infinite;
        }
        .center-marker-ping {
          animation: centerPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}} />
    </div>
  );
};
