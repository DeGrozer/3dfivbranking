/**
 * Data Loader Module
 * Handles fetching FIVB rankings, world map data, and country mappings
 */
const DataLoader = (function() {
	
	/**
	 * ISO 3166-1 numeric to ISO 3166-1 alpha-2 country code mapping
	 * Used to fetch flag images from CDN
	 */
	const iso3ToIso2 = {
		'004': 'AF', '008': 'AL', '012': 'DZ', '016': 'AS', '020': 'AD', '024': 'AO',
		'028': 'AG', '031': 'AZ', '032': 'AR', '036': 'AU', '040': 'AT', '044': 'BS',
		'048': 'BH', '050': 'BD', '051': 'AM', '052': 'BB', '056': 'BE', '060': 'BM',
		'064': 'BT', '068': 'BO', '070': 'BA', '072': 'BW', '076': 'BR', '084': 'BZ',
		'090': 'SB', '096': 'BN', '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY',
		'116': 'KH', '120': 'CM', '124': 'CA', '132': 'CV', '140': 'CF', '144': 'LK',
		'148': 'TD', '152': 'CL', '156': 'CN', '170': 'CO', '174': 'KM', '178': 'CG',
		'180': 'CD', '188': 'CR', '191': 'HR', '192': 'CU', '196': 'CY', '203': 'CZ',
		'204': 'BJ', '208': 'DK', '212': 'DM', '214': 'DO', '218': 'EC', '222': 'SV',
		'226': 'GQ', '231': 'ET', '232': 'ER', '233': 'EE', '242': 'FJ', '246': 'FI',
		'250': 'FR', '254': 'GF', '258': 'PF', '266': 'GA', '268': 'GE', '270': 'GM',
		'276': 'DE', '288': 'GH', '300': 'GR', '304': 'GL', '308': 'GD', '320': 'GT',
		'324': 'GN', '328': 'GY', '332': 'HT', '340': 'HN', '344': 'HK', '348': 'HU',
		'352': 'IS', '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE',
		'376': 'IL', '380': 'IT', '384': 'CI', '388': 'JM', '392': 'JP', '398': 'KZ',
		'400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR', '414': 'KW', '417': 'KG',
		'418': 'LA', '422': 'LB', '426': 'LS', '428': 'LV', '430': 'LR', '434': 'LY',
		'440': 'LT', '442': 'LU', '446': 'MO', '450': 'MG', '454': 'MW', '458': 'MY',
		'462': 'MV', '466': 'ML', '470': 'MT', '478': 'MR', '480': 'MU', '484': 'MX',
		'496': 'MN', '498': 'MD', '499': 'ME', '504': 'MA', '508': 'MZ', '512': 'OM',
		'516': 'NA', '524': 'NP', '528': 'NL', '554': 'NZ', '558': 'NI', '562': 'NE',
		'566': 'NG', '578': 'NO', '586': 'PK', '591': 'PA', '598': 'PG', '600': 'PY',
		'604': 'PE', '608': 'PH', '616': 'PL', '620': 'PT', '624': 'GW', '626': 'TL',
		'630': 'PR', '634': 'QA', '642': 'RO', '643': 'RU', '646': 'RW', '682': 'SA',
		'686': 'SN', '688': 'RS', '690': 'SC', '694': 'SL', '702': 'SG', '703': 'SK',
		'704': 'VN', '705': 'SI', '706': 'SO', '710': 'ZA', '716': 'ZW', '724': 'ES',
		'728': 'SS', '729': 'SD', '732': 'EH', '736': 'SD', '740': 'SR', '748': 'SZ',
		'752': 'SE', '756': 'CH', '760': 'SY', '762': 'TJ', '764': 'TH', '768': 'TG',
		'776': 'TO', '780': 'TT', '784': 'AE', '788': 'TN', '792': 'TR', '795': 'TM',
		'800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB', '834': 'TZ',
		'840': 'US', '854': 'BF', '858': 'UY', '860': 'UZ', '862': 'VE', '882': 'WS',
		'887': 'YE', '894': 'ZM'
	};
	
	/**
	 * Country name to ISO 3166-1 numeric code mapping
	 * Used to match FIVB federation names with country ISO codes
	 */
	const countryNameToIso3 = {
		'United States': '840', 'Brazil': '076', 'Poland': '616', 'Italy': '380',
		'Japan': '392', 'China': '156', 'France': '250', 'Germany': '276',
		'Russia': '643', 'Serbia': '688', 'Argentina': '032', 'Canada': '124',
		'Netherlands': '528', 'Turkey': '792', 'Iran': '364', 'Egypt': '818',
		'Tunisia': '788', 'Cuba': '192', 'Slovenia': '705', 'Bulgaria': '100',
		'Australia': '036', 'Mexico': '484', 'South Korea': '410', 'Belgium': '056',
		'Czech Republic': '203', 'Ukraine': '804', 'Finland': '246', 'Portugal': '620',
		'Dominican Republic': '214', 'Kenya': '404', 'Cameroon': '120', 'Thailand': '764'
	};
	
	/**
	 * Cache for rankings data to avoid duplicate API calls
	 * @type {Object} - Contains cached rankings for men and women
	 */
	let rankingsCache = {
		men: null,
		women: null
	};
	
	/**
	 * Fetch FIVB rankings from official API
	 * @async
	 * @param {string} gender - Gender type ('men' or 'women')
	 * @returns {Promise<Object>} Rankings data keyed by ISO3 country code
	 */
	async function fetchRankings(gender) {
		if (rankingsCache[gender]) {
			return rankingsCache[gender];
		}
		
		try {
			const response = await fetch(API_CONFIG.rankings[gender]);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			
			const responseData = await response.json();
			const rankings = {};
			
			// Process FIVB API teams array
			if (responseData.teams && Array.isArray(responseData.teams)) {
				responseData.teams.forEach((team, index) => {
					const federationName = team.federationName;
					const decimalPoints = parseFloat(team.decimalPoints) || 0;
					const iso3Code = countryNameToIso3[federationName];
					
					if (iso3Code) {
						rankings[iso3Code] = {
							rank: index + 1,
							points: decimalPoints.toFixed(2),
							name: federationName
						};
					}
				});
			}
			
			rankingsCache[gender] = rankings;
			console.log(`✓ Loaded ${gender} rankings:`, Object.keys(rankings).length, 'countries');
			return rankings;
			
		} catch (error) {
			console.warn(`Failed to load ${gender} rankings:`, error.message);
			return getFallbackRankings(gender);
		}
	}
	
	/**
	 * Get fallback rankings if API is unavailable
	 * @param {string} gender - Gender type ('men' or 'women')
	 * @returns {Object} Fallback ranking data
	 */
	function getFallbackRankings(gender) {
		const fallbackData = {
			men: {
				'616': { rank: 1, points: '391.56', name: 'Poland' },
				'380': { rank: 2, points: '370.14', name: 'Italy' },
				'840': { rank: 3, points: '365.95', name: 'United States' },
				'076': { rank: 4, points: '352.69', name: 'Brazil' },
				'392': { rank: 5, points: '347.52', name: 'Japan' }
			},
			women: {
				'840': { rank: 1, points: '389.45', name: 'United States' },
				'076': { rank: 2, points: '373.88', name: 'Brazil' },
				'380': { rank: 3, points: '358.19', name: 'Italy' },
				'156': { rank: 4, points: '351.77', name: 'China' },
				'792': { rank: 5, points: '345.23', name: 'Turkey' }
			}
		};
		return fallbackData[gender] || {};
	}
	
	/**
	 * Convert ISO3 country code to ISO2 code for flag images
	 * @param {string} iso3Code - ISO 3166-1 numeric code
	 * @returns {string} ISO 3166-1 alpha-2 code
	 */
	function getIso2Code(iso3Code) {
		return iso3ToIso2[iso3Code] || 'XX';
	}
	
	/**
	 * Load world map geographic data from TopoJSON
	 * @async
	 * @returns {Promise<Object>} TopoJSON world map data
	 * @throws {Error} If world map cannot be loaded from any source
	 */
	async function loadWorldMap() {
		const mapSources = [API_CONFIG.map.cdn, API_CONFIG.map.local];
		
		for (const mapUrl of mapSources) {
			try {
				const response = await fetch(mapUrl);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const mapData = await response.json();
				console.log('✓ World map loaded from:', mapUrl);
				return mapData;
			} catch (error) {
				console.warn(`Failed to load map from ${url}:`, error.message);
			}
		}
		
		throw new Error('Could not load world map from any source');
	}
	
	return {
		fetchRankings,
		loadWorldMap,
		getIso2Code
	};
})();
