/**
 * Globe Renderer Module
 * Handles D3.js orthographic globe visualization with interactive features
 */
const GlobeRenderer = (function() {
	
	// ============================================================================
	// D3.js DOM Elements and Selections
	// ============================================================================
	let svg;                      // Main SVG canvas
	let projection;               // D3 geographic projection (orthographic)
	let path;                     // D3 geographic path generator
	let g;                        // Main group element for globe features
	let tooltip;                  // Tooltip element for country names
	let pinGroup;                 // Group for volleyball pins
	let flagGroup;                // Group for flag images
	let vnlBadgeGroup;
	let lands;                    // Selection of country path elements
	let countries;                // GeoJSON features data for all countries
	
	// ============================================================================
	// Globe State Management
	// ============================================================================
	let rotation = {
		lambda: 0,                // Longitude (horizontal rotation)
		phi: GLOBE_CONSTANTS.initialPhi  // Latitude (vertical rotation)
	};
	let autoRotate = true;        // Flag for auto-rotation animation
	let selectedCountry = null;   // Currently selected country ID
	let selectedCentroid = null;  // Geographic center point of selected country
	let lastTime = Date.now();    // Last animation frame timestamp
	let currentScale = GLOBE_CONSTANTS.scale;  // Current zoom scale level
	let isDraggingGlobe = false;
	let dragDistance = 0;
	let minScale = 200;           // Minimum zoom scale
	let maxScale = 500;           // Maximum zoom scale
	let zoomStep = 30;
	let hoveredVnlCentroid = null;
	let hoveredVnlFeature = null;
	let hoveredVnlInfo = null;

	function updateZoomBounds() {
		const isMobile = window.matchMedia('(max-width: 768px)').matches;
		minScale = isMobile ? 150 : 200;
		maxScale = isMobile ? 900 : 500;
		zoomStep = isMobile ? 55 : 30;
		currentScale = Math.max(minScale, Math.min(maxScale, currentScale));
		if (projection) {
			projection.scale(currentScale);
		}
	}
	
	/**
	 * Initialize the globe renderer
	 * @param {Array} countriesData - GeoJSON features array of countries
	 */
	function init(countriesData) {
		countries = countriesData;
		console.log('Initializing globe with', countries.length, 'countries');
		updateZoomBounds();
		
		createSvgCanvas();
		createOceanGradient();
		setupProjection();
		createTooltip();
		renderGlobe();
		setupInteractions();
		startAnimation();
		
		console.log('✓ Globe rendering complete');
	}
	
	/**
	 * Create SVG canvas for globe visualization
	 * Sets up responsive viewBox and container
	 */
	function createSvgCanvas() {
		svg = d3.select('#globe').append('svg')
			.attr('viewBox', `0 0 ${GLOBE_CONSTANTS.width} ${GLOBE_CONSTANTS.height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');
	}
	
	/**
	 * Setup geographic projection
	 * Uses orthographic projection for globe effect with clipping
	 */
	function setupProjection() {
		projection = d3.geoOrthographic()
			.scale(GLOBE_CONSTANTS.scale)
			.translate([GLOBE_CONSTANTS.width / 2, GLOBE_CONSTANTS.height / 2])
			.clipAngle(GLOBE_CONSTANTS.clipAngle)
			.rotate([rotation.lambda, rotation.phi]);
		
		path = d3.geoPath().projection(projection);
		
		// Ocean circle background (drawn first, behind all other elements)
		svg.append('circle')
			.attr('class', 'sea')
			.attr('cx', GLOBE_CONSTANTS.width / 2)
			.attr('cy', GLOBE_CONSTANTS.height / 2)
			.attr('r', projection.scale());
		
		// Create main group element for all globe features
		g = svg.append('g');
	}
	
	/**
	 * Create ocean element
	 * Note: Gradient is handled via CSS, this function is kept for organization
	 */
	function createOceanGradient() {
		// Ocean color defined in CSS (.sea class)
		// No JavaScript gradient needed for simplicity
	}
	
	/**
	 * Create tooltip element for country name display on hover
	 */
	function createTooltip() {
		tooltip = d3.select('body').append('div')
			.attr('class', 'tooltip')
			.style('position', 'fixed')
			.style('display', 'none');
	}
	
	/**
	 * Render all globe features (graticule, countries, interactions)
	 */
	function renderGlobe() {
		console.log('Rendering globe with', countries.length, 'countries');
		
		// Add graticule lines (latitude/longitude grid)
		const graticuleLines = d3.geoGraticule10();
		g.append('path')
			.datum(graticuleLines)
			.attr('class', 'graticule')
			.attr('d', path);
		
		// Create groups for pins and flags
		pinGroup = g.append('g').attr('class', 'pins');
		flagGroup = g.append('g').attr('class', 'flags');
		
		// Create land group
		const landGroup = g.append('g').attr('class', 'lands');
		
		// Visible country land areas
		lands = landGroup.selectAll('path.land')
			.data(countries)
			.enter()
			.append('path')
			.attr('class', 'land')
			.attr('d', path)
			.attr('fill', '#9ca3af')
			.attr('stroke', '#6b7280')
			.attr('stroke-width', '1px');
		
		// Create interaction group
		const interactionGroup = g.append('g').attr('class', 'interactions');
		
		// Invisible country areas for interaction (on top)
		const countryAreas = interactionGroup.selectAll('path.country-area')
			.data(countries)
			.enter()
			.append('path')
			.attr('class', 'country-area')
			.attr('d', path)
			.attr('fill', 'transparent')
			.attr('stroke', 'none')
			.style('cursor', 'pointer');
		
		console.log('✓ Rendered', lands.size(), 'land paths');
		console.log('✓ Rendered', countryAreas.size(), 'interaction paths');

		// Keep VNL hover markers on top of all map layers.
		vnlBadgeGroup = g.append('g').attr('class', 'vnl-badges');
		
		attachCountryInteractions(countryAreas);
	}
	
	/**
	 * Attach country interactions
	 */
	function attachCountryInteractions(countryAreas) {
		countryAreas
			.on('mouseover', (e, d) => {
				const index = countries.indexOf(d);
				d3.select(lands.nodes()[index]).classed('hover', true);
				const countryName = getCountryName(d);
				const vnlInfo = window.getVnlBadgeInfo ? window.getVnlBadgeInfo(countryName) : null;
				const isVnlMode = !!(window.isTournamentVnlModeEnabled && window.isTournamentVnlModeEnabled());
				hoveredVnlCentroid = vnlInfo ? d3.geoCentroid(d) : null;
				hoveredVnlFeature = vnlInfo ? d : null;
				hoveredVnlInfo = vnlInfo;
				renderVnlHoverMarker();

				if (isVnlMode && vnlInfo) {
					tooltip.style('display', 'none');
				} else {
					tooltip.style('display', 'block').text(countryName);
				}
			})
			.on('mousemove', (e) => {
				const isVnlMode = !!(window.isTournamentVnlModeEnabled && window.isTournamentVnlModeEnabled());
				if (isVnlMode && hoveredVnlInfo) return;
				tooltip
					.style('left', `${e.clientX + 12}px`)
					.style('top', `${e.clientY - 28}px`);
			})
			.on('mouseout', (e, d) => {
				const index = countries.indexOf(d);
				d3.select(lands.nodes()[index]).classed('hover', false);
				tooltip.style('display', 'none');
				hoveredVnlCentroid = null;
				hoveredVnlFeature = null;
				hoveredVnlInfo = null;
				renderVnlHoverMarker();
			})
			.on('click', (e, d) => {
				if (isDraggingGlobe) return;
				handleCountryClick(d);
			})
			.on('touchend', (e, d) => {
				if (isDraggingGlobe) return;
				if (e.cancelable) e.preventDefault();
				handleCountryClick(d);
			});
	}
	
	/**
	 * Handle country click
	 */
	function handleCountryClick(feature) {
		const countryName = getCountryName(feature);
		const centroid = d3.geoCentroid(feature);
		
		// Remove previous selection highlight
		lands.classed('selected', false);
		
		selectedCountry = feature.id;
		selectedCentroid = centroid;
		autoRotate = false;
		
		// Highlight selected country
		const index = countries.indexOf(feature);
		d3.select(lands.nodes()[index]).classed('selected', true);
		
		// Rotate to center country
		rotation.lambda = -centroid[0];
		rotation.phi = -centroid[1];
		projection.rotate([rotation.lambda, rotation.phi]);
		render();
		
		// Notify app to show card
		if (window.onCountrySelected) {
			window.onCountrySelected(feature.id, countryName);
		}
	}
	
	/**
	 * Add volleyball ball pin at location
	 */
	function addVolleyballPin(centroid) {
		pinGroup.selectAll('*').remove();
		
		const pinCoords = projection(centroid);
		if (!pinCoords) return;
		
		const pin = pinGroup.append('g')
			.attr('class', 'volleyball-pin')
			.attr('transform', `translate(${pinCoords[0]},${pinCoords[1]})`);
		
		// Pin stick
		pin.append('line')
			.attr('x1', 0).attr('y1', 0)
			.attr('x2', 0).attr('y2', -VOLLEYBALL_PIN.stickLength)
			.attr('stroke', VOLLEYBALL_PIN.color)
			.attr('stroke-width', VOLLEYBALL_PIN.stickWidth);
		
		// Volleyball ball
		const ball = pin.append('g')
			.attr('transform', `translate(0, -${VOLLEYBALL_PIN.stickLength})`);
		
		// Ball circle
		ball.append('circle')
			.attr('r', VOLLEYBALL_PIN.ballRadius)
			.attr('fill', '#fff')
			.attr('stroke', VOLLEYBALL_PIN.color)
			.attr('stroke-width', VOLLEYBALL_PIN.ballStrokeWidth);
		
		// Volleyball seam lines
		ball.append('path')
			.attr('d', `M-${VOLLEYBALL_PIN.ballRadius * 0.7},0 Q0,-${VOLLEYBALL_PIN.ballRadius * 0.6} ${VOLLEYBALL_PIN.ballRadius * 0.7},0`)
			.attr('stroke', '#333')
			.attr('stroke-width', VOLLEYBALL_PIN.lineStrokeWidth)
			.attr('fill', 'none');
		
		ball.append('path')
			.attr('d', `M-${VOLLEYBALL_PIN.ballRadius * 0.7},0 Q0,${VOLLEYBALL_PIN.ballRadius * 0.6} ${VOLLEYBALL_PIN.ballRadius * 0.7},0`)
			.attr('stroke', '#333')
			.attr('stroke-width', VOLLEYBALL_PIN.lineStrokeWidth)
			.attr('fill', 'none');
	}
	
	/**
	 * Add flag marker on globe
	 */
	function addFlagMarker(centroid, countryId) {
		flagGroup.selectAll('*').remove();
		
		const flagCoords = projection(centroid);
		if (!flagCoords) return;
		
		const iso2Code = DataLoader.getIso2Code(countryId);
		const flagUrl = `${API_CONFIG.flags.primary}${iso2Code.toLowerCase()}.png`;
		
		const flagMarker = flagGroup.append('foreignObject')
			.attr('class', 'flag-marker')
			.attr('x', flagCoords[0] - 20)
			.attr('y', flagCoords[1] - VOLLEYBALL_PIN.stickLength - VOLLEYBALL_PIN.ballRadius - 40)
			.attr('width', 40)
			.attr('height', 30);
		
		flagMarker.append('xhtml:img')
			.attr('src', flagUrl)
			.style('width', '100%')
			.style('height', '100%')
			.style('object-fit', 'cover')
			.style('border-radius', '4px')
			.style('border', '2px solid #fff')
			.style('box-shadow', '0 2px 8px rgba(0,0,0,0.3)');
	}

	function renderVnlHoverMarker() {
		if (!vnlBadgeGroup) return;
		vnlBadgeGroup.selectAll('*').remove();

		if (!hoveredVnlCentroid || !hoveredVnlInfo || !hoveredVnlFeature) return;
		const anchor = getMainlandAnchor(hoveredVnlFeature);
		if (!anchor) return;
		const x = anchor[0];
		const y = Math.max(26, anchor[1] - 44);
		if (!Number.isFinite(x) || !Number.isFinite(y)) return;

		const badge = vnlBadgeGroup.append('g')
			.attr('transform', `translate(${x}, ${y})`)
			.attr('pointer-events', 'none');

		badge.append('rect')
			.attr('x', -34)
			.attr('y', -22)
			.attr('width', 68)
			.attr('height', 38)
			.attr('rx', 12)
			.attr('fill', '#1f4aa8')
			.attr('stroke', '#0f2a52')
			.attr('stroke-width', 2.2);

		badge.append('text')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'central')
			.attr('dy', '0.1em')
			.attr('font-size', 22)
			.attr('font-weight', 400)
			.attr('font-family', '"VNL", "Barlow Condensed", sans-serif')
			.attr('letter-spacing', '0.55px')
			.attr('fill', '#facc15')
			.text('VNL');

		badge.append('path')
			.attr('d', 'M0,16 L-7,30 L7,30 Z')
			.attr('fill', '#1f4aa8')
			.attr('stroke', '#0f2a52')
			.attr('stroke-width', 2);

		vnlBadgeGroup.raise();
	}

	function getMainlandAnchor(feature) {
		if (!feature?.geometry) return null;

		if (feature.geometry.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates)) {
			let bestPolygon = null;
			let bestArea = -1;

			feature.geometry.coordinates.forEach(coords => {
				const polygonGeom = { type: 'Polygon', coordinates: coords };
				const area = d3.geoArea(polygonGeom);
				if (area > bestArea) {
					bestArea = area;
					bestPolygon = polygonGeom;
				}
			});

			if (bestPolygon) {
				const projected = path.centroid(bestPolygon);
				if (Array.isArray(projected) && Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
					return projected;
				}
			}
		}

		const projected = path.centroid(feature);
		if (Array.isArray(projected) && Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
			return projected;
		}

		const projectedGeo = projection(d3.geoCentroid(feature));
		if (Array.isArray(projectedGeo) && Number.isFinite(projectedGeo[0]) && Number.isFinite(projectedGeo[1])) {
			return projectedGeo;
		}

		return null;
	}
	
	/**
	 * Get country name from feature
	 */
	function getCountryName(feature) {
		// Try to find country name from rankings
		return feature.properties?.name || `Country ${feature.id}`;
	}

	function normalizeCountryLookupName(name) {
		if (!name) return '';
		return String(name)
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[.,'()]/g, ' ')
			.replace(/&/g, ' and ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	const COUNTRY_NAME_ALIASES = {
		bih: 'bosnia and herzegovina',
		'bosnia and herz': 'bosnia and herzegovina',
		'bosnia and herzeg': 'bosnia and herzegovina',
		'bosnia and herzegovina': 'bosnia and herzegovina',
		'czech republic': 'czechia',
		turkiye: 'turkey',
		usa: 'united states',
		'us': 'united states',
		'uk': 'united kingdom',
		'korea republic of': 'south korea',
		'republic of korea': 'south korea'
	};

	function canonicalCountryName(name) {
		const normalized = normalizeCountryLookupName(name);
		return COUNTRY_NAME_ALIASES[normalized] || normalized;
	}
	
	/**
	 * Clear selection
	 */
	function clearSelection() {
		selectedCountry = null;
		selectedCentroid = null;
		autoRotate = true;
		lands.classed('selected', false);
		pinGroup.selectAll('*').remove();
		flagGroup.selectAll('*').remove();
		hoveredVnlCentroid = null;
		hoveredVnlFeature = null;
		hoveredVnlInfo = null;
		renderVnlHoverMarker();
	}
	
	/**
	 * Select country by name (for leaderboard integration)
	 */
	function selectCountryByName(countryName) {
		const normalizedName = canonicalCountryName(countryName);
		const requestedTokens = new Set(normalizedName.split(' ').filter(Boolean));
		
		// Find the country feature by name
		const feature = countries.find(c => {
			const name = canonicalCountryName(c.properties?.name || '');
			if (!name) return false;

			if (name === normalizedName || name.includes(normalizedName) || normalizedName.includes(name)) {
				return true;
			}

			if (!requestedTokens.size) return false;
			const tokens = name.split(' ').filter(Boolean);
			const overlap = tokens.filter(token => requestedTokens.has(token)).length;
			const threshold = requestedTokens.size > 2 ? 2 : requestedTokens.size;
			return overlap >= threshold;
		});
		
		if (feature) {
			handleCountryClick(feature);
		} else {
			console.warn('Country not found on globe:', countryName);
		}
	}
	
	/**
	 * Render/update globe
	 */
	function render() {
		g.selectAll('path.graticule, path.land, path.country-area').attr('d', path);
		svg.select('circle.sea')
			.attr('r', projection.scale())
			.attr('cx', GLOBE_CONSTANTS.width / 2)
			.attr('cy', GLOBE_CONSTANTS.height / 2);
		
		// Update pin and flag positions
		if (selectedCentroid) {
			addVolleyballPin(selectedCentroid);
			addFlagMarker(selectedCentroid, selectedCountry);
		}
		renderVnlHoverMarker();
	}
	
	/**
	 * Setup drag and zoom
	 */
	function setupInteractions() {
		svg.style('touch-action', 'none');

		svg.call(
			d3.drag()
				.on('start', (event) => {
					isDraggingGlobe = false;
					dragDistance = 0;
					autoRotate = false;
				})
				.on('drag', (event) => {
					const deltaX = event.dx;
					const deltaY = event.dy;
					dragDistance += Math.hypot(deltaX, deltaY);
					isDraggingGlobe = dragDistance > 4;
					rotation.lambda += deltaX * GLOBE_CONSTANTS.dragSensitivity;
					rotation.phi += -deltaY * GLOBE_CONSTANTS.dragSensitivity;
					rotation.phi = Math.max(-90, Math.min(90, rotation.phi));
					projection.rotate([rotation.lambda, rotation.phi]);
					render();
				})
				.on('end', () => {
					// Reset in next tick so click/touchend handlers can read drag state.
					setTimeout(() => {
						isDraggingGlobe = false;
						dragDistance = 0;
					}, 0);
				})
		);

		svg.on('mousedown touchstart', () => autoRotate = false);
		svg.on('mouseup touchend mouseleave', () => {
			if (!selectedCountry) autoRotate = true;
		});

		window.addEventListener('resize', () => {
			updateZoomBounds();
			render();
		});
	}
	
	/**
	 * Zoom in
	 */
	function zoomIn() {
		currentScale = Math.min(maxScale, currentScale + zoomStep);
		projection.scale(currentScale);
		render();
	}
	
	/**
	 * Zoom out
	 */
	function zoomOut() {
		currentScale = Math.max(minScale, currentScale - zoomStep);
		projection.scale(currentScale);
		render();
	}
	
	/**
	 * Animation loop
	 */
	function startAnimation() {
		function tick() {
			const now = Date.now();
			const deltaTime = now - lastTime;
			lastTime = now;
			
			if (autoRotate && !selectedCountry) {
				rotation.lambda += GLOBE_CONSTANTS.rotationSpeed * deltaTime / 16;
				projection.rotate([rotation.lambda, rotation.phi]);
				render();
			}
			
			requestAnimationFrame(tick);
		}
		tick();
	}
	
	return {
		init,
		clearSelection,
		selectCountryByName,
		refreshTournamentMarkers: render,
		zoomIn,
		zoomOut
	};
})();
