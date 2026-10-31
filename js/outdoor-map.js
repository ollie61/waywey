// Explicit outdoor-map handoff.
//
// WayWey never derives an outdoor destination from an indoor room/building.
// A map link is available only when the hospital dataset contains an explicit,
// source-backed outdoorMap.query value. No location permission is requested.

const GOOGLE_MAPS_SEARCH="https://www.google.com/maps/search/?api=1&query=";

export function outdoorMapQuery(destination){
  const q=destination&&destination.outdoorMap&&destination.outdoorMap.query;
  return typeof q==="string"&&q.trim()?q.trim():null;
}

export function outdoorMapUrl(destination){
  const query=outdoorMapQuery(destination);
  return query?GOOGLE_MAPS_SEARCH+encodeURIComponent(query):null;
}

export function hasOutdoorMap(destination){
  return outdoorMapUrl(destination)!==null;
}
