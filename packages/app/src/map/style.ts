import type { StyleSpecification } from 'maplibre-gl'

/** Vector tiles from OpenFreeMap: free, no key, OpenMapTiles layout. */
export const TILEJSON_URL = 'https://tiles.openfreemap.org/planet'
export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

const PAPER = '#f3ecd8'
const INK = '#2b2a26'
const EDGE = '#cfc3a0'
const ROAD = '#fffaf0'

const lines = ['LineString', 'MultiLineString']
const polygons = ['Polygon', 'MultiPolygon']
const isLine = ['match', ['geometry-type'], lines, true, false] as const
const isPolygon = ['match', ['geometry-type'], polygons, true, false] as const
const width = (base: number, stops: [number, number, number, number]) =>
  ['interpolate', ['exponential', base], ['zoom'], stops[0], stops[1], stops[2], stops[3]] as unknown as number
const hide = (...classes: string[]) => ['!', ['match', ['get', 'brunnel'], classes, true, false]] as const

/**
 * The passport look for the map: cream land, blue-grey water, thin ink labels. Layers follow the
 * OpenMapTiles schema (water, landcover, landuse, park, building, transportation, place, ...).
 * No sprites are needed because it draws no icons.
 */
export function passportStyle(): StyleSpecification {
  const roadFilter = (...classes: string[]) => ['all', isLine, ['match', ['get', 'class'], classes, true, false], hide('tunnel')]
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      openmaptiles: { type: 'vector', url: TILEJSON_URL, attribution: ATTRIBUTION },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': PAPER } },
      {
        id: 'landcover-grass', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
        filter: ['all', isPolygon, ['match', ['get', 'class'], ['grass', 'farmland'], true, false]],
        paint: { 'fill-color': '#e7e6c8', 'fill-opacity': 0.8 },
      },
      {
        id: 'landcover-wood', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
        filter: ['all', isPolygon, ['==', ['get', 'class'], 'wood']],
        paint: { 'fill-color': '#d9dfb9', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 12, 1] },
      },
      {
        id: 'landuse-residential', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', maxzoom: 16,
        filter: ['all', isPolygon, ['==', ['get', 'class'], 'residential']],
        paint: { 'fill-color': '#ece4cb', 'fill-opacity': 0.8 },
      },
      {
        id: 'landuse-green', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse',
        filter: ['all', isPolygon, ['match', ['get', 'class'], ['cemetery', 'playground', 'pitch', 'school', 'hospital'], true, false]],
        paint: { 'fill-color': '#e2e3c2' },
      },
      {
        id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', filter: isPolygon as never,
        paint: { 'fill-color': '#d6dcb0' },
      },
      {
        id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water',
        filter: ['all', isPolygon, ['!=', ['get', 'brunnel'], 'tunnel']],
        paint: { 'fill-color': '#bcd2d8', 'fill-antialias': true },
      },
      {
        id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', filter: isLine as never,
        paint: { 'line-color': '#bcd2d8', 'line-width': width(1.3, [10, 0.6, 20, 8]) },
      },
      {
        id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 13,
        paint: { 'fill-color': '#e6dcc0', 'fill-outline-color': EDGE, 'fill-antialias': true },
      },
      {
        id: 'path', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 14,
        filter: roadFilter('path') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#a99c78', 'line-dasharray': [2, 2], 'line-width': width(1.2, [14, 0.8, 20, 3]) },
      },
      {
        id: 'road-minor-casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 12,
        filter: roadFilter('minor', 'service', 'track') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': EDGE, 'line-width': width(1.55, [12, 1.2, 20, 22]) },
      },
      {
        id: 'road-minor', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 12,
        filter: roadFilter('minor', 'service', 'track') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROAD, 'line-width': width(1.55, [12, 0.7, 20, 18]) },
      },
      {
        id: 'road-major-casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 6,
        filter: roadFilter('motorway', 'trunk', 'primary', 'secondary', 'tertiary') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#b9ac86', 'line-width': width(1.4, [6, 1.5, 20, 34]) },
      },
      {
        id: 'road-major', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 6,
        filter: roadFilter('motorway', 'trunk', 'primary', 'secondary', 'tertiary') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROAD, 'line-width': width(1.4, [6, 0.8, 20, 30]) },
      },
      {
        id: 'railway', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 12,
        filter: ['all', isLine, ['==', ['get', 'class'], 'rail']] as never,
        paint: { 'line-color': '#a99c78', 'line-dasharray': [4, 3], 'line-width': width(1.3, [12, 1, 20, 4]) },
      },
      {
        id: 'boundary', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary', maxzoom: 12,
        filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]] as never,
        paint: { 'line-color': '#9a8f74', 'line-dasharray': [3, 2], 'line-width': 1.2 },
      },
      {
        id: 'road-name', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name', minzoom: 14.5,
        layout: {
          'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 14],
          'text-rotation-alignment': 'map',
        },
        paint: { 'text-color': '#5c5440', 'text-halo-color': PAPER, 'text-halo-width': 1.5 },
      },
      {
        id: 'water-name', type: 'symbol', source: 'openmaptiles', 'source-layer': 'water_name',
        layout: {
          'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Italic'],
          'text-size': 13, 'text-letter-spacing': 0.15, 'text-max-width': 6,
        },
        paint: { 'text-color': '#3f6f80', 'text-halo-color': PAPER, 'text-halo-width': 1.2 },
      },
      {
        id: 'place-small', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', minzoom: 10,
        filter: ['match', ['get', 'class'], ['village', 'suburb', 'neighbourhood', 'quarter', 'hamlet'], true, false],
        layout: {
          'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Italic'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 16, 15], 'text-max-width': 8,
        },
        paint: { 'text-color': INK, 'text-halo-color': PAPER, 'text-halo-width': 1.5 },
      },
      {
        id: 'place-large', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place',
        filter: ['match', ['get', 'class'], ['city', 'town', 'state', 'country'], true, false],
        layout: {
          'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 12, 20], 'text-letter-spacing': 0.08, 'text-max-width': 8,
          'text-transform': 'uppercase',
        },
        paint: { 'text-color': INK, 'text-halo-color': PAPER, 'text-halo-width': 2 },
      },
    ] as StyleSpecification['layers'],
  }
}
