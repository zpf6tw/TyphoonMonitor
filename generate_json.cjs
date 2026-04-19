const fs = require('fs');

const generateTyphoonData = (caseName, hours = 24) => {
  const points = [];
  const startPos = {
    'ATSANI': { lat: 21.5, lng: 128.0, drift: 0.12 },
  };

  const { lat: baseLat, lng: baseLng, drift } = startPos[caseName] || startPos['ATSANI'];

  for (let i = 0; i <= hours; i += 3) {
    const time = `${String(i).padStart(2, '0')}:00`;
    let lat, lng;
    const t = i / hours;

    if (caseName === 'ATSANI') {
      lat = baseLat + (i * drift * 1.1) + (Math.sin(i * 0.3) * 0.4);
      lng = baseLng - (i * drift * 1.4) + (Math.cos(i * 0.3) * 0.4);
    } else {
      lat = baseLat + (i * drift * 0.8) + (i * i * 0.008);
      lng = baseLng - (i * drift * 1.5) + (i * i * 0.02);
    }

    const latError = (Math.sin(i * 0.8) * 0.08) + (Math.random() * 0.03 - 0.015);
    const lngError = (Math.cos(i * 0.8) * 0.08) + (Math.random() * 0.03 - 0.015);
    const lat_pred = lat + latError;
    const lng_pred = lng + lngError;

    const baseIntensity = 35 + Math.sin(i / 8) * 20;
    const intensity_real = Math.round(baseIntensity + Math.random() * 3);
    const intensity_pred = Math.round(baseIntensity + (Math.sin(i / 5) * 3) + Math.random() * 4 - 2);

    const pressure = 1000 - (intensity_real * 1.8);
    const pressure_pred = 1000 - (intensity_pred * 1.8) + (Math.random() * 4 - 2);

    const inner_radius_real = Math.round(30 + Math.sin(i / 6) * 8);
    const outer_radius_real = Math.round(200 + Math.cos(i / 10) * 40);

    const inner_radius_pred = Math.round(inner_radius_real + (Math.random() * 10 - 5));
    const outer_radius_pred = Math.round(outer_radius_real + (Math.random() * 20 - 10));

    points.push({
      time,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      intensity_real,
      intensity_pred,
      pressure: Number(pressure.toFixed(1)),
      lat_pred: Number(lat_pred.toFixed(4)),
      lng_pred: Number(lng_pred.toFixed(4)),
      pressure_pred: Number(pressure_pred.toFixed(1)),
      inner_radius_real,
      outer_radius_real,
      inner_radius_pred,
      outer_radius_pred
    });
  }
  return points;
};

const MOCK_CASES = [
  { id: '1', nameEn: 'ATSANI(2015)', nameZh: '艾莎尼(2015)', data: generateTyphoonData('ATSANI', 48) }
];

fs.writeFileSync('./src/data/typhoonData.json', JSON.stringify(MOCK_CASES, null, 2));
