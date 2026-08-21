import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, CheckCircle2, CircleDot, MapPin, Radio, Satellite, SunMedium } from 'lucide-react';
import worldAtlas from 'world-atlas/countries-110m.json';

type Coordinate = [number, number];
type Ring = Coordinate[];
type Polygon = Ring[];

interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  enabled: boolean;
  type: string;
  location: string;
  data: string;
  status: string;
  imageUrl: string;
  imageCredit: string;
  description: string;
}

interface Landmass {
  id: string;
  label: string;
  labelLat: number;
  labelLon: number;
  points: Coordinate[];
}

interface TopoGeometry {
  type: string;
  arcs?: unknown;
  geometries?: TopoGeometry[];
}

interface Topology {
  transform?: { scale?: Coordinate; translate?: Coordinate };
  arcs?: Coordinate[][];
  objects?: Record<string, TopoGeometry>;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

interface ProjectedStation extends ProjectedPoint {
  station: Station;
}

const STATIONS: Station[] = [
  {
    id: 'bms', name: 'BMS / SRRLASI', lat: 39.742, lon: -105.18, enabled: true,
    type: '实测站点', location: 'Golden, Colorado, USA', data: '气象 / 辐照度 / ASI-16 天空图像', status: '可预测',
    imageUrl: 'https://midcdmz.nlr.gov/srrl_bms/pictures/thumbs/asi16.jpg', imageCredit: '图源：NREL MIDC SRRL/BMS 图片页',
    description: 'NREL Solar Radiation Research Laboratory，当前模型接入的主站点。',
  },
  {
    id: 'desertrock', name: 'SURFRAD Desert Rock', lat: 36.6237, lon: -116.0195, enabled: false,
    type: '真实站点', location: 'Desert Rock, Nevada, USA', data: 'NOAA SURFRAD 辐射观测', status: '仅展示',
    imageUrl: 'https://gml.noaa.gov/grad/surfrad/drapics/DRAsite2.jpg', imageCredit: '图源：NOAA GML SURFRAD Desert Rock',
    description: '美国西部干旱区辐射观测站，可用于展示高辐照场景。',
  },
  {
    id: 'bondville', name: 'SURFRAD Bondville', lat: 40.0519, lon: -88.3731, enabled: false,
    type: '真实站点', location: 'Bondville, Illinois, USA', data: 'NOAA SURFRAD 辐射观测', status: '仅展示',
    imageUrl: 'https://gml.noaa.gov/grad/surfrad/bndpics/bndsrf11c.jpg', imageCredit: '图源：NOAA GML SURFRAD Bondville',
    description: 'NOAA SURFRAD 地面太阳辐射观测站，作为未来多站点接入的真实示例。',
  },
  {
    id: 'pennstate', name: 'SURFRAD Penn State', lat: 40.7201, lon: -77.9309, enabled: false,
    type: '真实站点', location: 'Penn State, Pennsylvania, USA', data: 'NOAA SURFRAD 辐射观测', status: '仅展示',
    imageUrl: 'https://gml.noaa.gov/grad/surfrad/psupics/psusrf07c.jpg', imageCredit: '图源：NOAA GML SURFRAD Penn State',
    description: '美国东部 SURFRAD 站点，用于展示湿润和多云区域的接入形态。',
  },
  {
    id: 'xianghe', name: '香河观测站', lat: 39.75, lon: 116.96, enabled: false,
    type: '中国真实站点', location: '河北香河, China', data: '大气 / 辐射观测', status: '仅展示',
    imageUrl: '', imageCredit: '中国华北区域观测站点',
    description: '中国华北区域大气与太阳辐射观测站点，作为国内多站点接入候选。',
  },
  {
    id: 'waliguan', name: '瓦里关观象台', lat: 36.287, lon: 100.896, enabled: false,
    type: '中国真实站点', location: '青海瓦里关, China', data: '大气本底 / 气象观测', status: '仅展示',
    imageUrl: '', imageCredit: '青藏高原高海拔观测站点',
    description: '青藏高原东北缘的全球大气本底观象台，可展示高海拔站点接入。',
  },
];

const LANDMASSES: Landmass[] = [
  { id: 'northAmerica', label: '北美洲 / 美国', labelLat: 43, labelLon: -103, points: [[72, -168], [69, -143], [61, -132], [56, -123], [49, -124], [42, -125], [32, -117], [24, -111], [15, -96], [8, -82], [18, -65], [30, -80], [44, -67], [54, -58], [61, -70], [66, -92], [72, -108], [74, -135]] },
  { id: 'greenland', label: '格陵兰', labelLat: 73, labelLon: -42, points: [[60, -52], [63, -45], [68, -32], [75, -20], [82, -34], [83, -55], [77, -72], [69, -73], [62, -62]] },
  { id: 'southAmerica', label: '南美洲', labelLat: -16, labelLon: -59, points: [[12, -81], [7, -76], [-5, -81], [-17, -73], [-31, -71], [-45, -73], [-55, -67], [-50, -56], [-36, -53], [-22, -43], [-8, -35], [5, -50], [12, -61]] },
  { id: 'europe', label: '欧洲', labelLat: 49, labelLon: 12, points: [[36, -10], [43, -9], [51, -5], [58, 8], [70, 25], [65, 45], [54, 42], [45, 32], [37, 24], [35, 12]] },
  { id: 'africa', label: '非洲', labelLat: 6, labelLon: 21, points: [[35, -17], [31, 6], [32, 30], [18, 40], [5, 47], [-14, 41], [-34, 28], [-35, 18], [-23, 14], [-17, 4], [-6, -10], [10, -17], [25, -15]] },
  { id: 'asia', label: '亚洲', labelLat: 36, labelLon: 86, points: [[76, 45], [68, 90], [66, 150], [52, 170], [36, 140], [20, 121], [8, 104], [7, 78], [24, 68], [12, 45], [31, 35], [45, 42], [57, 58]] },
  { id: 'australia', label: '澳大利亚', labelLat: -25, labelLon: 134, points: [[-10, 113], [-13, 130], [-12, 146], [-25, 154], [-38, 145], [-35, 116], [-22, 112]] },
];

const STATION_LABEL_OFFSETS: Record<string, { dx: number; dy: number; align: CanvasTextAlign }> = {
  bms: { dx: -10, dy: -16, align: 'right' },
  desertrock: { dx: -10, dy: 15, align: 'right' },
  bondville: { dx: 10, dy: 13, align: 'left' },
  pennstate: { dx: 10, dy: -10, align: 'left' },
  xianghe: { dx: 10, dy: -8, align: 'left' },
  waliguan: { dx: 10, dy: 13, align: 'left' },
};

const decodeTopoArcs = (topology: Topology) => {
  const scale = topology.transform?.scale || [1, 1];
  const translate = topology.transform?.translate || [0, 0];
  return (topology.arcs || []).map(arc => {
    let x = 0;
    let y = 0;
    return arc.map(point => {
      x += point[0];
      y += point[1];
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as Coordinate;
    });
  });
};

const topoPolygonRings = (polygonArcs: number[][], decodedArcs: Coordinate[][]): Polygon => polygonArcs.map(ringArcs => {
  const ring: Ring = [];
  ringArcs.forEach((arcRef, arcIndex) => {
    const source = decodedArcs[arcRef >= 0 ? arcRef : ~arcRef] || [];
    const points = arcRef >= 0 ? source : [...source].reverse();
    points.forEach((point, pointIndex) => {
      if (arcIndex > 0 && pointIndex === 0) return;
      ring.push(point);
    });
  });
  return ring;
});

const topoGeometryPolygons = (geometry: TopoGeometry | undefined, decodedArcs: Coordinate[][]): Polygon[] => {
  if (!geometry) return [];
  if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries || []).flatMap(item => topoGeometryPolygons(item, decodedArcs));
  }
  if (geometry.type === 'Polygon') {
    return [topoPolygonRings(geometry.arcs as number[][], decodedArcs)];
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.arcs as number[][][]).map(polygon => topoPolygonRings(polygon, decodedArcs));
  }
  return [];
};

