
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import { Language, TyphoonPoint } from '../types';
import { CLOUD_IMAGE_MODE_LABELS, CloudImageMode } from '../utils/cloudFrames';

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
  showCloudMap: boolean;
  cloudMode?: CloudImageMode;
  cloudFrameUrls?: Array<string | null>;
  language?: Language;
  isPlaying?: boolean;
  isScrubbing?: boolean;
  legendLeftClassName?: string;
  onCloudFrameLoaded?: (frameIndex: number) => void;
}

const loadedCloudUrls = new Set<string>();
const decodedCloudUrls = new Set<string>();
const loadingCloudPromises = new Map<string, Promise<void>>();

interface PreloadCloudOptions {
  waitForDecode?: boolean;
}

interface MapControllerProps {
  center: [number, number];
  bounds: L.LatLngBoundsLiteral;
  isPlaying: boolean;
  isScrubbing: boolean;
}

// 固定边界使用稳定引用，避免每次渲染触发地图约束与覆盖层重置。
const FIXED_IMAGE_BOUNDS: L.LatLngBoundsLiteral = [
  [-60, 80],
  [60, 200],
];

const preloadCloudImage = (url: string, options: PreloadCloudOptions = {}): Promise<void> => {
  if (!url) {
    return Promise.resolve();
  }

  const { waitForDecode = true } = options;
  const promiseKey = `${url}|${waitForDecode ? 'decode' : 'raw'}`;

  if ((waitForDecode ? decodedCloudUrls : loadedCloudUrls).has(url)) {
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

      if (waitForDecode) {
        decodedCloudUrls.add(url);
      }

      loadedCloudUrls.add(url);
      loadingCloudPromises.delete(promiseKey);
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

const MapController: React.FC<MapControllerProps> = ({ center, bounds, isPlaying, isScrubbing }) => {
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
    if (isScrubbing || isPlaying) {
      return;
    }

    map.panTo(center, { animate: true, duration: 0.8 });
  }, [center, map, isPlaying, isScrubbing]);

  return null;
};

// 内风圈保持恒定颜色，防止模拟过程中颜色偏移
const INNER_RING_COLOR = '#3b82f6';
const CLOUD_OVERLAY_OPACITY = 1;

interface CloudLegendStop {
  color: string;
  position: number;
}

const CLOUD_TEMPERATURE_LEGENDS: Record<CloudImageMode, CloudLegendStop[]> = {
  pseudoColor: [
    { color: '#6b8094', position: 0 },
    { color: '#b8d1eb', position: 10 },
    { color: '#f5faff', position: 24 },
    { color: '#ffeb80', position: 40 },
    { color: '#ff8a33', position: 56 },
    { color: '#eb242e', position: 72 },
    { color: '#c21fd1', position: 88 },
    { color: '#3ddcff', position: 100 },
  ],
  coolWhite: [
    { color: '#4d617a', position: 0 },
    { color: '#8aa8c7', position: 14 },
    { color: '#c2dbf0', position: 30 },
    { color: '#ebf7ff', position: 50 },
    { color: '#ffffff', position: 72 },
    { color: '#d1f0ff', position: 88 },
    { color: '#9ed6ff', position: 100 },
  ],
};

const buildLegendGradient = (mode: CloudImageMode): string => {
  const stops = CLOUD_TEMPERATURE_LEGENDS[mode]
    .map(stop => `${stop.color} ${stop.position}%`)
    .join(', ');
  return `linear-gradient(90deg, ${stops})`;
};

