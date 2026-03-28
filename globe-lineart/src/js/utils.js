/**
 * @fileoverview Utility functions for the volleyball globe application
 * @author Volleyball Globe Team
 * @version 1.0.0
 */

import { COUNTRY_NAMES, ISO3_TO_ISO2 } from './data.js';
import { API_ENDPOINTS } from './config.js';

/**
 * Retrieves country name from feature data with multiple fallback strategies
 * 
 * @param {Object} feature - GeoJSON feature object
 * @param {string|number} feature.id - ISO3 numeric country code
 * @param {Object} [feature.properties] - Feature properties object
 * @returns {string} Country name or fallback identifier
 * 
 * @example
 * getCountryName({ id: '840' }) // Returns: "United States"
 * getCountryName({ id: '999' }) // Returns: "Country ID: 999"
 */
export function getCountryName(feature) {
  // Try ID mapping first
  if (COUNTRY_NAMES[feature.id]) {
    return COUNTRY_NAMES[feature.id];
  }
  
  // Try various property names from TopoJSON
  const props = feature.properties || {};
  const nameOptions = [
    props.NAME, 
    props.name, 
    props.NAME_EN, 
    props.NAME_LONG,
    props.ADMIN, 
    props.admin, 
    props.NAME_SORT, 
    props.NAME_LOCAL,
    props.SOVEREIGNT, 
    props.GEOUNIT, 
    props.NAME_AR, 
    props.NAME_ZH
  ];
  
  for (let name of nameOptions) {
    if (name && typeof name === 'string' && name.trim()) {
      return name.trim();
    }
  }
  
  // Last resort - use ID with formatting
  if (feature.id) {
    return `Country ID: ${feature.id}`;
  }
  
  return 'Unknown Country';
}

/**
 * Constructs flag image URL with fallback support
 * 
 * @param {string} countryId - ISO3 numeric country code
 * @param {string} countryName - Country name for alt text
 * @returns {string} HTML string with img element and fallback
 * 
 * @example
 * getFlagImageHTML('840', 'United States')
 * // Returns: '<img src="https://flagcdn.com/w320/us.png" alt="United States" ...>'
 */
export function getFlagImageHTML(countryId, countryName) {
  const iso2Code = ISO3_TO_ISO2[countryId] || 'XX';
  const flagUrl = `${API_ENDPOINTS.FLAG_PRIMARY}${iso2Code.toLowerCase()}.png`;
  
  return `
    <img 
      src="${flagUrl}" 
      alt="${countryName}" 
      onerror="this.onerror=null; this.src='${API_ENDPOINTS.FLAG_FALLBACK}'"
      style="width: 100%; height: 100%; object-fit: contain;"
    >`;
}

/**
 * Loads TopoJSON data with fallback to CDN
 * Tries local file first, then falls back to CDN if unavailable
 * 
 * @async
 * @returns {Promise<Object>} TopoJSON topology object
 * @throws {Error} If all data sources fail to load
 * 
 * @example
 * const topology = await loadTopoJSON();
 * const countries = topojson.feature(topology, topology.objects.countries);
 */
export async function loadTopoJSON() {
  const sources = [
    API_ENDPOINTS.TOPOJSON_LOCAL,
    API_ENDPOINTS.TOPOJSON_CDN
  ];
  
  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`TopoJSON load failed from ${url}:`, error.message);
    }
  }
  
  throw new Error('Could not load TopoJSON from any source');
}

/**
 * Clamps a value between minimum and maximum bounds
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 * 
 * @example
 * clamp(150, 0, 100) // Returns: 100
 * clamp(50, 0, 100)  // Returns: 50
 * clamp(-10, 0, 100) // Returns: 0
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalizes a country ID by removing leading zeros
 * 
 * @param {string|number} id - Country ID to normalize
 * @returns {string} Normalized country ID
 * 
 * @example
 * normalizeCountryId('004') // Returns: '4'
 * normalizeCountryId('840') // Returns: '840'
 */
export function normalizeCountryId(id) {
  return String(id).replace(/^0+/, '') || '0';
}

/**
 * Creates a delay promise for animation timing
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 * 
 * @example
 * await delay(100);
 * console.log('100ms have passed');
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely queries DOM element with error handling
 * 
 * @param {string} selector - CSS selector string
 * @returns {Element|null} DOM element or null if not found
 * 
 * @example
 * const globe = safeQuerySelector('#globe');
 * if (globe) {
 *   // Element exists, safe to use
 * }
 */
export function safeQuerySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Logs debug information in development mode
 * 
 * @param {string} message - Message to log
 * @param {...*} args - Additional arguments to log
 * 
 * @example
 * debugLog('Country clicked:', countryName, countryId);
 */
export function debugLog(message, ...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[VBGlobe] ${message}`, ...args);
  }
}
