/**
 * Team Info Fetcher Module
 * Fetches team roster from FIVB VNL pages
 */
const TeamInfoFetcher = (function() {
	
	// Cache for team data
	let teamCache = {};
	
	// Banned/inactive teams
	const bannedTeams = {
		'RUS': { name: 'Russia', bannedYear: 2022, reason: 'Suspended from international competition' },
		'BLR': { name: 'Belarus', bannedYear: 2022, reason: 'Suspended from international competition' }
	};
	
	// VNL 2025 Team IDs from FIVB
	const vnlTeamIds = {
		// Men's teams
		'men': {
			'Argentina': 7518,
			'Brazil': 7519,
			'Bulgaria': 7520,
			'Canada': 7521,
			'China': 7522,
			'Cuba': 7523,
			'France': 7524,
			'Germany': 7525,
			'Iran': 7526,
			'Italy': 7527,
			'Japan': 7528,
			'Netherlands': 7529,
			'Poland': 7530,
			'Serbia': 7531,
			'Slovenia': 7532,
			'Turkey': 7533,
			'Türkiye': 7533,
			'USA': 7534,
			'United States': 7534
		},
		// Women's teams
		'women': {
			'Brazil': 7535,
			'Bulgaria': 7536,
			'Canada': 7537,
			'China': 7538,
			'Dominican Republic': 7539,
			'France': 7540,
			'Germany': 7541,
			'Italy': 7542,
			'Japan': 7543,
			'South Korea': 7544,
			'Korea': 7544,
			'Netherlands': 7545,
			'Poland': 7546,
			'Serbia': 7547,
			'Thailand': 7548,
			'Turkey': 7549,
			'Türkiye': 7549,
			'USA': 7550,
			'United States': 7550
		}
	};
	
	/**
	 * Check if team is banned/inactive
	 */
	function isBannedTeam(teamCode) {
		return bannedTeams[teamCode] || null;
	}
	
	/**
	 * Fetch team roster from FIVB VNL page
	 * @param {string} countryName - Country name
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Object>} Team roster data
	 */
	async function fetchTeamRoster(countryName, gender) {
		const cacheKey = `${countryName}_${gender}`;
		
		if (teamCache[cacheKey]) {
			return teamCache[cacheKey];
		}
		
		const teamId = vnlTeamIds[gender]?.[countryName];
		if (!teamId) {
			console.warn('Team not found in VNL:', countryName, gender);
			return null;
		}
		
		try {
			// Fetch team players page from VNL
			const url = `https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/teams/${gender}/${teamId}/players/`;
			
			// Use a CORS proxy or direct fetch (may need proxy in production)
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			
			const html = await response.text();
			const roster = parseVnlRoster(html, countryName);
			
			if (roster && roster.players.length > 0) {
				teamCache[cacheKey] = roster;
			}
			
			return roster;
			
		} catch (error) {
			console.warn('FIVB VNL roster fetch failed:', error.message);
			return null;
		}
	}
	
	/**
	 * Parse roster from VNL HTML page
	 * Format: | Number | Name | Position |
	 */
	function parseVnlRoster(html, countryName) {
		const roster = {
			teamName: countryName,
			coach: null,
			players: []
		};
		
		// Create a DOM parser
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		
		// Find the player table rows
		const rows = doc.querySelectorAll('table tr, tbody tr');
		
		for (const row of rows) {
			const cells = row.querySelectorAll('td');
			if (cells.length >= 3) {
				const number = cells[0]?.textContent?.trim();
				const name = cells[1]?.textContent?.trim();
				const position = cells[2]?.textContent?.trim();
				
				if (number && name && position && /^\d+$/.test(number)) {
					roster.players.push({
						number: number,
						name: name,
						position: normalizePosition(position)
					});
				}
			}
		}
		
		return roster;
	}
	
	/**
	 * Get team info from rankings data (fallback)
	 * @param {Object} ranking - Ranking data from RankingFetcher
	 * @returns {Object} Basic team info
	 */
	function getTeamInfoFromRanking(ranking) {
		if (!ranking) return null;
		
		return {
			teamName: ranking.federationName,
			teamCode: ranking.federationCode || '',
			confederation: ranking.confederationName || ''
		};
	}
	
	/**
	 * Fetch team info from Wikipedia
	 * @param {string} countryName - Country name
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Object>} Wiki info
	 */
	async function fetchTeamWikiInfo(countryName, gender) {
		try {
			const genderText = gender === 'women' ? "women's" : "men's";
			const searchQuery = `${countryName} ${genderText} national volleyball team`;
			
			const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=1`;
			
			const searchResponse = await fetch(searchUrl);
			const searchData = await searchResponse.json();
			
			if (!searchData.query.search || searchData.query.search.length === 0) {
				return null;
			}
			
			const pageId = searchData.query.search[0].pageid;
			const pageTitle = searchData.query.search[0].title;
			
			// Get page extract
			const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*`;
			
			const extractResponse = await fetch(extractUrl);
			const extractData = await extractResponse.json();
			
			const extract = extractData.query.pages[pageId].extract || '';
			
			// Parse for key info
			return {
				summary: extract.split('\n')[0] || '',
				wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
				pageTitle: pageTitle
			};
			
		} catch (error) {
			console.warn('Wiki fetch failed:', error.message);
			return null;
		}
	}
	
	/**
	 * Normalize position names
	 * FIVB uses: S (Setter), OH (Outside Hitter), MB (Middle Blocker), O (Opposite), L (Libero)
	 */
	function normalizePosition(pos) {
		if (!pos) return '-';
		const p = pos.toUpperCase().trim();
		
		// Direct FIVB codes
		if (p === 'S') return 'S';
		if (p === 'O') return 'OPP';  // FIVB uses O for Opposite
		if (p === 'OH') return 'OH';
		if (p === 'MB') return 'MB';
		if (p === 'L') return 'L';
		
		// Full names
		const pl = p.toLowerCase();
		if (pl.includes('setter')) return 'S';
		if (pl.includes('opposite') || pl.includes('opp')) return 'OPP';
		if (pl.includes('outside')) return 'OH';
		if (pl.includes('middle')) return 'MB';
		if (pl.includes('libero')) return 'L';
		
		return p.substring(0, 3);
	}
	
	/**
	 * Get position display info with icon
	 */
	function getPositionInfo(posCode) {
		const positions = {
			'S': { name: 'Setter', icon: 'S', color: '#3b82f6' },
			'OPP': { name: 'Opposite', icon: 'O', color: '#ec4899' },
			'OH': { name: 'Outside Hitter', icon: 'OH', color: '#22c55e' },
			'MB': { name: 'Middle Blocker', icon: 'MB', color: '#eab308' },
			'L': { name: 'Libero', icon: 'L', color: '#a855f7' }
		};
		return positions[posCode] || { name: posCode, icon: posCode, color: '#6b7280' };
	}
	
	/**
	 * Group players by position
	 */
	function groupPlayersByPosition(players) {
		const positionOrder = ['S', 'OPP', 'OH', 'MB', 'L'];
		const grouped = {};
		
		// Initialize groups
		positionOrder.forEach(pos => {
			grouped[pos] = [];
		});
		grouped['Other'] = [];
		
		// Group players
		players.forEach(player => {
			const pos = player.position;
			if (positionOrder.includes(pos)) {
				grouped[pos].push(player);
			} else {
				grouped['Other'].push(player);
			}
		});
		
		return grouped;
	}
	
	/**
	 * Clear cache
	 */
	function clearCache() {
		teamCache = {};
	}
	
	return {
		fetchTeamRoster,
		getTeamInfoFromRanking,
		fetchTeamWikiInfo,
		isBannedTeam,
		getPositionInfo,
		groupPlayersByPosition,
		clearCache
	};
})();
