import { TyphoonPoint } from '../../types';
import { CloudFrameMeta, CloudImageMode, getPrimaryCloudFrames } from '../../utils/cloudFrames';
import { toPointTimestamp } from './time';

type CloudFrameGroups = Record<CloudImageMode, CloudFrameMeta[]>;

// 当前模式没有云图时回退到主色标，保证时间轴仍尽量能匹配到卫星帧。
export const selectCloudFramesForMode = (
  frameGroups: CloudFrameGroups | null,
  mode: CloudImageMode
): CloudFrameMeta[] => {
  if (!frameGroups) {
    return [];
  }

  const modeFrames = frameGroups[mode];
  return modeFrames.length > 0 ? modeFrames : getPrimaryCloudFrames(frameGroups);
};

// 将台风时间轴映射为同长度 URL 数组，缺帧位置保留 null 供地图层就近回退。
export const buildCloudFrameUrlsForTimeline = (
  timelineData: TyphoonPoint[],
  preferredFrames: CloudFrameMeta[],
  fallbackFrames: CloudFrameMeta[]
): Array<string | null> => {
  const preferredFramesByTimestamp = new Map(
    preferredFrames.map(frame => [frame.timestamp, frame.url])
  );
  const fallbackFramesByTimestamp = new Map(
    fallbackFrames.map(frame => [frame.timestamp, frame.url])
  );

  return timelineData.map(point => {
    const timestamp = toPointTimestamp(point.time);
    return preferredFramesByTimestamp.get(timestamp) || fallbackFramesByTimestamp.get(timestamp) || null;
  });
};
