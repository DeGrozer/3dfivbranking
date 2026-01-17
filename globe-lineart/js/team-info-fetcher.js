/**
 * Team Info Fetcher Module
 * Fetches team roster and info from FIVB API
 */
const TeamInfoFetcher = (function() {
	
	const FIVB_API_BASE = 'https://en.volleyballworld.com/api/v1';
	
	// Cache for team data
	let teamCache = {};
	
	/**
	 * Fetch team roster from FIVB API
	 * @param {string} teamCode - 3-letter team code (e.g., 'USA', 'BRA')
	 * @param {string} gender - 'men' or 'women'
	 * @returns {Promise<Object>} Team roster data
	 */
	async function fetchTeamRoster(teamCode, gender) {
		const cacheKey = `${teamCode}_${gender}`;
		
		if (teamCache[cacheKey]) {
			return teamCache[cacheKey];
		}
		
		try {
			// FIVB API endpoint for team details
			const genderCode = gender === 'women' ? 0 : 1;
			const apiUrl = `${FIVB_API_BASE}/team/volleyball/${genderCode}/${teamCode}`;
			
			const response = await fetch(apiUrl);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			
			const data = await response.json();
			
			// Transform roster data
			const roster = {
				teamName: data.teamName || data.federationName || teamCode,
				teamCode: teamCode,
				coach: data.headCoach || null,
				players: []
			};
			
			if (data.players && Array.isArray(data.players)) {
				roster.players = data.players.map(player => ({
					name: player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim(),
					number: player.shirtNumber || player.jerseyNumber || '-',
					position: normalizePosition(player.position || player.role),
					height: player.height ? `${player.height} cm` : null,
					birthYear: player.birthDate ? new Date(player.birthDate).getFullYear() : null,
					club: player.club || null
				}));
			}
			
			teamCache[cacheKey] = roster;
			return roster;
			
		} catch (error) {
			console.warn('FIVB roster API failed:', error.message);
			return null;
		}
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
			confederation: ranking.confederationName || '',
			rank: ranking.rank,
			points: ranking.points
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
	 */
	function normalizePosition(pos) {
		if (!pos) return '-';
		const p = pos.toLowerCase();
		
		if (p.includes('setter')) return 'S';
		if (p.includes('opposite') || p.includes('opp')) return 'OPP';
		if (p.includes('outside') || p.includes('oh')) return 'OH';
		if (p.includes('middle') || p.includes('mb')) return 'MB';
		if (p.includes('libero') || p.includes('lib')) return 'L';
		
		return pos.substring(0, 3).toUpperCase();
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
		clearCache
	};
})();
