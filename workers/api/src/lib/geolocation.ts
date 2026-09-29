export const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const isWithinProximity = (
  memberLat: number | null,
  memberLon: number | null,
  chapterLat: number | null,
  chapterLon: number | null,
  radiusKm: number = 15
): boolean => {
  if (memberLat === null || memberLon === null || chapterLat === null || chapterLon === null) {
    return false;
  }
  const distance = haversineDistanceKm(memberLat, memberLon, chapterLat, chapterLon);
  return distance <= radiusKm;
};

export const getProximityStatus = (
  memberLat: number | null,
  memberLon: number | null,
  chapterLat: number | null,
  chapterLon: number | null,
  radiusKm: number = 15
): 'within' | 'outside' | 'unknown' => {
  if (memberLat === null || memberLon === null || chapterLat === null || chapterLon === null) {
    return 'unknown';
  }
  const distance = haversineDistanceKm(memberLat, memberLon, chapterLat, chapterLon);
  if (distance <= radiusKm) {
    return 'within';
  }
  return 'outside';
};