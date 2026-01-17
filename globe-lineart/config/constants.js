/**
 * Globe Rendering Configuration
 * Contains all constants for D3 globe visualization
 */
const GLOBE_CONSTANTS = {
	width: 960,                      // SVG canvas width in pixels
	height: 640,                     // SVG canvas height in pixels
	scale: 280,                      // Initial projection scale
	clipAngle: 90,                   // Orthographic projection clip angle
	initialPhi: -10,                 // Initial latitude rotation
	rotationSpeed: 0.02,             // Auto-rotation speed (degrees per frame)
	dragSensitivity: 0.25            // Mouse drag sensitivity multiplier
};

/**
 * Volleyball Ball Pin Configuration
 * Defines visual properties for volleyball pins on globe
 */
const VOLLEYBALL_PIN = {
	stickLength: 35,                 // Pin stick length in pixels
	stickWidth: 3.5,                 // Pin stick width in pixels
	ballRadius: 12,                  // Ball radius in pixels
	ballStrokeWidth: 2.5,            // Ball outline stroke width
	lineStrokeWidth: 2,              // Volleyball seam line width
	color: '#ffd700',                // Pin color (gold)
	glowFilter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
};

/**
 * Theme Colors
 * Color scheme for different gender modes
 */
const THEME_COLORS = {
	men: '#2c3e7a',                  // Men's mode color (dark blue)
	women: '#7a3e3b',                // Women's mode color (dark burgundy)
	default: '#1a1f2e'               // Default background color
};

/**
 * Card Animation Delays
 * Staggered animation delays for card elements (milliseconds)
 */
const CARD_ANIMATION_DELAYS = [100, 200, 300, 400];
