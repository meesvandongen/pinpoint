import { isCategory, type Category } from './categories.ts'

/**
 * How OpenStreetMap tags map onto pin categories. Contributors who know a place by its OSM tags can
 * look up a category here, and `osm.test.ts` checks the table against the most used tag values from
 * taginfo (`pnpm run taginfo` refreshes them).
 *
 * `ignore` marks values that are not destinations on their own: street furniture, utilities, parking
 * and bare tags. They are counted as covered, because no category is missing for them.
 * A `*` entry is the fallback for every other value of that key.
 */
export type OsmTarget = Category | 'ignore'

const RULES: Record<string, Record<string, OsmTarget>> = {
  tourism: {
    museum: 'culture', gallery: 'culture', artwork: 'art', giant_furniture: 'art', viewpoint: 'viewpoint', photopoint: 'viewpoint',
    attraction: 'attraction', theme_park: 'attraction', nature_centre: 'attraction', zoo: 'zoo', aquarium: 'zoo',
    hotel: 'hotel', hostel: 'hotel', guest_house: 'hotel', motel: 'hotel', apartment: 'hotel', chalet: 'hotel', resort: 'hotel',
    spa_resort: 'hotel', holiday_village: 'hotel', picnic_site: 'park', camp_site: 'park', caravan_site: 'park',
    alpine_hut: 'building', wilderness_hut: 'building', cabin: 'building', hunting_lodge: 'building',
    wine_cellar: 'food', winery: 'food',
    information: 'ignore', camp_pitch: 'ignore', yes: 'ignore', no: 'ignore', trail_riding_station: 'ignore', checkpoint: 'ignore',
    lean_to: 'ignore', picnic_table: 'ignore', disused_camp_site: 'ignore', register: 'ignore',
  },
  historic: {
    memorial: 'memorial', monument: 'monument', wayside_cross: 'monument', wayside_shrine: 'monument', boundary_stone: 'monument',
    milestone: 'monument', stone: 'monument', cannon: 'monument', aircraft: 'monument', wreck: 'monument', heritage: 'monument',
    bomb_crater: 'monument', archaeological_site: 'ruins', ruins: 'ruins', bunker: 'ruins',
    castle: 'castle', fort: 'castle', city_gate: 'castle', citywalls: 'castle', manor: 'castle',
    tomb: 'cemetery', building: 'building', house: 'house', farm: 'farm', church: 'church', monastery: 'religious',
    tower: 'tower', bridge: 'bridge', maritime: 'harbour', mine: 'industrial', mine_shaft: 'industrial', shieling: 'building',
    locomotive: 'station', railway: 'station',
    yes: 'ignore', no: 'ignore', charcoal_pile: 'ignore', hollow_way: 'ignore', roman_road: 'ignore', district: 'ignore',
  },
  amenity: {
    restaurant: 'food', fast_food: 'food', cafe: 'food', ice_cream: 'food', bar: 'pub', pub: 'pub',
    place_of_worship: 'religious', school: 'education', kindergarten: 'education', college: 'education', university: 'education',
    childcare: 'education', driving_school: 'education',
    pharmacy: 'health', clinic: 'health', hospital: 'health', doctors: 'health', dentist: 'health', veterinary: 'health',
    bank: 'civic', post_office: 'civic', community_centre: 'civic', social_facility: 'civic', townhall: 'civic', police: 'civic',
    fire_station: 'civic', public_building: 'civic', courthouse: 'civic',
    library: 'library', public_bookcase: 'library', theatre: 'theatre', cinema: 'theatre', events_venue: 'theatre', clock: 'clock',
    fountain: 'fountain', drinking_water: 'fountain', watering_place: 'water', grave_yard: 'cemetery', marketplace: 'market',
    bus_station: 'station', ferry_terminal: 'harbour', fuel: 'shop',
    parking: 'ignore', parking_space: 'ignore', parking_entrance: 'ignore', bench: 'ignore', waste_basket: 'ignore',
    bicycle_parking: 'ignore', shelter: 'ignore', recycling: 'ignore', toilets: 'ignore', post_box: 'ignore', vending_machine: 'ignore',
    waste_disposal: 'ignore', hunting_stand: 'ignore', atm: 'ignore', charging_station: 'ignore', car_wash: 'ignore',
    parcel_locker: 'ignore', bicycle_rental: 'ignore', telephone: 'ignore', taxi: 'ignore', letter_box: 'ignore',
    motorcycle_parking: 'ignore', bbq: 'ignore', water_point: 'ignore', loading_dock: 'ignore', grit_bin: 'ignore',
    shower: 'ignore', car_rental: 'ignore',
  },
  building: {
    yes: 'building', commercial: 'building', cabin: 'building', office: 'building',
    house: 'house', residential: 'house', detached: 'house', apartments: 'house', semidetached_house: 'house', terrace: 'house',
    bungalow: 'house', dormitory: 'house',
    industrial: 'industrial', warehouse: 'industrial', manufacture: 'industrial', hangar: 'industrial', silo: 'industrial',
    farm: 'farm', farm_auxiliary: 'farm', barn: 'farm', greenhouse: 'farm',
    church: 'church', chapel: 'church', mosque: 'religious',
    school: 'education', kindergarten: 'education', university: 'education', public: 'civic', civic: 'civic',
    hospital: 'health', hotel: 'hotel', retail: 'shop', ruins: 'ruins', bunker: 'ruins', train_station: 'station', boathouse: 'harbour',
    garage: 'ignore', shed: 'ignore', roof: 'ignore', hut: 'ignore', construction: 'ignore', outbuilding: 'ignore', garages: 'ignore',
    static_caravan: 'ignore', service: 'ignore', allotment_house: 'ignore', carport: 'ignore', ger: 'ignore', storage_tank: 'ignore',
    transformer_tower: 'ignore',
  },
  man_made: {
    tower: 'tower', mast: 'tower', water_tower: 'tower', antenna: 'tower', lighthouse: 'lighthouse', chimney: 'chimney',
    windmill: 'mill', watermill: 'mill', works: 'industrial', silo: 'industrial', wastewater_plant: 'industrial',
    water_works: 'industrial', pumping_station: 'industrial', kiln: 'industrial', bridge: 'bridge',
    pier: 'harbour', breakwater: 'harbour', groyne: 'harbour', water_well: 'water', cairn: 'monument', cross: 'monument',
    obelisk: 'monument', courtyard: 'square',
    storage_tank: 'ignore', cutline: 'ignore', surveillance: 'ignore', manhole: 'ignore', utility_pole: 'ignore',
    survey_point: 'ignore', pipeline: 'ignore', embankment: 'ignore', petroleum_well: 'ignore', street_cabinet: 'ignore',
    flagpole: 'ignore', clearcut: 'ignore', water_tap: 'ignore', bunker_silo: 'ignore', monitoring_station: 'ignore',
    reservoir_covered: 'ignore', beehive: 'ignore', planter: 'ignore', charge_point: 'ignore', dyke: 'ignore', gantry: 'ignore',
  },
  leisure: {
    park: 'park', garden: 'garden', playground: 'playground', common: 'park', dog_park: 'park', recreation_ground: 'park',
    bandstand: 'park', swimming_pool: 'sports', pitch: 'sports', sports_centre: 'sports', track: 'sports', fitness_centre: 'sports',
    stadium: 'sports', sports_hall: 'sports', golf_course: 'sports', horse_riding: 'sports', sauna: 'sports', ice_rink: 'sports',
    bowling_alley: 'sports', nature_reserve: 'nature', beach_resort: 'nature', bird_hide: 'nature', marina: 'harbour',
    slipway: 'harbour', water_park: 'attraction', miniature_golf: 'attraction', amusement_arcade: 'attraction',
    swimming_area: 'water', bathing_place: 'water', dance: 'theatre', schoolyard: 'education', resort: 'hotel',
    picnic_table: 'ignore', fitness_station: 'ignore', outdoor_seating: 'ignore', bleachers: 'ignore', firepit: 'ignore',
    fishing: 'ignore', adult_gaming_centre: 'ignore', hot_tub: 'ignore',
  },
  natural: {
    tree: 'tree', tree_row: 'tree', water: 'water', spring: 'water', bay: 'water',
    wood: 'nature', scrub: 'nature', wetland: 'nature', grassland: 'nature', bare_rock: 'nature', coastline: 'nature',
    peak: 'nature', cliff: 'nature', heath: 'nature', sand: 'nature', scree: 'nature', shrub: 'nature', ridge: 'nature',
    beach: 'nature', rock: 'nature', glacier: 'nature', shrubbery: 'nature', reef: 'nature', stone: 'nature', shingle: 'nature',
  },
  shop: { '*': 'shop', vacant: 'ignore' },
  railway: {
    station: 'station', halt: 'station', tram_stop: 'station', platform: 'station', stop: 'station',
    rail: 'ignore', switch: 'ignore', level_crossing: 'ignore', signal: 'ignore', abandoned: 'ignore', buffer_stop: 'ignore',
    milestone: 'ignore', crossing: 'ignore', disused: 'ignore', tram: 'ignore', tram_level_crossing: 'ignore', subway: 'ignore',
  },
  waterway: {
    stream: 'water', river: 'water', canal: 'water', weir: 'water', rapids: 'water', waterfall: 'water', tidal_channel: 'water',
    dam: 'water', lock_gate: 'harbour',
    ditch: 'ignore', drain: 'ignore', flowline: 'ignore',
  },
  public_transport: {
    station: 'station', stop_area: 'station', platform: 'station',
    stop_position: 'ignore', stop_area_group: 'ignore', pole: 'ignore',
  },
  landuse: {
    cemetery: 'cemetery', religious: 'religious', industrial: 'industrial', quarry: 'industrial', retail: 'shop',
    farmland: 'nature', forest: 'nature', meadow: 'nature', grass: 'park', recreation_ground: 'park', allotments: 'garden',
    flowerbed: 'garden', orchard: 'farm', farmyard: 'farm', vineyard: 'farm', greenhouse_horticulture: 'farm',
    basin: 'water', reservoir: 'water',
    residential: 'ignore', commercial: 'ignore', construction: 'ignore', brownfield: 'ignore', aquaculture: 'ignore',
    railway: 'ignore', garages: 'ignore',
  },
  place: {
    square: 'square', neighbourhood: 'ignore', suburb: 'ignore', quarter: 'ignore', city_block: 'ignore', hamlet: 'ignore',
    locality: 'ignore', village: 'ignore', town: 'ignore', city: 'ignore', municipality: 'ignore', isolated_dwelling: 'ignore',
    plot: 'ignore', farm: 'farm', islet: 'nature', island: 'nature',
  },
  highway: {
    pedestrian: 'street', living_street: 'street', residential: 'street', footway: 'street', steps: 'street', path: 'street',
    cycleway: 'street', service: 'street', unclassified: 'street', tertiary: 'street', secondary: 'street', primary: 'street',
    trunk: 'street', motorway: 'street', motorway_link: 'street', trunk_link: 'street', primary_link: 'street', track: 'street',
    bus_stop: 'station',
    crossing: 'ignore', street_lamp: 'ignore', turning_circle: 'ignore', stop: 'ignore', traffic_signals: 'ignore', give_way: 'ignore',
  },
}

/**
 * The category for an OpenStreetMap tag, `'ignore'` for values that are not destinations, or
 * `undefined` when nothing covers it yet. Values such as `guest_house;apartment` use the first part
 * that is known.
 */
export function osmCategory(key: string, value: string): OsmTarget | undefined {
  const rules = Object.hasOwn(RULES, key) ? RULES[key] : undefined
  if (!rules) return undefined
  for (const part of value.split(';')) {
    const trimmed = part.trim()
    const hit = Object.hasOwn(rules, trimmed) ? rules[trimmed] : rules['*']
    if (hit) return hit
  }
  return undefined
}

export const OSM_KEYS = Object.keys(RULES)

/** Every category some OSM tag points at, to see which categories nothing maps to. */
export function mappedCategories(): Set<Category> {
  const found = new Set<Category>()
  for (const rules of Object.values(RULES)) {
    for (const target of Object.values(rules)) if (target !== 'ignore' && isCategory(target)) found.add(target)
  }
  return found
}
