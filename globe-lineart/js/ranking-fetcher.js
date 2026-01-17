/**
 * Ranking Fetcher Module
 * Fetches real-time FIVB World Ranking data directly from official API
 * No localhost or backend required - purely client-side
 */
const RankingFetcher = (function() {
	
	/**
	 * FIVB Official API Endpoints
	 * Women: 0, Men: 1
	 * Format: /worldranking/volleyball/{gender}/{page}/{count}
	 * Page: 0, 1, 2... (pagination)
	 * Count: items per page (50 recommended)
	 */
	const FIVB_API_BASE = 'https://en.volleyballworld.com/api/v1/worldranking/volleyball';
	
	// Cache for rankings data
	let rankingsCache = {
		men: null,
		women: null,
		lastFetch: {
			men: null,
			women: null
		}
	};
	
	// Federation name to country ISO3 mapping (for flag lookup)
	const federationToIso3 = {
		'United States': '840',
		'Brazil': '076',
		'Poland': '616',
		'Italy': '380',
		'Japan': '392',
		'China': '156',
		'France': '250',
		'Germany': '276',
		'Russia': '643',
		'Serbia': '688',
		'Argentina': '032',
		'Canada': '124',
		'Netherlands': '528',
		'Turkey': '792',
		'Iran': '364',
		'Egypt': '818',
		'Tunisia': '788',
		'Cuba': '192',
		'Slovenia': '705',
		'Bulgaria': '100',
		'Australia': '036',
		'Mexico': '484',
		'South Korea': '410',
		'Belgium': '056',
		'Czech Republic': '203',
		'Ukraine': '804',
		'Finland': '246',
		'Portugal': '620',
		'Dominican Republic': '214',
		'Kenya': '404',
		'Cameroon': '120',
		'Thailand': '764',
		'Mongolia': '496',
		'Peru': '604',
		'Greece': '300',
		'Spain': '724',
		'Puerto Rico': '630',
		'Virgin Islands': '850'
	};
	
	/**
	 * Fetch current rankings from FIVB official API
	 * @async
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Array>} Array of ranking objects
	 */
	async function fetchCurrentRankings(gender) {
		// Use cache if fresh (within 1 hour)
		const cacheTime = rankingsCache.lastFetch[gender];
		const now = Date.now();
		if (rankingsCache[gender] && cacheTime && (now - cacheTime) < 3600000) {
			console.log(`✓ Using cached ${gender} rankings`);
			return rankingsCache[gender];
		}
		
		try {
			const genderCode = gender === 'women' ? 0 : 1;
			
			console.log(`Fetching ${gender} rankings from FIVB API...`);
			
			// Fetch from pages 0 and 1 (50 teams each = 100 total)
			const allTeams = [];
			const pages = [0, 1];
			
			for (const page of pages) {
				const apiUrl = `${FIVB_API_BASE}/${genderCode}/${page}/50`;
				
				console.log(`  Fetching page ${page}: ${apiUrl}`);
				
				const response = await fetch(apiUrl);
				
				if (!response.ok) {
					throw new Error(`HTTP ${response.status} on page ${page}`);
				}
				
				const data = await response.json();
				
				// API returns array directly, or might have teams property
				const teams = Array.isArray(data) ? data : (data.teams || data);
				if (teams && teams.length > 0) {
					allTeams.push(...teams);
				}
			}
			
			// Transform FIVB API data to our format
			const rankings = allTeams
				.filter(team => team.decimalPoints && team.decimalPoints !== '')
				.map((team, index) => {
					// Extract points progression from teamMatches
					const pointsProgression = extractPointsProgression(team);
					
					return {
						rank: index + 1,
						federationName: team.federationName,
						federationCode: team.federationCode || '',
						countryName: team.federationName,
						points: parseFloat(team.decimalPoints),
						iso3: federationToIso3[team.federationName] || null,
						participationPoints: team.participationPoints || 0,
						gamesPlayed: team.gamesPlayed || 0,
						updatedDate: new Date().toISOString(),
						// New: Points progression for sparkline
						pointsProgression: pointsProgression,
						confederationName: team.confederationName || '',
						confederationCode: team.confederationCode || '',
						trend: team.trend || 0,
						flagUrl: team.flagUrl || ''
					};
				});
			
			// Cache the results
			rankingsCache[gender] = rankings;
			rankingsCache.lastFetch[gender] = now;
			
			console.log(`✓ Fetched ${rankings.length} ${gender} rankings`);
			return rankings;
			
		} catch (error) {
			console.error(`Error fetching ${gender} rankings:`, error);
			throw error;
		}
	}
	
	/**
	 * Get ranking for a specific country
	 * @async
	 * @param {string} countryName - Country/Federation name
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Object>} Ranking data or null
	 */
	async function getCountryRanking(countryName, gender) {
		const rankings = await fetchCurrentRankings(gender);
		
		// Normalize country name for matching
		const normalizedInput = normalizeCountryName(countryName);
		
		// First try exact match
		let ranking = rankings.find(r => {
			const normalizedFed = normalizeCountryName(r.federationName);
			return normalizedFed === normalizedInput;
		});
		
		// If no exact match, try matching first significant word (but be strict)
		if (!ranking) {
			ranking = rankings.find(r => {
				const normalizedFed = normalizeCountryName(r.federationName);
				// Exact word match only - input must equal federation name or be a full word within it
				// Avoid partial matches like "oman" in "romania"
				if (normalizedFed === normalizedInput) return true;
				// Check if it's a whole word match at start
				if (normalizedFed.startsWith(normalizedInput + ' ') || normalizedFed.endsWith(' ' + normalizedInput)) {
					return true;
				}
				return false;
			});
		}
		
		return ranking || null;
	}
	
	/**
	 * Normalize country name for matching between globe and FIVB API
	 * Globe uses full names, FIVB uses short names
	 */
	function normalizeCountryName(name) {
		const lowerName = name.toLowerCase().trim();
		
		// Map common variations
		const nameMap = {
			'united states of america': 'united states',
			'usa': 'united states',
			'u.s.a.': 'united states',
			'russian federation': 'russia',
			// South Korea - FIVB uses "Korea"
			'republic of korea': 'korea',
			'south korea': 'korea',
			'korea, republic of': 'korea',
			's. korea': 'korea',
			// North Korea - FIVB uses "DPR Korea"  
			'north korea': 'dpr korea',
			"korea, democratic people's republic of": 'dpr korea',
			'democratic peoples republic of korea': 'dpr korea',
			"dem. people's republic of korea": 'dpr korea',
			'n. korea': 'dpr korea',
			// Others
			'democratic republic of the congo': 'democratic republic of congo',
			'republic of the congo': 'congo',
			'united kingdom': 'great britain',
			'england': 'great britain',
			'czech republic': 'czechia',
			'ivory coast': "côte d'ivoire",
			'vietnam': 'viet nam',
			'taiwan': 'chinese taipei',
			'holland': 'netherlands',
			'uae': 'united arab emirates',
			'bosnia and herzegovina': 'bosnia and herzegovina',
			'türkiye': 'turkey',
			'turkiye': 'turkey',
			// Prevent false matches
			'oman': 'oman',
			'romania': 'romania'
		};
		
		return nameMap[lowerName] || lowerName;
	}
	
	/**
	 * Extract points progression from team matches for sparkline
	 * @param {Object} team - Team data from API
	 * @returns {Array} Array of {date, points, increment} objects (most recent 10 matches)
	 */
	function extractPointsProgression(team) {
		if (!team.teamMatches || team.teamMatches.length === 0) {
			return [];
		}
		
		// Sort matches by date (oldest first for progression)
		const sortedMatches = [...team.teamMatches]
			.filter(match => {
				// Only include matches where this team was active
				return match.isHomeTeamActive || match.isAwayTeamActive;
			})
			.sort((a, b) => new Date(a.localDate) - new Date(b.localDate))
			.slice(-12); // Take last 12 matches for a good sparkline
		
		// Build points progression
		const progression = sortedMatches.map(match => {
			// Determine which WRS (World Ranking Score) applies to this team
			const isHome = match.isHomeTeamActive;
			const wrs = isHome ? match.homeWRS : match.awayWRS;
			const increment = match.increment || 0;
			const opponent = isHome ? match.awayTeam : match.homeTeam;
			
			// Parse result (format: "3 - 0", "2 - 3", etc.)
			let result = '-';
			let score = '';
			if (match.result) {
				const scores = match.result.split('-').map(s => parseInt(s.trim()));
				if (scores.length === 2) {
					const homeScore = scores[0];
					const awayScore = scores[1];
					if (isHome) {
						result = homeScore > awayScore ? 'W' : 'L';
						score = `${homeScore}-${awayScore}`;
					} else {
						result = awayScore > homeScore ? 'W' : 'L';
						score = `${awayScore}-${homeScore}`; // Show team's score first
					}
				}
			}
			
			return {
				date: match.localDate,
				points: wrs,
				increment: isHome ? increment : (increment * -1), // Flip sign for away team
				event: match.eventName || '',
				opponent: opponent,
				result: result,
				score: score
			};
		});
		
		return progression;
	}
	
	/**
	 * Get all rankings for leaderboard display
	 * @async
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Array>} All rankings with basic info
	 */
	async function getAllRankings(gender) {
		const rankings = await fetchCurrentRankings(gender);
		return rankings.map(r => ({
			rank: r.rank,
			teamName: r.federationName,
			teamCode: iocToIso2(r.federationCode) || getCountryCode(r.federationName),
			wrs: r.points
		}));
	}
	
	/**
	 * Convert IOC 3-letter code to ISO 2-letter code (for flags)
	 */
	function iocToIso2(ioc) {
		if (!ioc) return '';
		const map = {
			// Americas
			'USA': 'us', 'BRA': 'br', 'ARG': 'ar', 'CAN': 'ca', 'MEX': 'mx',
			'COL': 'co', 'CHI': 'cl', 'VEN': 've', 'ECU': 'ec', 'URU': 'uy',
			'PAR': 'py', 'BOL': 'bo', 'PER': 'pe', 'CUB': 'cu', 'PUR': 'pr',
			'DOM': 'do', 'TTO': 'tt', 'JAM': 'jm', 'BAR': 'bb', 'BER': 'bm',
			'LCA': 'lc', 'ANT': 'ag', 'NCA': 'ni', 'CRC': 'cr', 'PAN': 'pa',
			'GUA': 'gt', 'HON': 'hn', 'ESA': 'sv', 'HAI': 'ht', 'GRN': 'gd',
			'SKN': 'kn', 'VIN': 'vc', 'DMA': 'dm', 'BIZ': 'bz', 'GUY': 'gy',
			'SUR': 'sr', 'ARU': 'aw', 'CAY': 'ky', 'IVB': 'vg', 'ISV': 'vi',
			'AHO': 'cw', 'SMR': 'sm', 'BAH': 'bs',
			// Europe
			'POL': 'pl', 'ITA': 'it', 'FRA': 'fr', 'GER': 'de', 'TUR': 'tr',
			'SRB': 'rs', 'NED': 'nl', 'BEL': 'be', 'BUL': 'bg', 'CZE': 'cz',
			'SLO': 'si', 'UKR': 'ua', 'FIN': 'fi', 'GRE': 'gr', 'ESP': 'es',
			'POR': 'pt', 'CRO': 'hr', 'SWE': 'se', 'NOR': 'no', 'ROU': 'ro',
			'RUS': 'ru', 'AUT': 'at', 'SUI': 'ch', 'HUN': 'hu', 'SVK': 'sk',
			'DEN': 'dk', 'IRL': 'ie', 'GBR': 'gb', 'SCO': 'gb-sct', 'WAL': 'gb-wls',
			'ENG': 'gb-eng', 'NIR': 'gb-nir', 'AZE': 'az', 'GEO': 'ge', 'ARM': 'am',
			'BLR': 'by', 'MDA': 'md', 'LAT': 'lv', 'LTU': 'lt', 'EST': 'ee',
			'ISL': 'is', 'LUX': 'lu', 'MLT': 'mt', 'CYP': 'cy', 'MNE': 'me',
			'BIH': 'ba', 'MKD': 'mk', 'ALB': 'al', 'KOS': 'xk', 'AND': 'ad',
			'LIE': 'li', 'MON': 'mc', 'FAR': 'fo',
			// Asia
			'JPN': 'jp', 'CHN': 'cn', 'THA': 'th', 'KOR': 'kr', 'IND': 'in',
			'PAK': 'pk', 'VIE': 'vn', 'INA': 'id', 'MAS': 'my', 'PHI': 'ph',
			'SIN': 'sg', 'TPE': 'tw', 'HKG': 'hk', 'KAZ': 'kz', 'UZB': 'uz',
			'QAT': 'qa', 'KUW': 'kw', 'UAE': 'ae', 'KSA': 'sa', 'BRN': 'bh',
			'OMA': 'om', 'IRQ': 'iq', 'SYR': 'sy', 'JOR': 'jo', 'LBN': 'lb',
			'IRI': 'ir', 'PRK': 'kp', 'MGL': 'mn', 'BAN': 'bd', 'SRI': 'lk',
			'NEP': 'np', 'MYA': 'mm', 'LAO': 'la', 'CAM': 'kh', 'TLS': 'tl',
			'MAC': 'mo', 'MDV': 'mv', 'BRU': 'bn', 'AFG': 'af', 'TJK': 'tj',
			'TKM': 'tm', 'KGZ': 'kg', 'YEM': 'ye', 'PLE': 'ps',
			// Africa
			'EGY': 'eg', 'MAR': 'ma', 'ALG': 'dz', 'TUN': 'tn', 'LBA': 'ly',
			'NGR': 'ng', 'RSA': 'za', 'KEN': 'ke', 'CMR': 'cm', 'GHA': 'gh',
			'SEN': 'sn', 'CIV': 'ci', 'COD': 'cd', 'RWA': 'rw', 'UGA': 'ug',
			'TAN': 'tz', 'ETH': 'et', 'SUD': 'sd', 'ZIM': 'zw', 'ZAM': 'zm',
			'MOZ': 'mz', 'ANG': 'ao', 'BOT': 'bw', 'NAM': 'na', 'MAD': 'mg',
			'MRI': 'mu', 'SEY': 'sc', 'GAB': 'ga', 'CGO': 'cg', 'BEN': 'bj',
			'BUR': 'bf', 'MLI': 'ml', 'NIG': 'ne', 'TOG': 'tg', 'GAM': 'gm',
			'GUI': 'gn', 'LBR': 'lr', 'SLE': 'sl', 'CAF': 'cf', 'CHA': 'td',
			'ERI': 'er', 'DJI': 'dj', 'SOM': 'so', 'SSD': 'ss', 'MTN': 'mr',
			'CPV': 'cv', 'STP': 'st', 'COM': 'km', 'GNQ': 'gq', 'LES': 'ls',
			'SWZ': 'sz', 'MWI': 'mw', 'GNB': 'gw',
			// Oceania
			'AUS': 'au', 'NZL': 'nz', 'FIJ': 'fj', 'PNG': 'pg', 'SAM': 'ws',
			'TON': 'to', 'COK': 'ck', 'VAN': 'vu', 'SOL': 'sb', 'TUV': 'tv',
			'PLW': 'pw', 'FSM': 'fm', 'MHL': 'mh', 'KIR': 'ki', 'NRU': 'nr',
			'ASA': 'as', 'GUM': 'gu', 'NCL': 'nc', 'TAH': 'pf'
		};
		return map[ioc.toUpperCase()] || '';
	}
	
	/**
	 * Get country code from name (for flags) - fallback
	 */
	function getCountryCode(name) {
		const n = name.toLowerCase().trim();
		const codes = {
			'united states': 'us', 'brazil': 'br', 'poland': 'pl', 'italy': 'it',
			'japan': 'jp', 'china': 'cn', 'france': 'fr', 'germany': 'de',
			'turkey': 'tr', 'türkiye': 'tr', 'serbia': 'rs', 'netherlands': 'nl',
			'canada': 'ca', 'argentina': 'ar', 'dominican republic': 'do',
			'thailand': 'th', 'south korea': 'kr', 'korea': 'kr', 'cuba': 'cu',
			'puerto rico': 'pr', 'belgium': 'be', 'bulgaria': 'bg',
			'czech republic': 'cz', 'czechia': 'cz', 'slovenia': 'si',
			'ukraine': 'ua', 'finland': 'fi', 'mexico': 'mx', 'kenya': 'ke',
			'egypt': 'eg', 'cameroon': 'cm', 'tunisia': 'tn', 'iran': 'ir',
			'australia': 'au', 'peru': 'pe', 'greece': 'gr', 'spain': 'es',
			'portugal': 'pt', 'croatia': 'hr', 'sweden': 'se', 'norway': 'no',
			'romania': 'ro', 'russia': 'ru',
			// Caribbean & Central America
			'jamaica': 'jm', 'trinidad and tobago': 'tt', 'barbados': 'bb',
			'bermuda': 'bm', 'saint lucia': 'lc', 'st. lucia': 'lc',
			'antigua and barbuda': 'ag', 'nicaragua': 'ni', 'costa rica': 'cr',
			'panama': 'pa', 'guatemala': 'gt', 'honduras': 'hn', 'el salvador': 'sv',
			'haiti': 'ht', 'grenada': 'gd', 'saint kitts and nevis': 'kn',
			'saint vincent and the grenadines': 'vc', 'dominica': 'dm',
			'belize': 'bz', 'guyana': 'gy', 'suriname': 'sr', 'bahamas': 'bs',
			'san marino': 'sm', 'aruba': 'aw', 'curaçao': 'cw', 'curacao': 'cw'
		};
		return codes[n] || '';
	}
	
	/**
	 * Get top N rankings
	 * @async
	 * @param {number} limit - Number of top teams to return
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Array>} Top N rankings
	 */
	async function getTopRankings(limit, gender) {
		const rankings = await fetchCurrentRankings(gender);
		return rankings.slice(0, limit);
	}
	
	/**
	 * Format ranking data for display
	 * @param {Object} ranking - Ranking object
	 * @returns {Object} Formatted ranking data
	 */
	function formatRankingDisplay(ranking) {
		if (!ranking) return null;
		
		return {
			rank: ranking.rank,
			country: ranking.federationName,
			points: ranking.points.toFixed(2),
			participationPoints: ranking.participationPoints?.toFixed(2) || '0',
			gamesPlayed: ranking.gamesPlayed || 'N/A',
			iso3: ranking.iso3,
			lastUpdated: ranking.updatedDate
		};
	}
	
	/**
	 * Clear cache (force fresh fetch)
	 * @param {string} gender - Optional: specific gender to clear
	 */
	function clearCache(gender) {
		if (gender) {
			rankingsCache[gender] = null;
			rankingsCache.lastFetch[gender] = null;
		} else {
			rankingsCache = {
				men: null,
				women: null,
				lastFetch: { men: null, women: null }
			};
		}
		console.log('✓ Ranking cache cleared');
	}
	
	/**
	 * Get all cached rankings
	 */
	function getCachedRankings() {
		return rankingsCache;
	}
	
	return {
		fetchCurrentRankings,
		getCountryRanking,
		getTopRankings,
		getAllRankings,
		formatRankingDisplay,
		clearCache,
		getCachedRankings
	};
})();
