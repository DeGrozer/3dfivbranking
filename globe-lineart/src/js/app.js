/**
 * @fileoverview Application entry point
 * @author Volleyball Globe Team
 * @version 1.0.0
 */

import { initGlobe } from './globe.js';

/**
 * Initializes the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏐 Volleyball Globe - Starting initialization...');
  
  try {
    await initGlobe();
    console.log('✨ Application ready!');
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    showErrorMessage(error);
  }
});

/**
 * Displays user-friendly error message
 * @param {Error} error - Error object
 */
function showErrorMessage(error) {
  const globeContainer = document.getElementById('globe');
  if (globeContainer) {
    globeContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #fff;">
        <h2 style="color: #ff6b6b; margin-bottom: 20px;">⚠️ Initialization Error</h2>
        <p style="margin-bottom: 10px;">${error.message}</p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.7);">
          Please check the browser console for more details.
        </p>
        <button 
          onclick="location.reload()" 
          style="
            margin-top: 20px;
            padding: 12px 24px;
            background: #4a7ba7;
            border: none;
            border-radius: 8px;
            color: #fff;
            cursor: pointer;
            font-size: 16px;
          "
        >
          Reload Page
        </button>
      </div>
    `;
  }
}

/**
 * Handles global errors
 */
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

/**
 * Handles unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
