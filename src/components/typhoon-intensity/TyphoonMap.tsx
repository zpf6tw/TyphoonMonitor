
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import { Language, TyphoonPoint } from '../../types';
import { CloudImageMode } from '../../utils/cloudFrames';
import {
  CLOUD_FAR_PRELOAD_COUNT_IDLE,
  CLOUD_FAR_PRELOAD_COUNT_PLAYING,
  CLOUD_NEAR_PRELOAD_RADIUS,
  isCloudImageDecoded,
  isCloudImageLoaded,
  preloadCloudImage,
} from '../../utils/cloudImagePreloader';
import { CloudTemperatureLegend } from './CloudTemperatureLegend';

// Leaflet 默认图标在 Vite 打包后路径可能丢失，因此显式指定 CDN 资源。
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
  linkedTyphoon?: LinkedTyphoonOverlay | null;
}

interface LinkedTyphoonOverlay {
  name: string;
  data: TyphoonPoint[];
  currentIndex: number;
}

interface MapControllerProps {
  center: [number, number];
  bounds: L.LatLngBoundsLiteral;
  isPlaying: boolean;
  isScrubbing: boolean;
}

// 云图覆盖范围固定为西北太平洋主要展示区，稳定引用可避免地图约束反复重算。
const FIXED_IMAGE_BOUNDS: L.LatLngBoundsLiteral = [
  [-60, 80],
  [60, 200],
];