const CloudTemperatureLegend: React.FC<{ mode: CloudImageMode; language: Language; leftClassName: string }> = ({ mode, language, leftClassName }) => (
  <div className={`absolute top-[7.75rem] ${leftClassName} z-[1000] w-[280px] rounded-2xl border border-white bg-white/95 backdrop-blur-md p-3 shadow-xl pointer-events-none`}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold text-slate-700">
        {CLOUD_IMAGE_MODE_LABELS[mode][language]}
      </span>
      <span className="text-[10px] font-semibold text-slate-400">
        {language === 'en' ? 'BT (K)' : '亮温 (K)'}
      </span>
    </div>
    <div
      className="mt-2 h-3 w-full rounded-sm border border-slate-200"
      style={{ background: buildLegendGradient(mode) }}
    />
    <div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-500">
      <span>290K</span>
      <span>240K</span>
      <span>190K</span>
    </div>
    <p className="mt-2 text-[10px] leading-snug text-slate-500">
      {language === 'en'
        ? 'Himawari-8 infrared Band 13, lower brightness temperature means colder cloud tops.'
        : '使用葵花8号红外波段13通道数据，亮温越低表示云顶越冷。'}
    </p>
  </div>
);

export const TyphoonMap: React.FC<TyphoonMapProps> = ({
  data,
  currentIndex,
  showCloudMap,
  cloudMode = 'pseudoColor',
  cloudFrameUrls,
  language = 'zh',
  isPlaying = false,
  isScrubbing = false,
  legendLeftClassName = 'left-6',
  onCloudFrameLoaded,
}) => {
  const [activeCloudImageUrl, setActiveCloudImageUrl] = useState<string | null>(null);
  const [displayedCloudImageUrl, setDisplayedCloudImageUrl] = useState<string | null>(null);
  const [displayedCloudFrameIndex, setDisplayedCloudFrameIndex] = useState<number | null>(null);
  const latestRequestedUrl = useRef<string | null>(null);

  const path = useMemo(() => data.map(p => [p.lat, p.lng] as [number, number]), [data]);

  // 固定的云图覆盖范围：60°S - 60°N, 80°E - 160°W (200°E)
  const imageBounds = FIXED_IMAGE_BOUNDS;

  const availableCloudFrameUrls = useMemo(() => cloudFrameUrls ?? [], [cloudFrameUrls]);
  const hasCloudFrames = availableCloudFrameUrls.some(Boolean);

  const cloudUrlIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    availableCloudFrameUrls.forEach((url, index) => {
      if (url) {
        map.set(url, index);
      }
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

  const targetCloudImageUrl = hasCloudFrames
    ? availableCloudFrameUrls[currentIndex] || null
    : null;

  const targetCloudFrameIndex = targetCloudImageUrl
    ? currentIndex
    : -1;

  const findNearestLoadedUrl = (targetIndex: number): string | null => {
    if (!hasCloudFrames || targetIndex < 0) {
      return null;
    }

    for (let index = targetIndex; index >= 0; index -= 1) {
      const url = availableCloudFrameUrls[index];
      if (url && loadedCloudUrls.has(url)) {
        return url;
      }
    }

    return null;
  };

  const immediatelyRenderableCloudImageUrl = targetCloudImageUrl && loadedCloudUrls.has(targetCloudImageUrl)
    ? targetCloudImageUrl
    : findNearestLoadedUrl(targetCloudFrameIndex);

  const renderedCloudImageUrl = immediatelyRenderableCloudImageUrl || activeCloudImageUrl;
  const renderedCloudFrameIndex = renderedCloudImageUrl
    ? cloudUrlIndexMap.get(renderedCloudImageUrl)
    : undefined;
  const synchronizedIndex = showCloudMap
    && targetCloudImageUrl
    && renderedCloudImageUrl
    && displayedCloudFrameIndex !== null
    ? displayedCloudFrameIndex
    : currentIndex;
  const visualIndex = Math.min(Math.max(synchronizedIndex, 0), Math.max(0, data.length - 1));
  const currentPoint = data[visualIndex] || data[0];
  const currentPos = useMemo(() => [currentPoint.lat, currentPoint.lng] as [number, number], [currentPoint]);

  useEffect(() => {
    if (!targetCloudImageUrl) {
      setActiveCloudImageUrl(null);
      setDisplayedCloudImageUrl(null);
      setDisplayedCloudFrameIndex(null);
      return;
    }

    let isCancelled = false;
    latestRequestedUrl.current = targetCloudImageUrl;

    const nearestLoadedUrl = activeCloudImageUrl || findNearestLoadedUrl(targetCloudFrameIndex);
    if (nearestLoadedUrl) {
      setActiveCloudImageUrl(nearestLoadedUrl);
    }

    const shouldWaitForDecode = isPlaying && !isScrubbing;

    preloadCloudImage(targetCloudImageUrl, { waitForDecode: shouldWaitForDecode })
      .then(() => {
        if (!isCancelled && latestRequestedUrl.current === targetCloudImageUrl) {
          setActiveCloudImageUrl(targetCloudImageUrl);
        }

        if (shouldWaitForDecode || decodedCloudUrls.has(targetCloudImageUrl)) {
          notifyCloudFrameLoaded(targetCloudImageUrl);
        }
      })
      .catch(() => {
        // 保持上一帧，避免切换时出现空白闪烁
      });

    return () => {
      isCancelled = true;
    };
  }, [targetCloudImageUrl, targetCloudFrameIndex, isPlaying, isScrubbing]);

  useEffect(() => {
    setActiveCloudImageUrl(null);
    setDisplayedCloudImageUrl(null);
    setDisplayedCloudFrameIndex(null);
  }, [cloudFrameUrls, cloudMode]);

  useEffect(() => {
    if (!hasCloudFrames) {
      return;
    }

    const around: string[] = [];
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = currentIndex + offset;
      const prev = currentIndex - offset;

      const nextUrl = next < availableCloudFrameUrls.length ? availableCloudFrameUrls[next] : null;
      const prevUrl = prev >= 0 ? availableCloudFrameUrls[prev] : null;

      if (nextUrl) {
        around.push(nextUrl);
      }
      if (prevUrl) {
        around.push(prevUrl);
      }
    }

    around.forEach(url => {
      void preloadCloudImage(url)
        .then(() => {
          notifyCloudFrameLoaded(url);
        })
        .catch(() => undefined);
    });

    const farAheadWindow = isPlaying ? 8 : 25;
    const farAhead = availableCloudFrameUrls
      .slice(currentIndex + 3, currentIndex + farAheadWindow)
      .filter((url): url is string => Boolean(url));
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

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

    timeoutId = setTimeout(prefetchFarFrames, isPlaying ? 350 : 200);
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [availableCloudFrameUrls, currentIndex, isPlaying, hasCloudFrames]);

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
          positions={path.slice(0, visualIndex + 1)}
          color="#3b82f6"
          weight={3}
          opacity={1}
        />

        {/* 卫星云图叠加层 */}
        {showCloudMap && displayedCloudImageUrl && displayedCloudImageUrl !== renderedCloudImageUrl && (
          <ImageOverlay
            key={`displayed-${displayedCloudImageUrl}`}
            url={displayedCloudImageUrl}
            bounds={imageBounds}
            opacity={CLOUD_OVERLAY_OPACITY}
            className="satellite-cloud-overlay"
          />
        )}

        {showCloudMap && renderedCloudImageUrl && (
          <ImageOverlay
            key={`staged-${renderedCloudImageUrl}`}
            url={renderedCloudImageUrl}
            bounds={imageBounds}
            opacity={displayedCloudImageUrl === renderedCloudImageUrl ? CLOUD_OVERLAY_OPACITY : 0}
            className="satellite-cloud-overlay"
            eventHandlers={{
              load: () => {
                if (renderedCloudFrameIndex !== undefined) {
                  setDisplayedCloudImageUrl(renderedCloudImageUrl);
                  setDisplayedCloudFrameIndex(renderedCloudFrameIndex);
                }
              },
            }}
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

        <MapController center={currentPos} bounds={imageBounds} isPlaying={isPlaying} isScrubbing={isScrubbing} />
      </MapContainer>

      {showCloudMap && displayedCloudImageUrl && (
        <CloudTemperatureLegend mode={cloudMode} language={language} leftClassName={legendLeftClassName} />
      )}

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
