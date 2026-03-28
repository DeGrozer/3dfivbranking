/**
 * @fileoverview Configuration constants for the volleyball globe application
 * @author Volleyball Globe Team
 * @version 1.0.0
 */

/**
 * Globe rendering configuration
 * @constant {Object}
 */
export const GLOBE_CONFIG = {
  /** Canvas dimensions */
  WIDTH: 960,
  HEIGHT: 640,
  
  /** Projection settings */
  SCALE: 280,
  CLIP_ANGLE: 90,
  
  /** Zoom constraints */
  MIN_SCALE: 200,
  MAX_SCALE: 600,
  ZOOM_EXTENT: [0.6, 2],
  
  /** Rotation settings */
  INITIAL_PHI: -10,
  ROTATION_SPEED: 0.02,
  DRAG_SENSITIVITY: 0.25,
  PHI_MIN: -90,
  PHI_MAX: 90
};

/**
 * Volleyball pin marker dimensions
 * @constant {Object}
 */
export const PIN_CONFIG = {
  STICK_LENGTH: 35,
  STICK_WIDTH: 3.5,
  BALL_RADIUS: 12,
  BALL_STROKE_WIDTH: 2.5,
  LINE_STROKE_WIDTH: 2,
  COLOR: '#ffd700',
  GLOW_INTENSITY: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
};

/**
 * Animation timing configuration
 * @constant {Object}
 */
export const ANIMATION_CONFIG = {
  CARD_DELAYS: [100, 200, 300, 400], // Staggered card appearance
  TRANSITION_DURATION: 400,
  TRANSITION_EASING: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
};

/**
 * Theme color palettes for gender modes
 * @constant {Object}
 */
export const THEME_COLORS = {
  men: {
    background: '#2c3e7a',
    primary: '#3b4d8f',
    accent: '#5a6faa'
  },
  women: {
    background: '#7a3e3b',
    primary: '#8f4d4b',
    accent: '#aa6f6c'
  },
  default: {
    background: '#1a1f2e',
    primary: '#2a3f5f',
    accent: '#3d5a7e'
  }
};

/**
 * External API endpoints
 * @constant {Object}
 */
export const API_ENDPOINTS = {
  FLAG_PRIMARY: 'https://flagcdn.com/w320/',
  FLAG_FALLBACK: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Flag_of_None.svg/320px-Flag_of_None.svg.png',
  TOPOJSON_LOCAL: 'assets/data/world-110m.json',
  TOPOJSON_CDN: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
};

/**
 * UI element selectors
 * @constant {Object}
 */
export const SELECTORS = {
  GLOBE_CONTAINER: '#globe',
  GENDER_TOGGLE: '#genderToggle',
  CLOSE_BTN: '#closeBtn',
  COUNTRY_NAME: '#countryName',
  FLAG_CONTAINER: '#flagContainer',
  RANKING_VALUE: '#rankingValue',
  PLAYERS_VALUE: '#playersValue',
  TOURNAMENTS_VALUE: '#tournamentsValue',
  CARDS: '.card',
  COUNTRY_CARD: '#countryCard',
  RANKING_CARD: '#rankingCard',
  PLAYERS_CARD: '#playersCard',
  TOURNAMENTS_CARD: '#tournamentsCard'
};
