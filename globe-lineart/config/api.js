/**
 * API Configuration
 * Contains all external API endpoints and data sources for the application
 */
const API_CONFIG = {
	/**
	 * FIVB Official World Ranking API
	 * Provides current volleyball rankings for men and women
	 * Parameters: gender (0=women, 1=men), start rank, count
	 */
	rankings: {
		women: 'https://en.volleyballworld.com/api/v1/worldranking/volleyball/0/0/200',
		men: 'https://en.volleyballworld.com/api/v1/worldranking/volleyball/1/0/200'
	},
	
	/**
	 * Flag Images API
	 * Flagcdn.com provides country flag images
	 */
	flags: {
		primary: 'https://flagcdn.com/w320/',
		fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Flag_of_None.svg/320px-Flag_of_None.svg.png'
	},
	
	/**
	 * TopoJSON World Map Data
	 * Contains geographic data for all countries
	 * Primary: CDN for web-based access (no server needed)
	 * Fallback: Local file if CDN unavailable
	 */
	map: {
		cdn: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
		local: 'assets/data/world-110m.json'
	}
};
