/**
 * @fileoverview Main globe rendering and interaction logic
 * @author Volleyball Globe Team
 * @version 1.0.0
 */

import { GLOBE_CONFIG, PIN_CONFIG, ANIMATION_CONFIG, SELECTORS } from './config.js';
import { VOLLEYBALL_DATA } from './data.js';
import { 
  getCountryName, 
  getFlagImageHTML, 
  loadTopoJSON, 
  clamp, 
  delay,
  safeQuerySelector 
} from './utils.js';

/**
 * Globe application state
 * @private
 */
const state = {
  selectedCountry: null,
  selectedCentroid: null,
  autoRotate: true,
  rotation: { lambda: 0, phi: GLOBE_CONFIG.INITIAL_PHI },
  lastTime: Date.now()
};

/**
 * D3 elements and projections
 * @private
 */
let svg, projection, path, g, tooltip, pinGroup, lands, countries;

/**
 * Initializes the globe visualization
 * Sets up SVG, projection, and loads geographic data
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails
 */
export async function initGlobe() {
  try {
    createSVGCanvas();
    setupProjection();
    createTooltip();
    
    const topology = await loadTopoJSON();
    countries = topojson.feature(topology, topology.objects.countries).features;
    
    renderGlobe();
    setupInteractions();
    startAnimation();
    setupEventListeners();
    
    console.log('✓ Globe initialized successfully');
  } catch (error) {
    handleInitError(error);
  }
}

/**
 * Creates and configures the SVG canvas
 * @private
 */