const MapController: React.FC<MapControllerProps> = ({ center, bounds, isPlaying, isScrubbing }) => {
  const map = useMap();

  // 地图边界随容器尺寸重新计算，保证左右面板开合后不会露出无底图区域。
  useEffect(() => {
    const leafletBounds = L.latLngBounds(bounds);

    const updateMapConstraints = () => {
      map.invalidateSize();
      // inside=true 要求完整视口落在 bounds 内，适合固定云图覆盖范围。
      const minZoom = map.getBoundsZoom(leafletBounds, true);
      map.setMinZoom(minZoom);
      map.setMaxBounds(leafletBounds);

      if (map.getZoom() < minZoom) {
        map.setZoom(minZoom);
      }
    };

    updateMapConstraints();

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

  // 播放或拖动时不自动平移地图，避免用户观察路径时视野被频繁打断。
  useEffect(() => {
    if (isScrubbing || isPlaying) {
      return;
    }

    map.panTo(center, { animate: true, duration: 0.8 });
  }, [center, map, isPlaying, isScrubbing]);

  return null;
};

// 颜色常量集中维护，确保主台风、联动台风和云图叠加层在地图上语义稳定。
const INNER_RING_COLOR = '#3b82f6';
const CLOUD_OVERLAY_OPACITY = 1;
const LINKED_STORM_COLOR = '#f59e0b';
const EMPTY_CLOUD_FRAME_URLS: Array<string | null> = [];

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
  linkedTyphoon,
}) => {
  const [activeCloudImageUrl, setActiveCloudImageUrl] = useState<string | null>(null);
  const [displayedCloudImageUrl, setDisplayedCloudImageUrl] = useState<string | null>(null);
  const latestRequestedUrl = useRef<string | null>(null);

  // Leaflet 路径只需要经纬度数组，缓存派生结果可避免地图层在无关状态变化时重建。
  const path = useMemo(() => data.map(p => [p.lat, p.lng] as [number, number]), [data]);
  const linkedPath = useMemo(
    () => linkedTyphoon?.data.map(p => [p.lat, p.lng] as [number, number]) || [],
    [linkedTyphoon?.data]
  );

  const imageBounds = FIXED_IMAGE_BOUNDS;

  const availableCloudFrameUrls = useMemo(
    () => cloudFrameUrls ?? EMPTY_CLOUD_FRAME_URLS,
    [cloudFrameUrls]
  );
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

  // 当前时间点没有精确云图时，向前后查找最近可用帧，保证播放过程不断层。
  const findNearestAvailableUrl = useCallback((targetIndex: number): string | null => {
    if (!hasCloudFrames || targetIndex < 0) {
      return null;
    }

    const maxDistance = Math.max(targetIndex, availableCloudFrameUrls.length - 1 - targetIndex);
    for (let offset = 0; offset <= maxDistance; offset += 1) {
      const previousIndex = targetIndex - offset;
      if (previousIndex >= 0) {
        const previousUrl = availableCloudFrameUrls[previousIndex];
        if (previousUrl) {
          return previousUrl;
        }
      }

      const nextIndex = targetIndex + offset;
      if (offset > 0 && nextIndex < availableCloudFrameUrls.length) {
        const nextUrl = availableCloudFrameUrls[nextIndex];
        if (nextUrl) {
          return nextUrl;
        }
      }
    }

    return null;
  }, [availableCloudFrameUrls, hasCloudFrames]);

  // 云图实际完成加载后通知入口层，用于时间轴缓冲进度和自动播放推进控制。
  const notifyCloudFrameLoaded = useCallback((url: string) => {
    if (!onCloudFrameLoaded) {
      return;
    }

    const frameIndex = cloudUrlIndexMap.get(url);
    if (frameIndex !== undefined) {
      onCloudFrameLoaded(frameIndex);
    }
  }, [cloudUrlIndexMap, onCloudFrameLoaded]);

  const exactCloudImageUrl = hasCloudFrames
    ? availableCloudFrameUrls[currentIndex] || null
    : null;
  const targetCloudImageUrl = exactCloudImageUrl
    ? exactCloudImageUrl
    : hasCloudFrames
      ? findNearestAvailableUrl(currentIndex)
      : null;

  // 目标帧索引用于保持路径、云图和缓冲状态对齐。
  const targetCloudFrameIndex = targetCloudImageUrl
    ? cloudUrlIndexMap.get(targetCloudImageUrl) ?? currentIndex
    : -1;

  // 新目标帧未加载时，优先回退到最近已加载历史帧，避免地图上出现空白闪烁。
  const findNearestLoadedUrl = useCallback((targetIndex: number): string | null => {
    if (!hasCloudFrames || targetIndex < 0) {
      return null;
    }

    for (let index = targetIndex; index >= 0; index -= 1) {
      const url = availableCloudFrameUrls[index];
      if (url && isCloudImageLoaded(url)) {
        return url;
      }
    }

    return null;
  }, [availableCloudFrameUrls, hasCloudFrames]);

  const immediatelyRenderableCloudImageUrl = targetCloudImageUrl && isCloudImageLoaded(targetCloudImageUrl)
    ? targetCloudImageUrl
    : findNearestLoadedUrl(targetCloudFrameIndex);

  const renderedCloudImageUrl = immediatelyRenderableCloudImageUrl || activeCloudImageUrl;
  const renderedCloudFrameIndex = renderedCloudImageUrl
    ? cloudUrlIndexMap.get(renderedCloudImageUrl)
    : undefined;
  const synchronizedIndex = showCloudMap
    && exactCloudImageUrl
    && targetCloudImageUrl
    && renderedCloudFrameIndex !== undefined
    ? renderedCloudFrameIndex
    : currentIndex;
  const visualIndex = Math.min(Math.max(synchronizedIndex, 0), Math.max(0, data.length - 1));
  const currentPoint = data[visualIndex] || data[0];
  const currentPos = useMemo(() => [currentPoint.lat, currentPoint.lng] as [number, number], [currentPoint]);
  // 联动台风只在同一时间点存在数据时显示当前位置，缺失时保留主台风视图。
  const linkedVisualIndex = linkedTyphoon
    ? Math.min(Math.max(linkedTyphoon.currentIndex, -1), Math.max(-1, linkedTyphoon.data.length - 1))
    : -1;
  const linkedCurrentPoint = linkedTyphoon && linkedVisualIndex >= 0
    ? linkedTyphoon.data[linkedVisualIndex]
    : null;
  const linkedCurrentPos = linkedCurrentPoint
    ? [linkedCurrentPoint.lat, linkedCurrentPoint.lng] as [number, number]
    : null;

  // 当前帧采用“先预加载、再切换”的策略，解码完成前保持上一张可见云图。
  useEffect(() => {
    if (!targetCloudImageUrl) {
      setActiveCloudImageUrl(null);
      setDisplayedCloudImageUrl(null);
      return;
    }

    let isCancelled = false;
    latestRequestedUrl.current = targetCloudImageUrl;

    const nearestLoadedUrl = activeCloudImageUrl || findNearestLoadedUrl(targetCloudFrameIndex);
    if (nearestLoadedUrl) {
      setActiveCloudImageUrl(nearestLoadedUrl);
    }

    const shouldWaitForDecode = isPlaying && !isScrubbing;

    preloadCloudImage(targetCloudImageUrl, { waitForDecode: shouldWaitForDecode, priority: 'high' })
      .then(() => {
        if (!isCancelled && latestRequestedUrl.current === targetCloudImageUrl) {
          setActiveCloudImageUrl(targetCloudImageUrl);
        }

        if (shouldWaitForDecode || isCloudImageDecoded(targetCloudImageUrl)) {
          notifyCloudFrameLoaded(targetCloudImageUrl);
        }
      })
      .catch(() => {
        // 加载失败时保持上一帧，避免切换时出现空白闪烁。
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeCloudImageUrl,
    findNearestLoadedUrl,
    isPlaying,
    isScrubbing,
    notifyCloudFrameLoaded,
    targetCloudFrameIndex,
    targetCloudImageUrl,
  ]);

  // 近邻帧优先解码，远端帧在空闲时预取，兼顾播放平滑和初始加载成本。
  useEffect(() => {
    if (!hasCloudFrames) {
      return;
    }

    const around = new Set<string>();
    for (let offset = 1; offset <= CLOUD_NEAR_PRELOAD_RADIUS; offset += 1) {
      const next = currentIndex + offset;
      const prev = currentIndex - offset;

      const nextUrl = next < availableCloudFrameUrls.length ? availableCloudFrameUrls[next] : null;
      const prevUrl = prev >= 0 ? availableCloudFrameUrls[prev] : null;

      if (nextUrl) {
        around.add(nextUrl);
      }
      if (prevUrl) {
        around.add(prevUrl);
      }
    }

    around.forEach((url) => {
      void preloadCloudImage(url, { waitForDecode: true, priority: 'normal' })
        .then(() => {
          notifyCloudFrameLoaded(url);
        })
        .catch(() => undefined);
    });

    const farAheadCount = isPlaying ? CLOUD_FAR_PRELOAD_COUNT_PLAYING : CLOUD_FAR_PRELOAD_COUNT_IDLE;
    const farAheadStart = currentIndex + CLOUD_NEAR_PRELOAD_RADIUS + 1;
    const farAhead = availableCloudFrameUrls
      .slice(farAheadStart, farAheadStart + farAheadCount)
      .filter((url): url is string => Boolean(url));
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const prefetchFarFrames = () => {
      farAhead.forEach(url => {
        void preloadCloudImage(url, { waitForDecode: false, priority: 'idle' })
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
  }, [availableCloudFrameUrls, currentIndex, isPlaying, hasCloudFrames, notifyCloudFrameLoaded]);

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
        {/* 底图使用高德中文瓦片，保证中文标注和国内访问稳定性。 */}
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

        {linkedPath.length > 0 && (
          <Polyline
            positions={linkedPath}
            color={LINKED_STORM_COLOR}
            weight={2}
            dashArray="5, 10"
            opacity={0.35}
          />
        )}

        {linkedPath.length > 0 && linkedVisualIndex >= 0 && (
          <Polyline
            positions={linkedPath.slice(0, linkedVisualIndex + 1)}
            color={LINKED_STORM_COLOR}
            weight={3}
            opacity={0.9}
          />
        )}

        <Polyline
          positions={path.slice(0, visualIndex + 1)}
          color="#3b82f6"
          weight={3}
          opacity={1}
        />

        {/* 云图先以透明层完成加载，再替换可见层，减少 ImageOverlay 换帧闪烁。 */}
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
                }
              },
            }}
          />
        )}

        {/* 联动台风使用橙色风圈，与主台风蓝色风圈区分。 */}
        {linkedCurrentPoint && linkedCurrentPos && (
          <>
            <Circle
              center={linkedCurrentPos}
              radius={linkedCurrentPoint.outer_radius_pred * 1000}
              pathOptions={{
                color: LINKED_STORM_COLOR,
                weight: 1,
                fillOpacity: 0.05,
                fillColor: LINKED_STORM_COLOR,
                className: 'outer-wind-ring linked-outer-wind-ring'
              }}
            />

            <Circle
              center={linkedCurrentPos}
              radius={linkedCurrentPoint.inner_radius_pred * 1000}
              pathOptions={{
                fillColor: LINKED_STORM_COLOR,
                fillOpacity: 0.3,
                color: '#fff',
                weight: 2,
                className: 'inner-wind-ring linked-inner-wind-ring'
              }}
            />
          </>
        )}

        {/* 主台风风圈使用 IDOL 估计半径，和右上角参数对比面板保持一致。 */}
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

        {/* 内风圈突出 RMW 结构，配合呼吸动画强调当前中心强度区域。 */}
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

      {showCloudMap && hasCloudFrames && (
        <CloudTemperatureLegend mode={cloudMode} language={language} leftClassName={legendLeftClassName} />
      )}

      {/* 呼吸动画仅作用于 Leaflet 生成的风圈路径，需要以内联样式注入到地图容器内。 */}
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
