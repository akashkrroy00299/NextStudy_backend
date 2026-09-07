import geoip from 'geoip-lite'

export const getLocationFromRequest = (req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress

  const geo = geoip.lookup(ip)

  const location = geo
    ? `${geo.city || 'Unknown city'}, ${geo.country}`
    : 'Unknown location'

  return { ip, location }
}