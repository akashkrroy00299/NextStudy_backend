import geoip from 'geoip-lite'

export const getLocationFromRequest = (req) => {
  const ip = req.ip || req.socket.remoteAddress || null

  const geo = ip ? geoip.lookup(ip) : null

  const location = geo
    ? `${geo.city || 'Unknown city'}, ${geo.country}`
    : 'Unknown location'

  return { ip, location }
}