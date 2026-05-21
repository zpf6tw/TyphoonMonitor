const loadedCloudUrls = new Set<string>();
const decodedCloudUrls = new Set<string>();
const loadingCloudPromises = new Map<string, Promise<void>>();

// 模块级缓存跨组件实例复用，避免播放或拖动时间轴时重复请求同一帧云图。
const CLOUD_PRELOAD_CONCURRENCY = 3;

export const CLOUD_NEAR_PRELOAD_RADIUS = 2;
export const CLOUD_FAR_PRELOAD_COUNT_PLAYING = 2;
export const CLOUD_FAR_PRELOAD_COUNT_IDLE = 4;

export type CloudPreloadPriority = 'high' | 'normal' | 'idle';

interface QueuedCloudPreload {
  promiseKey: string;
  priority: number;
  sequence: number;
  run: () => void;
}

const CLOUD_PRELOAD_PRIORITIES: Record<CloudPreloadPriority, number> = {
  high: 0,
  normal: 1,
  idle: 2,
};

// 队列状态保存在模块作用域，多个地图渲染周期共享同一组加载任务。
let activeCloudPreloadCount = 0;
let cloudPreloadSequence = 0;
const queuedCloudPreloads: QueuedCloudPreload[] = [];
const queuedCloudPreloadsByKey = new Map<string, QueuedCloudPreload>();

interface PreloadCloudOptions {
  waitForDecode?: boolean;
  priority?: CloudPreloadPriority;
}

export const isCloudImageLoaded = (url: string): boolean => loadedCloudUrls.has(url);

export const isCloudImageDecoded = (url: string): boolean => decodedCloudUrls.has(url);

// 预加载队列按优先级和入队顺序执行，限制并发数以免阻塞地图瓦片请求。
const runNextCloudPreload = () => {
  if (activeCloudPreloadCount >= CLOUD_PRELOAD_CONCURRENCY || queuedCloudPreloads.length === 0) {
    return;
  }

  queuedCloudPreloads.sort((left, right) => left.priority - right.priority || left.sequence - right.sequence);
  const nextPreload = queuedCloudPreloads.shift();
  if (!nextPreload) {
    return;
  }

  queuedCloudPreloadsByKey.delete(nextPreload.promiseKey);
  activeCloudPreloadCount += 1;
  nextPreload.run();
};

const finishCloudPreload = () => {
  activeCloudPreloadCount = Math.max(0, activeCloudPreloadCount - 1);
  runNextCloudPreload();
};

const scheduleCloudPreload = (promiseKey: string, priority: CloudPreloadPriority, run: () => void) => {
  const preloadTask = {
    promiseKey,
    priority: CLOUD_PRELOAD_PRIORITIES[priority],
    sequence: cloudPreloadSequence,
    run,
  };

  queuedCloudPreloads.push(preloadTask);
  queuedCloudPreloadsByKey.set(promiseKey, preloadTask);
  cloudPreloadSequence += 1;
  runNextCloudPreload();
};

// 已排队的任务可以被提升优先级，拖动到附近帧时无需重复创建请求。
const boostQueuedCloudPreload = (promiseKey: string, priority: CloudPreloadPriority) => {
  const preloadTask = queuedCloudPreloadsByKey.get(promiseKey);
  if (!preloadTask) {
    return;
  }

  preloadTask.priority = Math.min(preloadTask.priority, CLOUD_PRELOAD_PRIORITIES[priority]);
};

export const preloadCloudImage = (url: string, options: PreloadCloudOptions = {}): Promise<void> => {
  if (!url) {
    return Promise.resolve();
  }

  const { waitForDecode = true, priority = 'normal' } = options;
  const promiseKey = `${url}|${waitForDecode ? 'decode' : 'raw'}`;

  if ((waitForDecode ? decodedCloudUrls : loadedCloudUrls).has(url)) {
    return Promise.resolve();
  }

  const existing = loadingCloudPromises.get(promiseKey);
  if (existing) {
    boostQueuedCloudPreload(promiseKey, priority);
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    scheduleCloudPreload(promiseKey, priority, () => {
      if ((waitForDecode ? decodedCloudUrls : loadedCloudUrls).has(url)) {
        loadingCloudPromises.delete(promiseKey);
        finishCloudPreload();
        resolve();
        return;
      }

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
        finishCloudPreload();
        resolve();
      };
      image.onerror = () => {
        loadingCloudPromises.delete(promiseKey);
        finishCloudPreload();
        reject(new Error(`Failed to preload cloud frame: ${url}`));
      };
      image.src = url;
    });
  });

  loadingCloudPromises.set(promiseKey, promise);
  return promise;
};