function createSVGCanvas() {
  const container = safeQuerySelector(SELECTORS.GLOBE_CONTAINER);
  if (!container) {
    throw new Error('Globe container not found');
  }
  
  svg = d3.select(SELECTORS.GLOBE_CONTAINER)
    .append('svg')
    .attr('viewBox', `0 0 ${GLOBE_CONFIG.WIDTH} ${GLOBE_CONFIG.HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  
  g = svg.append('g');
}

/**
 * Sets up geographic projection and path generator
 * @private
 */
function setupProjection() {
  projection = d3.geoOrthographic()
    .scale(GLOBE_CONFIG.SCALE)
    .translate([GLOBE_CONFIG.WIDTH / 2, GLOBE_CONFIG.HEIGHT / 2])
    .clipAngle(GLOBE_CONFIG.CLIP_ANGLE)
    .rotate([state.rotation.lambda, state.rotation.phi]);
  
  path = d3.geoPath().projection(projection);
  
  // Add ocean background
  svg.append('circle')
    .attr('class', 'sea')
    .attr('cx', GLOBE_CONFIG.WIDTH / 2)
    .attr('cy', GLOBE_CONFIG.HEIGHT / 2)
    .attr('r', projection.scale());
}

/**
 * Creates hover tooltip element
 * @private
 */
function createTooltip() {
  tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'rgba(0, 0, 0, 0.8)')
    .style('color', 'white')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '14px')
    .style('font-family', 'Arial, sans-serif')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('display', 'none');
}

/**
 * Renders globe features (graticule, countries, pins)
 * @private
 */
function renderGlobe() {
  // Add graticule grid lines
  const graticule = d3.geoGraticule10();
  g.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', path);
  
  // Create pin marker group
  pinGroup = g.append('g').attr('class', 'pins');
  
  // Create invisible country areas for hover/click detection
  const countryAreas = g.selectAll('path.country-area')
    .data(countries)
    .enter()
    .append('path')
    .attr('class', 'country-area')
    .attr('d', path)
    .style('fill', 'transparent')
    .style('stroke', 'none')
    .style('cursor', 'pointer');
  
  // Create visible country outlines
  lands = g.selectAll('path.land')
    .data(countries)
    .enter()
    .append('path')
    .attr('class', 'land')
    .attr('d', path)
    .style('pointer-events', 'none');
  
  attachCountryInteractions(countryAreas);
}

/**
 * Attaches mouse and click interactions to country areas
 * @private
 * @param {d3.Selection} countryAreas - D3 selection of country path elements
 */
function attachCountryInteractions(countryAreas) {
  countryAreas
    .on('mouseover', handleCountryHover)
    .on('mousemove', handleTooltipMove)
    .on('mouseout', handleCountryLeave)
    .on('click', handleCountryClick);
}

/**
 * Handles country hover event
 * @private
 * @param {MouseEvent} event - DOM mouse event
 * @param {Object} feature - GeoJSON feature data
 */
function handleCountryHover(event, feature) {
  const index = countries.indexOf(feature);
  d3.select(lands.nodes()[index]).classed('hover', true);
  
  const countryName = getCountryName(feature);
  tooltip.style('display', 'block').text(countryName);
}

/**
 * Updates tooltip position to follow mouse
 * @private
 * @param {MouseEvent} event - DOM mouse event
 */
function handleTooltipMove(event) {
  tooltip
    .style('left', `${event.pageX + 12}px`)
    .style('top', `${event.pageY - 28}px`);
}

/**
 * Handles mouse leaving country area
 * @private
 * @param {MouseEvent} event - DOM mouse event
 * @param {Object} feature - GeoJSON feature data
 */
function handleCountryLeave(event, feature) {
  const index = countries.indexOf(feature);
  d3.select(lands.nodes()[index]).classed('hover', false);
  tooltip.style('display', 'none');
}

/**
 * Handles country click event
 * @private
 * @param {MouseEvent} event - DOM mouse event
 * @param {Object} feature - GeoJSON feature data
 */
function handleCountryClick(event, feature) {
  const countryName = getCountryName(feature);
  const centroid = d3.geoCentroid(feature);
  
  state.selectedCountry = feature.id;
  state.selectedCentroid = centroid;
  state.autoRotate = false;
  
  // Rotate globe to center the country
  state.rotation.lambda = -centroid[0];
  state.rotation.phi = -centroid[1];
  projection.rotate([state.rotation.lambda, state.rotation.phi]);
  
  updateRender();
  showCards(countryName, feature.id);
  createPin(centroid);
}

/**
 * Creates volleyball pin marker at specified coordinates
 * @private
 * @param {Array<number>} centroid - Geographic coordinates [longitude, latitude]
 */
function createPin(centroid) {
  pinGroup.selectAll('*').remove();
  
  const pinCoords = projection(centroid);
  if (!pinCoords) return;
  
  const pin = pinGroup.append('g')
    .attr('class', 'volleyball-pin')
    .attr('transform', `translate(${pinCoords[0]},${pinCoords[1]})`);
  
  // Pin stick
  pin.append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', -PIN_CONFIG.STICK_LENGTH)
    .attr('stroke', PIN_CONFIG.COLOR)
    .attr('stroke-width', PIN_CONFIG.STICK_WIDTH)
    .style('opacity', 1);
  
  // Volleyball circle
  pin.append('circle')
    .attr('cx', 0)
    .attr('cy', -PIN_CONFIG.STICK_LENGTH)
    .attr('r', PIN_CONFIG.BALL_RADIUS)
    .attr('fill', '#fff')
    .attr('stroke', PIN_CONFIG.COLOR)
    .attr('stroke-width', PIN_CONFIG.BALL_STROKE_WIDTH)
    .style('opacity', 1);
  
  // Volleyball lines pattern
  pin.append('path')
    .attr('d', `M-8,-${PIN_CONFIG.STICK_LENGTH} Q0,-${PIN_CONFIG.STICK_LENGTH - 7} 8,-${PIN_CONFIG.STICK_LENGTH} M-8,-${PIN_CONFIG.STICK_LENGTH} Q0,-${PIN_CONFIG.STICK_LENGTH + 7} 8,-${PIN_CONFIG.STICK_LENGTH}`)
    .attr('stroke', '#333')
    .attr('stroke-width', PIN_CONFIG.LINE_STROKE_WIDTH)
    .attr('fill', 'none')
    .style('opacity', 1);
}

/**
 * Displays information cards for selected country
 * @private
 * @param {string} countryName - Name of the country
 * @param {string} countryId - ISO3 country code
 */
async function showCards(countryName, countryId) {
  const stats = VOLLEYBALL_DATA[countryId] || VOLLEYBALL_DATA['default'];
  
  // Update flag and country name
  const countryNameEl = safeQuerySelector(SELECTORS.COUNTRY_NAME);
  const flagContainer = safeQuerySelector(SELECTORS.FLAG_CONTAINER);
  
  if (countryNameEl) countryNameEl.textContent = countryName;
  if (flagContainer) flagContainer.innerHTML = getFlagImageHTML(countryId, countryName);
  
  // Update statistics
  updateStatValue(SELECTORS.RANKING_VALUE, stats.ranking);
  updateStatValue(SELECTORS.PLAYERS_VALUE, stats.players);
  updateStatValue(SELECTORS.TOURNAMENTS_VALUE, stats.tournaments);
  
  // Show cards with staggered animation
  const cardIds = [
    SELECTORS.COUNTRY_CARD,
    SELECTORS.RANKING_CARD,
    SELECTORS.PLAYERS_CARD,
    SELECTORS.TOURNAMENTS_CARD
  ];
  
  for (let i = 0; i < cardIds.length; i++) {
    await delay(ANIMATION_CONFIG.CARD_DELAYS[i]);
    const card = safeQuerySelector(cardIds[i]);
    if (card) card.classList.add('show');
  }
}

/**
 * Updates statistic value in DOM
 * @private
 * @param {string} selector - CSS selector for element
 * @param {string|number} value - Value to display
 */
function updateStatValue(selector, value) {
  const element = safeQuerySelector(selector);
  if (element) element.textContent = value;
}

/**
 * Hides all information cards and resets state
 * @private
 */
function hideCards() {
  state.selectedCountry = null;
  state.selectedCentroid = null;
  state.autoRotate = true;
  
  document.querySelectorAll(SELECTORS.CARDS).forEach(card => {
    card.classList.remove('show');
  });
  
  pinGroup.selectAll('*').remove();
}

/**
 * Sets up drag and zoom interactions
 * @private
 */
function setupInteractions() {
  svg.call(d3.drag().on('drag', handleDrag));
  svg.call(d3.zoom()
    .scaleExtent(GLOBE_CONFIG.ZOOM_EXTENT)
    .on('zoom', handleZoom));
  
  // Pause rotation during interaction
  svg.on('mousedown touchstart', () => state.autoRotate = false);
  svg.on('mouseup touchend mouseleave', () => {
    if (!state.selectedCountry) state.autoRotate = true;
  });
}

/**
 * Handles drag gesture
 * @private
 * @param {DragEvent} event - D3 drag event
 */
function handleDrag(event) {
  const { dx, dy } = event;
  state.rotation.lambda += dx * GLOBE_CONFIG.DRAG_SENSITIVITY;
  state.rotation.phi += -dy * GLOBE_CONFIG.DRAG_SENSITIVITY;
  state.rotation.phi = clamp(
    state.rotation.phi,
    GLOBE_CONFIG.PHI_MIN,
    GLOBE_CONFIG.PHI_MAX
  );
  projection.rotate([state.rotation.lambda, state.rotation.phi]);
  updateRender();
}

/**
 * Handles zoom gesture
 * @private
 * @param {ZoomEvent} event - D3 zoom event
 */
function handleZoom(event) {
  const newScale = clamp(
    GLOBE_CONFIG.SCALE * event.transform.k,
    GLOBE_CONFIG.MIN_SCALE,
    GLOBE_CONFIG.MAX_SCALE
  );
  projection.scale(newScale);
  updateRender();
}

/**
 * Updates all rendered elements after transformation
 * @private
 */
function updateRender() {
  g.selectAll('path').attr('d', path);
  svg.select('circle.sea')
    .attr('r', projection.scale())
    .attr('cx', GLOBE_CONFIG.WIDTH / 2)
    .attr('cy', GLOBE_CONFIG.HEIGHT / 2);
  
  // Redraw pin if country is selected
  if (state.selectedCentroid) {
    createPin(state.selectedCentroid);
  }
}

/**
 * Starts animation loop for auto-rotation
 * @private
 */
function startAnimation() {
  function tick() {
    const now = Date.now();
    const dt = now - state.lastTime;
    state.lastTime = now;
    
    if (state.autoRotate && !state.selectedCountry) {
      state.rotation.lambda += GLOBE_CONFIG.ROTATION_SPEED * dt / 16;
      projection.rotate([state.rotation.lambda, state.rotation.phi]);
      updateRender();
    }
    
    requestAnimationFrame(tick);
  }
  
  tick();
}

/**
 * Sets up global event listeners
 * @private
 */
function setupEventListeners() {
  // Close button
  const closeBtn = safeQuerySelector(SELECTORS.CLOSE_BTN);
  if (closeBtn) {
    closeBtn.addEventListener('click', hideCards);
  }
  
  // Gender toggle
  const genderToggle = safeQuerySelector(SELECTORS.GENDER_TOGGLE);
  if (genderToggle) {
    genderToggle.addEventListener('click', handleGenderToggle);
  }
}

/**
 * Handles gender theme toggle
 * @private
 */
function handleGenderToggle() {
  const currentGender = this.getAttribute('data-gender');
  const newGender = currentGender === 'men' ? 'women' : 'men';
  
  this.setAttribute('data-gender', newGender);
  this.textContent = newGender === 'men' ? 'Men' : 'Women';
  document.body.className = newGender;
}

/**
 * Handles initialization errors
 * @private
 * @param {Error} error - Error object
 */
function handleInitError(error) {
  console.error('Globe initialization failed:', error);
  
  if (svg) {
    svg.append('text')
      .attr('x', 20)
      .attr('y', 40)
      .attr('fill', '#fff')
      .text(`Failed to load: ${error.message}`);
    
    const advice = svg.append('foreignObject')
      .attr('x', 20)
      .attr('y', 60)
      .attr('width', 520)
      .attr('height', 120)
      .append('xhtml:div')
      .style('color', '#fff')
      .style('font-size', '13px');
    
    advice.html(`
      <p>Troubleshooting tips:</p>
      <ul>
        <li>Ensure <code>world-110m.json</code> is in the correct location</li>
        <li>Check browser console for network errors</li>
        <li>Verify D3.js and TopoJSON libraries are loaded</li>
      </ul>
    `);
  }
}