const GlobeCanvas: React.FC<{ selectedStationId: string; onSelectStation: (stationId: string) => void }> = ({ selectedStationId, onSelectStation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedIdRef = useRef(selectedStationId);
  const onSelectRef = useRef(onSelectStation);

  useEffect(() => { selectedIdRef.current = selectedStationId; }, [selectedStationId]);
  useEffect(() => { onSelectRef.current = onSelectStation; }, [onSelectStation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const rotation = { lon: 105, lat: 8 };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastFrame = performance.now();
    let frameId = 0;
    let visible = true;
    const topology = worldAtlas as unknown as Topology;
    const decodedArcs = decodeTopoArcs(topology);
    const landPolygons = topoGeometryPolygons(topology.objects?.land, decodedArcs);
    const countryPolygons = topoGeometryPolygons(topology.objects?.countries, decodedArcs);
    let projectedStations: ProjectedStation[] = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const projectPoint = (lat: number, lon: number, cx: number, cy: number, radius: number): ProjectedPoint => {
      const latitude = lat * Math.PI / 180;
      const longitude = (lon + rotation.lon) * Math.PI / 180;
      const tilt = rotation.lat * Math.PI / 180;
      const x = Math.cos(latitude) * Math.sin(longitude);
      const y0 = Math.sin(latitude);
      const z0 = Math.cos(latitude) * Math.cos(longitude);
      return {
        x: cx + x * radius,
        y: cy - (y0 * Math.cos(tilt) - z0 * Math.sin(tilt)) * radius,
        z: y0 * Math.sin(tilt) + z0 * Math.cos(tilt),
      };
    };

    const drawProjectedPolygon = (context: CanvasRenderingContext2D, polygon: Polygon, cx: number, cy: number, radius: number, fill: boolean) => {
      polygon.forEach(ring => {
        context.beginPath();
        let started = false;
        let visiblePoints = 0;
        ring.forEach(([lon, lat]) => {
          const point = projectPoint(lat, lon, cx, cy, radius);
          if (point.z < -0.015) { started = false; return; }
          visiblePoints += 1;
          if (!started) { context.moveTo(point.x, point.y); started = true; } else { context.lineTo(point.x, point.y); }
        });
        if (visiblePoints < 2) return;
        if (fill && visiblePoints > 6) context.fill();
        context.stroke();
      });
    };

    const drawGlobe = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      const isCompact = rect.width < 620;
      const cx = rect.width * (isCompact ? 0.5 : 0.54);
      const cy = rect.height * (isCompact ? 0.62 : 0.52);
      const radius = Math.min(rect.width * (isCompact ? 0.4 : 0.42), rect.height * (isCompact ? 0.36 : 0.46));

      const gradient = context.createRadialGradient(cx - radius * 0.35, cy - radius * 0.45, radius * 0.15, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
      gradient.addColorStop(0.45, 'rgba(68,161,169,0.25)');
      gradient.addColorStop(1, 'rgba(37,99,235,0.13)');
      context.fillStyle = gradient;
      context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.fill();

      context.save();
      context.beginPath(); context.arc(cx, cy, radius - 1, 0, Math.PI * 2); context.clip();
      if (landPolygons.length) {
        context.fillStyle = 'rgba(20,131,116,0.18)';
        context.strokeStyle = 'rgba(15,118,110,0.62)';
        context.lineWidth = 1.1;
        landPolygons.forEach(polygon => drawProjectedPolygon(context, polygon, cx, cy, radius, true));
        context.strokeStyle = 'rgba(37,99,235,0.24)';
        context.lineWidth = 0.6;
        countryPolygons.forEach(polygon => drawProjectedPolygon(context, polygon, cx, cy, radius, false));
      } else {
        LANDMASSES.forEach(shape => {
          const points = shape.points.map(([lat, lon]) => projectPoint(lat, lon, cx, cy, radius)).filter(point => point.z > -0.08);
          if (points.length < 3) return;
          context.beginPath();
          points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
          context.closePath();
          context.fillStyle = 'rgba(20,131,116,0.22)';
          context.strokeStyle = 'rgba(15,118,110,0.52)';
          context.lineWidth = 1.2;
          context.fill(); context.stroke();
        });
      }

      context.strokeStyle = 'rgba(15,118,110,0.27)';
      context.lineWidth = 1;
      const drawGridLine = (points: ProjectedPoint[]) => {
        context.beginPath();
        let started = false;
        points.forEach(point => {
          if (point.z < 0) { started = false; return; }
          if (!started) { context.moveTo(point.x, point.y); started = true; } else { context.lineTo(point.x, point.y); }
        });
        context.stroke();
      };
      for (let lat = -60; lat <= 60; lat += 20) {
        drawGridLine(Array.from({ length: 91 }, (_, index) => projectPoint(lat, -180 + index * 4, cx, cy, radius)));
      }
      for (let lon = -180; lon < 180; lon += 30) {
        drawGridLine(Array.from({ length: 44 }, (_, index) => projectPoint(-86 + index * 4, lon, cx, cy, radius)));
      }
      context.restore();

      context.save();
      context.font = '600 11px system-ui';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      LANDMASSES.forEach(shape => {
        const point = projectPoint(shape.labelLat, shape.labelLon, cx, cy, radius);
        if (point.z < 0.12) return;
        const width = context.measureText(shape.label).width + 14;
        context.fillStyle = 'rgba(255,255,255,0.76)';
        context.strokeStyle = 'rgba(15,118,110,0.26)';
        context.beginPath(); context.roundRect(point.x - width / 2, point.y - 10, width, 20, 8); context.fill(); context.stroke();
        context.fillStyle = '#17514a'; context.fillText(shape.label, point.x, point.y + 1);
      });
      context.restore();

      context.strokeStyle = 'rgba(15,118,110,0.52)';
      context.lineWidth = 1.5;
      context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();

      projectedStations = [];
      STATIONS.forEach(station => {
        const point = projectPoint(station.lat, station.lon, cx, cy, radius);
        if (point.z < -0.08) return;
        projectedStations.push({ ...point, station });
        context.fillStyle = station.id === selectedIdRef.current ? '#d97706' : station.enabled ? '#0f766e' : '#2563eb';
        context.strokeStyle = 'rgba(255,255,255,0.95)';
        context.lineWidth = 2;
        context.beginPath(); context.arc(point.x, point.y, station.enabled ? 7 : 5, 0, Math.PI * 2); context.fill(); context.stroke();
        if (rect.width >= 560) {
          const label = STATION_LABEL_OFFSETS[station.id] || { dx: 10, dy: -8, align: 'left' as CanvasTextAlign };
          context.fillStyle = '#13202a';
          context.font = '12px system-ui';
          context.textAlign = label.align;
          context.fillText(station.name, point.x + label.dx, point.y + label.dy);
        }
      });
    };

    const animate = (time: number) => {
      const delta = Math.min(time - lastFrame, 50);
      lastFrame = time;
      if (visible && !dragging && !reduceMotion) rotation.lon += delta * 0.002;
      if (visible) drawGlobe();
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      rotation.lon += (event.clientX - lastX) * 0.35;
      rotation.lat = Math.max(-65, Math.min(65, rotation.lat + (event.clientY - lastY) * 0.25));
      lastX = event.clientX; lastY = event.clientY; drawGlobe();
    };
    const handlePointerUp = () => { dragging = false; };
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = projectedStations.find(item => Math.hypot(item.x - x, item.y - y) < 15);
      if (hit) onSelectRef.current(hit.station.id);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') rotation.lon -= 6;
      if (event.key === 'ArrowRight') rotation.lon += 6;
      if (event.key === 'ArrowUp') rotation.lat = Math.min(65, rotation.lat + 4);
      if (event.key === 'ArrowDown') rotation.lat = Math.max(-65, rotation.lat - 4);
      drawGlobe();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('keydown', handleKeyDown);
    const resizeObserver = new ResizeObserver(drawGlobe);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; });
    intersectionObserver.observe(canvas);

    drawGlobe();
    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      aria-label="可拖拽旋转的全球太阳观测站点地球"
      tabIndex={0}
    />
  );
};

