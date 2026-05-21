const POINT_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;

// 云图文件按 YYYYMMDDHH 建索引，时间轴时间需要先规整到同一键格式。
export const toPointTimestamp = (time: string): string => {
  const match = String(time).match(POINT_TIME_PATTERN);
  if (!match) {
    return String(time).replace(/\D/g, '').slice(0, 10);
  }

  const [, year, month, day, hour] = match;
  return `${year}${month}${day}${hour}`;
};

// 底部时间轴只展示月日和时分，减少长时间标签对控件宽度的占用。
export const toTimelineShortLabel = (time: string): string => {
  const match = String(time).match(POINT_TIME_PATTERN);
  if (!match) {
    return time;
  }

  const [, , month, day, hour, minute] = match;
  return `${month}-${day} ${hour}:${minute}`;
};
