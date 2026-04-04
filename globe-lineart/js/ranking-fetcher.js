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
					const teamMatches = Array.isArray(team.teamMatches) ? team.teamMatches : [];
					
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
						flagUrl: team.flagUrl || '',
						teamMatches,
						teamAge: Number.isFinite(Number(team.teamAge)) ? Number(team.teamAge) : (Number.isFinite(Number(team.age)) ? Number(team.age) : null)
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
		const lowerName = String(name || '')
			.toLowerCase()
			.trim()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[.,'()]/g, ' ')
			.replace(/&/g, ' and ')
			.replace(/\s+/g, ' ')
			.trim();
		
		// Map common variations
		const nameMap = {
			'united states of america': 'united states',
			'usa': 'united states',
			'us': 'united states',
			'u s a': 'united states',
			'russian federation': 'russia',
			'bih': 'bosnia and herzegovina',
			'bosnia and herz': 'bosnia and herzegovina',
			'bosnia and herzeg': 'bosnia and herzegovina',
			// South Korea - FIVB uses "Korea"
			'republic of korea': 'korea',
			'south korea': 'korea',
			'korea republic of': 'korea',
			's korea': 'korea',
			// North Korea - FIVB uses "DPR Korea"  
			'north korea': 'dpr korea',
			'korea democratic people s republic of': 'dpr korea',
			'democratic peoples republic of korea': 'dpr korea',
			'dem people s republic of korea': 'dpr korea',
			'n korea': 'dpr korea',
			// Others
			'democratic republic of the congo': 'democratic republic of congo',
			'republic of the congo': 'congo',
			'united kingdom': 'great britain',
			'england': 'great britain',
			'czech republic': 'czechia',
			'ivory coast': 'cote d ivoire',
			'vietnam': 'viet nam',
			'taiwan': 'chinese taipei',
			'holland': 'netherlands',
			'uae': 'united arab emirates',
			'bosnia and herzegovina': 'bosnia and herzegovina',
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
				teamCode3: String(r.federationCode || '').toUpperCase(),
				flagUrl: r.flagUrl || '',
				wrs: r.points
			}));
	}

	const VNL_EVENT_REGEX = /(vnl|nations\s*league)/i;
	const VNL_TEAMS_PAGE_BASE = 'https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/teams';

	function extractVnlPageSeasonYear(html) {
		const titleMatch = String(html || '').match(/<title[^>]*>\s*VNL\s*(20\d{2})[^<]*<\/title>/i);
		if (titleMatch) {
			const year = Number(titleMatch[1]);
			if (Number.isInteger(year)) return year;
		}

		const fallbackMatch = String(html || '').match(/\bVNL\s*(20\d{2})\b/i);
		if (!fallbackMatch) return null;
		const fallbackYear = Number(fallbackMatch[1]);
		return Number.isInteger(fallbackYear) ? fallbackYear : null;
	}

	function dedupeTeams(teams) {
		const map = new Map();
		teams.forEach(team => {
			const code = String(team?.federationCode || '').toUpperCase();
			const name = String(team?.federationName || '').trim();
			if (!name || !code) return;
			map.set(code, {
				federationName: name,
				federationCode: code
			});
		});
		return Array.from(map.values());
	}

	function parseVnlTeamsFromHtml(html, gender) {
		const parsedTeams = [];
		if (!html) return parsedTeams;

		if (typeof DOMParser !== 'undefined') {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			const selector = `a[href*="/teams/${gender}/"][href*="/schedule/"]`;
			const cards = doc.querySelectorAll(selector);

			cards.forEach(card => {
				const nameNode = card.querySelector('.vbw-mu__team__name:not(.vbw-mu__team__name--abbr)');
				const codeNode = card.querySelector('.vbw-mu__team__name--abbr');
				const federationName = String(nameNode?.textContent || card.getAttribute('alt') || '').trim();
				const federationCode = String(codeNode?.textContent || '').trim().toUpperCase();

				if (federationName && federationCode) {
					parsedTeams.push({ federationName, federationCode });
				}
			});
		}

		if (!parsedTeams.length) {
			const fallbackRegex = new RegExp(`Volleyball\\s+team\\s+([^\"<]+?)\\s+flag[\\s\\S]*?teams/${gender}/\\d+/schedule/[\\s\\S]*?vbw-mu__team__name--abbr[\\s\\S]*?>([A-Z]{3})<`, 'gi');
			let match;
			while ((match = fallbackRegex.exec(html)) !== null) {
				parsedTeams.push({
					federationName: String(match[1] || '').trim(),
					federationCode: String(match[2] || '').trim().toUpperCase()
				});
			}
		}

		return dedupeTeams(parsedTeams);
	}

	async function fetchVnlTeamsFromCompetitionPage(gender) {
		try {
			const response = await fetch(`${VNL_TEAMS_PAGE_BASE}/${gender}/`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const html = await response.text();
			const teams = parseVnlTeamsFromHtml(html, gender);
			if (!teams.length) return null;

			return {
				seasonYear: extractVnlPageSeasonYear(html) || new Date().getFullYear(),
				teams
			};
		} catch (error) {
			console.warn(`Unable to fetch VNL teams page for ${gender}:`, error);
			return null;
		}
	}

	function getVnlSeasonYear(match) {
		const eventName = String(match?.eventName || match?.event || '');
		const eventYearMatch = eventName.match(/\b(20\d{2})\b/);
		if (eventYearMatch) {
			const eventYear = Number(eventYearMatch[1]);
			if (Number.isInteger(eventYear)) {
				return eventYear;
			}
		}

		const rawDate = match?.localDate || match?.date;
		if (!rawDate) return null;

		const parsed = new Date(rawDate);
		if (Number.isNaN(parsed.getTime())) return null;

		return parsed.getUTCFullYear();
	}

	function getTeamKey(team) {
		const code = String(team?.federationCode || '').toUpperCase();
		if (code) return code;
		return normalizeCountryName(String(team?.federationName || ''));
	}

	function pickSeasonYear(availableYears, requestedYear) {
		const years = [...availableYears]
			.filter(year => Number.isInteger(year))
			.sort((a, b) => a - b);

		if (!years.length) return null;
		if (years.includes(requestedYear)) return requestedYear;

		const previousOrCurrent = years.filter(year => year <= requestedYear);
		if (previousOrCurrent.length) {
			return previousOrCurrent[previousOrCurrent.length - 1];
		}

		return years[years.length - 1];
	}

	function stripTeamKey(team) {
		if (!team) return null;
		const clone = { ...team };
		delete clone.teamKey;
		return clone;
	}

	function buildTeamRecord(team, seasonYear, vnlMatchCount = 0) {
		return {
			teamKey: getTeamKey(team),
			rank: team.rank,
			federationName: team.federationName,
			federationCode: String(team.federationCode || '').toUpperCase(),
			teamCode2: iocToIso2(team.federationCode) || getCountryCode(team.federationName),
			points: team.points,
			confederationName: team.confederationName || '',
			vnlMatchCount,
			seasonYear
		};
	}

	/**
	 * Build a year-aware VNL snapshot for current season and transitions.
	 * @param {string} gender - 'men' or 'women'
	 * @param {{year?: number}} [options] - preferred season year
	 * @returns {Promise<Object>} season snapshot with teams/newcomers/relegated
	 */
	async function getVnlSeasonSnapshot(gender, options = {}) {
		const rankings = await fetchCurrentRankings(gender);
		const requestedYear = Number.isInteger(Number(options?.year))
			? Number(options.year)
			: new Date().getFullYear();

		const yearBuckets = new Map();
		const availableYears = new Set();
		const rankingByCode = new Map();
		const rankingByName = new Map();

		rankings.forEach(team => {
			const teamCode = String(team.federationCode || '').toUpperCase();
			if (teamCode) rankingByCode.set(teamCode, team);
			const normalizedName = normalizeCountryName(String(team.federationName || ''));
			if (normalizedName) rankingByName.set(normalizedName, team);

			const matches = Array.isArray(team.teamMatches) ? team.teamMatches : [];
			if (!matches.length) return;

			const perYearCount = new Map();

			matches.forEach(match => {
				const eventName = String(match?.eventName || match?.event || '');
				if (!VNL_EVENT_REGEX.test(eventName)) return;

				const seasonYear = getVnlSeasonYear(match);
				if (!Number.isInteger(seasonYear)) return;

				availableYears.add(seasonYear);
				perYearCount.set(seasonYear, (perYearCount.get(seasonYear) || 0) + 1);
			});

			perYearCount.forEach((vnlMatchCount, seasonYear) => {
				if (!yearBuckets.has(seasonYear)) {
					yearBuckets.set(seasonYear, new Map());
				}

				const record = buildTeamRecord(team, seasonYear, vnlMatchCount);
				yearBuckets.get(seasonYear).set(record.teamKey, record);
			});
		});

		const competitionSnapshot = await fetchVnlTeamsFromCompetitionPage(gender);
		if (competitionSnapshot?.teams?.length) {
			const competitionYear = Number.isInteger(Number(competitionSnapshot.seasonYear))
				? Number(competitionSnapshot.seasonYear)
				: requestedYear;
			const competitionBucket = new Map();

			competitionSnapshot.teams.forEach(teamFromPage => {
				const code = String(teamFromPage.federationCode || '').toUpperCase();
				const name = String(teamFromPage.federationName || '').trim();
				const rankingTeam = (code && rankingByCode.get(code))
					|| rankingByName.get(normalizeCountryName(name));

				const mergedTeam = rankingTeam || {
					rank: null,
					federationName: name,
					federationCode: code,
					points: null,
					confederationName: ''
				};

				const matchCount = Array.isArray(rankingTeam?.teamMatches)
					? rankingTeam.teamMatches.filter(match => {
						const eventName = String(match?.eventName || match?.event || '');
						return VNL_EVENT_REGEX.test(eventName) && getVnlSeasonYear(match) === competitionYear;
					}).length
					: 0;

				const teamRecord = buildTeamRecord(mergedTeam, competitionYear, matchCount);
				if (!teamRecord.federationCode && code) {
					teamRecord.federationCode = code;
					teamRecord.teamKey = getTeamKey(teamRecord);
				}
				if (!teamRecord.teamCode2) {
					teamRecord.teamCode2 = iocToIso2(teamRecord.federationCode) || getCountryCode(teamRecord.federationName);
				}
				competitionBucket.set(teamRecord.teamKey, teamRecord);
			});

			const allYears = Array.from(new Set([...availableYears, competitionYear])).sort((a, b) => a - b);
			const previousSeasonYear = allYears.filter(year => year < competitionYear).slice(-1)[0] || null;
			const previousBucket = previousSeasonYear ? (yearBuckets.get(previousSeasonYear) || new Map()) : new Map();
			const currentKeys = new Set(competitionBucket.keys());
			const previousKeys = new Set(previousBucket.keys());

			const teams = Array.from(competitionBucket.values())
				.sort((a, b) => {
					const rankA = Number(a.rank) || 999;
					const rankB = Number(b.rank) || 999;
					if (rankA !== rankB) return rankA - rankB;
					return String(a.federationName || '').localeCompare(String(b.federationName || ''));
				})
				.map(stripTeamKey);

			const newcomerTeams = Array.from(competitionBucket.values())
				.filter(team => !previousKeys.has(team.teamKey))
				.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
				.map(stripTeamKey);

			const relegatedTeams = Array.from(previousBucket.values())
				.filter(team => !currentKeys.has(team.teamKey))
				.sort((a, b) => {
					const rankA = Number(a.rank) || 999;
					const rankB = Number(b.rank) || 999;
					if (rankA !== rankB) return rankA - rankB;
					return String(a.federationName || '').localeCompare(String(b.federationName || ''));
				})
				.map(stripTeamKey);

			return {
				requestedYear,
				seasonYear: competitionYear,
				previousSeasonYear,
				isFallbackYear: competitionYear !== requestedYear,
				availableYears: allYears,
				teams,
				newcomerTeams,
				relegatedTeams
			};
		}

		const sortedYears = Array.from(availableYears).sort((a, b) => a - b);
		const seasonYear = pickSeasonYear(sortedYears, requestedYear);

		if (!seasonYear) {
			return {
				requestedYear,
				seasonYear: requestedYear,
				previousSeasonYear: null,
				isFallbackYear: false,
				availableYears: [],
				teams: [],
				newcomerTeams: [],
				relegatedTeams: []
			};
		}

		const previousSeasonYear = sortedYears.filter(year => year < seasonYear).slice(-1)[0] || null;
		const currentBucket = yearBuckets.get(seasonYear) || new Map();
		const previousBucket = previousSeasonYear ? (yearBuckets.get(previousSeasonYear) || new Map()) : new Map();

		const currentKeys = new Set(currentBucket.keys());
		const previousKeys = new Set(previousBucket.keys());

		const teams = Array.from(currentBucket.values())
			.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
			.map(stripTeamKey);

		const newcomerTeams = Array.from(currentBucket.values())
			.filter(team => !previousKeys.has(team.teamKey))
			.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
			.map(stripTeamKey);

		const relegatedTeams = Array.from(previousBucket.values())
			.filter(team => !currentKeys.has(team.teamKey))
			.sort((a, b) => {
				const rankA = Number(a.rank) || 999;
				const rankB = Number(b.rank) || 999;
				if (rankA !== rankB) return rankA - rankB;
				return String(a.federationName || '').localeCompare(String(b.federationName || ''));
			})
			.map(stripTeamKey);

		return {
			requestedYear,
			seasonYear,
			previousSeasonYear,
			isFallbackYear: seasonYear !== requestedYear,
			availableYears: sortedYears,
			teams,
			newcomerTeams,
			relegatedTeams
		};
	}

	/**
	 * Fetch current VNL teams from the live ranking API.
	 * Teams are detected for a single season year (requested or latest available).
	 * @param {string} gender - 'men' or 'women'
	 * @param {{year?: number}} [options] - preferred season year
	 * @returns {Promise<Array>} VNL teams with ranking metadata
	 */
	async function getCurrentVnlTeams(gender, options = {}) {
		const snapshot = await getVnlSeasonSnapshot(gender, options);
		return snapshot.teams || [];
	}

	/**
	 * Get tournament teams from API match events.
	 * @param {string} gender - 'men' or 'women'
	 * @param {string} tournament - currently supports 'vnl'
	 * @returns {Promise<Array<string>>} Unique federation names
	 */
	async function getTournamentTeams(gender, tournament = 'vnl') {
		if (tournament === 'vnl') {
			const vnlTeams = await getCurrentVnlTeams(gender);
			return vnlTeams.map(team => team.federationName).filter(Boolean);
		}

		const rankings = await fetchCurrentRankings(gender);
		const teams = new Set();
		const tournamentRegex = new RegExp(tournament, 'i');

		rankings.forEach(team => {
			if (!Array.isArray(team.pointsProgression)) return;
			const hasTournamentMatch = team.pointsProgression.some(match => {
				const eventName = String(match?.event || '');
				return tournamentRegex.test(eventName);
			});
			if (hasTournamentMatch && team.federationName) {
				teams.add(team.federationName);
			}
		});

		return Array.from(teams);
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
		getVnlSeasonSnapshot,
		getCurrentVnlTeams,
		getTournamentTeams,
		formatRankingDisplay,
		clearCache,
		getCachedRankings
	};
})();