export const StationGlobeOverview: React.FC = () => {
  const [selectedStationId, setSelectedStationId] = useState('bms');
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const selectedStation = STATIONS.find(station => station.id === selectedStationId) || STATIONS[0];

  const selectStation = (stationId: string) => {
    setSelectedStationId(stationId);
    setImageFailed(false);
    setImageLoaded(false);
  };

  const scrollToForecast = () => document.getElementById('irradiance-forecast')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="relative h-[430px] overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(15,118,110,0.08),transparent_43%),linear-gradient(135deg,#f8fbfd_0%,#eaf2f6_100%)] sm:h-[560px] lg:h-[calc(100vh-112px)] lg:min-h-[620px] lg:max-h-[820px]">
        <GlobeCanvas selectedStationId={selectedStationId} onSelectStation={selectStation} />
        <div className="pointer-events-none absolute left-5 top-5 max-w-md sm:left-7 sm:top-7">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">全球太阳观测站点</h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">拖拽旋转地球，点击站点查看信息。当前已接入 BMS / SRRLASI，其他站点为未来多站点接入预留。</p>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-1.5 text-xs text-slate-500"><CircleDot size={13} />拖拽旋转 / 点击站点</div>
      </div>

      <aside className="flex min-h-full flex-col gap-4 border-t border-slate-200 p-4 lg:border-l lg:border-t-0">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-sky-100 via-white to-emerald-50">
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700"><Satellite size={36} /><span className="mt-2 text-xs font-semibold">太阳观测站点</span></div>
          )}
          {selectedStation.imageUrl && !imageFailed ? (
            <img
              key={selectedStation.id}
              src={selectedStation.imageUrl}
              alt={`${selectedStation.name} 观测设备`}
              className={`relative h-full w-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageFailed(true); setImageLoaded(false); }}
            />
          ) : null}
        </div>
        <p className="text-[11px] leading-4 text-slate-500">{selectedStation.imageCredit}</p>

        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${selectedStation.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${selectedStation.enabled ? 'bg-emerald-500' : 'bg-sky-500'}`} />
            {selectedStation.enabled ? 'online' : 'site'}
          </span>
          <h3 className="mt-2 text-xl font-extrabold text-slate-950">{selectedStation.name}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{selectedStation.description}</p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="flex items-center gap-1 text-[11px] text-slate-500"><Radio size={12} />类型</dt><dd className="mt-1 font-bold text-slate-800">{selectedStation.type}</dd></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={12} />位置</dt><dd className="mt-1 font-bold leading-4 text-slate-800">{selectedStation.location}</dd></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="flex items-center gap-1 text-[11px] text-slate-500"><SunMedium size={12} />数据</dt><dd className="mt-1 font-bold leading-4 text-slate-800">{selectedStation.data}</dd></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="flex items-center gap-1 text-[11px] text-slate-500"><CheckCircle2 size={12} />状态</dt><dd className="mt-1 font-bold text-slate-800">{selectedStation.status}</dd></div>
        </dl>

        <button
          type="button"
          onClick={scrollToForecast}
          disabled={!selectedStation.enabled}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {selectedStation.enabled ? '查看本站预测' : '该站点暂未接入'}<ArrowDown size={15} />
        </button>
      </aside>
    </section>
  );
};
