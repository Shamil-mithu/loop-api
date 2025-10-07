const getRandomWheelPoints = (data) => {
  const cumulative = [];
  let total = 0;
  data.forEach((item) => {
    total += item.probability;
    cumulative.push({
      points: item.points,
      range: total,
    });
  });
  const random = Math.random() * 100;
  for (const item of cumulative) {
    if (random <= item.range) {
      return item.points;
    }
  }
  return null;
};

module.exports = getRandomWheelPoints;
