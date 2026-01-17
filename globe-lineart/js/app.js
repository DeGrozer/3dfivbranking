/**
 * Main Application Module
 * Orchestrates globe visualization, data loading, and UI interactions
 */
(function() {
	
	// ============================================================================
	// Application State
	// ============================================================================
	let currentGender = 'women';  // Current gender mode (women or men)
	let rankingsData = null;       // Cached rankings for current gender
	let worldMapData = null;       // GeoJSON world map data
	
	// ============================================================================
	// Medals Reference Data
	// ============================================================================
	/**
	 * Historic medals data for major volleyball nations
	 * Includes Olympic, World Championship, and Continental competition medals
	 */
	const medalsData = {
		// USA
		'USA': {
			olympics: { gold: 3, silver: 3, bronze: 2 },
			worldChampionship: { gold: 0, silver: 2, bronze: 1 },
			vnl: { gold: 1, silver: 1, bronze: 2 },
			continental: { name: 'NORCECA', gold: 7, silver: 3, bronze: 1 }
		},
		// Brazil
		'BRA': {
			olympics: { gold: 3, silver: 3, bronze: 2 },
			worldChampionship: { gold: 3, silver: 3, bronze: 2 },
			vnl: { gold: 12, silver: 5, bronze: 4 },
			continental: { name: 'CSV', gold: 15, silver: 8, bronze: 5 }
		},
		// China
		'CHN': {
			olympics: { gold: 3, silver: 2, bronze: 1 },
			worldChampionship: { gold: 2, silver: 1, bronze: 3 },
			vnl: { gold: 5, silver: 4, bronze: 3 },
			continental: { name: 'AVC', gold: 13, silver: 4, bronze: 2 }
		},
		// Italy
		'ITA': {
			olympics: { gold: 0, silver: 3, bronze: 3 },
			worldChampionship: { gold: 3, silver: 2, bronze: 2 },
			vnl: { gold: 4, silver: 6, bronze: 3 },
			continental: { name: 'CEV', gold: 6, silver: 7, bronze: 5 }
		},
		// Poland
		'POL': {
			olympics: { gold: 1, silver: 0, bronze: 2 },
			worldChampionship: { gold: 3, silver: 0, bronze: 1 },
			vnl: { gold: 0, silver: 2, bronze: 4 },
			continental: { name: 'CEV', gold: 1, silver: 3, bronze: 7 }
		},
		// Russia
		'RUS': {
			olympics: { gold: 4, silver: 0, bronze: 2 },
			worldChampionship: { gold: 6, silver: 2, bronze: 2 },
			vnl: { gold: 2, silver: 3, bronze: 5 },
			continental: { name: 'CEV', gold: 16, silver: 5, bronze: 3 },
			banned: true,
			lastRank: 1,
			bannedYear: 2022
		},
		// Japan
		'JPN': {
			olympics: { gold: 1, silver: 4, bronze: 3 },
			worldChampionship: { gold: 2, silver: 4, bronze: 1 },
			vnl: { gold: 1, silver: 2, bronze: 3 },
			continental: { name: 'AVC', gold: 9, silver: 8, bronze: 6 }
		},
		// Serbia
		'SRB': {
			olympics: { gold: 2, silver: 1, bronze: 0 },
			worldChampionship: { gold: 3, silver: 1, bronze: 1 },
			vnl: { gold: 1, silver: 3, bronze: 2 },
			continental: { name: 'CEV', gold: 3, silver: 4, bronze: 2 }
		},
		// Turkey
		'TUR': {
			olympics: { gold: 0, silver: 0, bronze: 1 },
			worldChampionship: { gold: 0, silver: 2, bronze: 2 },
			vnl: { gold: 1, silver: 1, bronze: 2 },
			continental: { name: 'CEV', gold: 4, silver: 3, bronze: 5 }
		},
		// Cuba
		'CUB': {
			olympics: { gold: 3, silver: 1, bronze: 0 },
			worldChampionship: { gold: 0, silver: 1, bronze: 3 },
			vnl: { gold: 0, silver: 0, bronze: 1 },
			continental: { name: 'NORCECA', gold: 12, silver: 5, bronze: 2 }
		},
		// Netherlands
		'NLD': {
			olympics: { gold: 0, silver: 1, bronze: 1 },
			worldChampionship: { gold: 1, silver: 0, bronze: 0 },
			vnl: { gold: 0, silver: 1, bronze: 2 },
			continental: { name: 'CEV', gold: 1, silver: 2, bronze: 3 }
		},
		// Germany
		'DEU': {
			olympics: { gold: 0, silver: 0, bronze: 1 },
			worldChampionship: { gold: 0, silver: 0, bronze: 1 },
			vnl: { gold: 0, silver: 0, bronze: 0 },
			continental: { name: 'CEV', gold: 2, silver: 3, bronze: 4 }
		},
		// Argentina
		'ARG': {
			olympics: { gold: 0, silver: 1, bronze: 1 },
			worldChampionship: { gold: 0, silver: 1, bronze: 0 },
			vnl: { gold: 0, silver: 0, bronze: 1 },
			continental: { name: 'CSV', gold: 7, silver: 6, bronze: 4 }
		},
		// South Korea
		'KOR': {
			olympics: { gold: 0, silver: 0, bronze: 1 },
			worldChampionship: { gold: 0, silver: 0, bronze: 0 },
			vnl: { gold: 0, silver: 0, bronze: 0 },
			continental: { name: 'AVC', gold: 3, silver: 5, bronze: 7 }
		},
		// France
		'FRA': {
			olympics: { gold: 1, silver: 0, bronze: 0 },
			worldChampionship: { gold: 0, silver: 1, bronze: 1 },
			vnl: { gold: 0, silver: 1, bronze: 1 },
			continental: { name: 'CEV', gold: 0, silver: 1, bronze: 3 }
		},
		// Thailand
		'THA': {
			olympics: { gold: 0, silver: 0, bronze: 0 },
			worldChampionship: { gold: 0, silver: 0, bronze: 1 },
			vnl: { gold: 0, silver: 0, bronze: 0 },
			continental: { name: 'AVC', gold: 2, silver: 4, bronze: 6 }
		},
		// Belarus
		'BLR': {
			olympics: { gold: 0, silver: 0, bronze: 0 },
			worldChampionship: { gold: 0, silver: 0, bronze: 0 },
			vnl: { gold: 0, silver: 0, bronze: 0 },
			continental: { name: 'CEV', gold: 0, silver: 1, bronze: 2 },
			banned: true,
			lastRank: 15,
			bannedYear: 2022
		}
	};
	
	/**
	 * Initialize application
	 */
	async function init() {
		try {
			showLoading(true);
			
			// Load world map data
			worldMapData = await DataLoader.loadWorldMap();
			const countries = topojson.feature(worldMapData, worldMapData.objects.countries).features;
			
			// Initialize globe
			GlobeRenderer.init(countries);
			
			// Setup UI interactions
			setupGenderToggle();
			setupZoomControls();
			setupCardClose();
			setupSparklineHover();
			setupLeaderboard();
			
			// Setup country selection callback
			window.onCountrySelected = handleCountrySelection;
			
			showLoading(false);
			
		} catch (error) {
			console.error('Initialization error:', error);
			showError('Failed to load application. Please refresh the page.');
		}
	}
	
	/**
	 * Setup sparkline hover interactions
	 */
	function setupSparklineHover() {
		document.addEventListener('mouseover', (e) => {
			if (e.target.classList.contains('sparkline-hover-dot')) {
				const pts = e.target.getAttribute('data-pts');
				const date = e.target.getAttribute('data-date');
				const sparklineBox = e.target.closest('.relative');
				const tooltip = sparklineBox?.querySelector('.sparkline-tooltip');
				
				if (tooltip) {
					tooltip.textContent = `${pts} pts${date ? ' • ' + date : ''}`;
					tooltip.classList.remove('hidden');
					
					const cx = parseFloat(e.target.getAttribute('cx'));
					const cy = parseFloat(e.target.getAttribute('cy'));
					
					// Position tooltip, keep within card bounds
					let leftPos = cx + 8;
					if (leftPos > 180) leftPos = 180;
					if (leftPos < 70) leftPos = 70;
					
					tooltip.style.left = leftPos + 'px';
					tooltip.style.top = (cy + 20) + 'px';
					tooltip.style.transform = 'translateX(-50%)';
				}
				
				// Show the visible dot
				const visibleDot = e.target.nextElementSibling;
				if (visibleDot) visibleDot.style.opacity = '1';
			}
		});
		
		document.addEventListener('mouseout', (e) => {
			if (e.target.classList.contains('sparkline-hover-dot')) {
				const sparklineBox = e.target.closest('.relative');
				const tooltip = sparklineBox?.querySelector('.sparkline-tooltip');
				if (tooltip) tooltip.classList.add('hidden');
				
				const visibleDot = e.target.nextElementSibling;
				if (visibleDot) visibleDot.style.opacity = '0';
			}
		});
	}
	
	/**
	 * Load rankings for gender (no longer needed - RankingFetcher handles caching)
	 */
	async function loadRankings(gender) {
		// RankingFetcher handles caching automatically
		console.log(`Rankings for ${gender} will be fetched on demand`);
	}
	
	/**
	 * Setup gender toggle buttons
	 */
	function setupGenderToggle() {
		const btnWomen = document.getElementById('btnWomen');
		const btnMen = document.getElementById('btnMen');
		
		if (!btnWomen || !btnMen) return;
		
		// Update date display
		updateRankingDate();
		
		btnWomen.addEventListener('click', () => {
			if (currentGender === 'women') return;
			currentGender = 'women';
			updateGenderUI();
		});
		
		btnMen.addEventListener('click', () => {
			if (currentGender === 'men') return;
			currentGender = 'men';
			updateGenderUI();
		});
	}
	
	/**
	 * Update UI when gender changes
	 */
	function updateGenderUI() {
		const btnWomen = document.getElementById('btnWomen');
		const btnMen = document.getElementById('btnMen');
		
		// Update button styles
		if (currentGender === 'women') {
			btnWomen.classList.add('active', 'bg-pink-600');
			btnWomen.classList.remove('bg-gray-600');
			btnMen.classList.remove('active', 'bg-blue-600');
			btnMen.classList.add('bg-gray-600');
		} else {
			btnMen.classList.add('active', 'bg-blue-600');
			btnMen.classList.remove('bg-gray-600');
			btnWomen.classList.remove('active', 'bg-pink-600');
			btnWomen.classList.add('bg-gray-600');
		}
		
		// Update body class for theme
		document.body.className = document.body.className.replace(/women|men/, currentGender);
		
		// Close any open card
		hideCountryCard();
		GlobeRenderer.clearSelection();
	}
	
	/**
	 * Update ranking date in header
	 */
	function updateRankingDate() {
		const dateEl = document.getElementById('rankingDate');
		if (dateEl) {
			const today = new Date().toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
			dateEl.textContent = `as of ${today}`;
		}
	}
	
	/**
	 * Setup card close button
	 */
	function setupCardClose() {
		const closeBtn = document.querySelector('.close-btn');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				hideCountryCard();
				GlobeRenderer.clearSelection();
			});
		}
	}
	
	/**
	 * Setup leaderboard modal
	 */
	function setupLeaderboard() {
		const btnLeaderboard = document.getElementById('btnLeaderboard');
		const closeLeaderboard = document.getElementById('closeLeaderboard');
		const modal = document.getElementById('leaderboardModal');
		const searchInput = document.getElementById('leaderboardSearch');
		
		if (btnLeaderboard) {
			btnLeaderboard.addEventListener('click', () => {
				showLeaderboard();
			});
		}
		
		if (closeLeaderboard) {
			closeLeaderboard.addEventListener('click', () => {
				hideLeaderboard();
			});
		}
		
		// Close on backdrop click
		if (modal) {
			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					hideLeaderboard();
				}
			});
		}
		
		// Search functionality
		if (searchInput) {
			searchInput.addEventListener('input', (e) => {
				filterLeaderboard(e.target.value);
			});
		}
	}
	
	/**
	 * Filter leaderboard by search term
	 */
	function filterLeaderboard(searchTerm) {
		const items = document.querySelectorAll('.leaderboard-item');
		const term = searchTerm.toLowerCase().trim();
		
		items.forEach(item => {
			const country = item.getAttribute('data-country')?.toLowerCase() || '';
			if (term === '' || country.includes(term)) {
				item.style.display = 'flex';
			} else {
				item.style.display = 'none';
			}
		});
	}
	
	/**
	 * Show leaderboard modal with rankings
	 */
	async function showLeaderboard() {
		const modal = document.getElementById('leaderboardModal');
		const content = document.getElementById('leaderboardContent');
		const title = document.getElementById('leaderboardTitle');
		const searchInput = document.getElementById('leaderboardSearch');
		
		if (!modal || !content) return;
		
		// Clear search input
		if (searchInput) {
			searchInput.value = '';
		}
		
		// Update title based on gender
		if (title) {
			title.textContent = currentGender === 'women' ? "Women's World Rankings" : "Men's World Rankings";
		}
		
		// Show modal
		modal.classList.remove('opacity-0', 'pointer-events-none');
		
		// Show loading state
		content.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">Loading...</div>';
		
		try {
			// Fetch all rankings
			const rankings = await RankingFetcher.getAllRankings(currentGender);
			
			if (!rankings || rankings.length === 0) {
				content.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">No rankings available</div>';
				return;
			}
			
			// Generate leaderboard HTML - clean dark theme
			const html = rankings.map((team, index) => {
				const rank = team.rank || index + 1;
				const flagUrl = `https://flagcdn.com/w40/${(team.teamCode || '').toLowerCase()}.png`;
				const points = team.wrs?.toFixed(2) || '—';
				
				// Subtle highlight for top 3
				let rowBg = 'hover:bg-gray-800/50';
				let rankColor = 'text-gray-500';
				if (rank === 1) {
					rankColor = 'text-amber-400';
				} else if (rank === 2) {
					rankColor = 'text-gray-300';
				} else if (rank === 3) {
					rankColor = 'text-amber-600';
				}
				
				return `
					<div class="flex items-center gap-3 px-5 py-3 ${rowBg} cursor-pointer leaderboard-item border-b border-gray-800/50 last:border-0" data-country="${team.teamName || ''}">
						<span class="w-6 text-right text-sm font-medium ${rankColor}">${rank}</span>
						<img src="${flagUrl}" alt="" class="w-7 h-5 object-cover shrink-0" onerror="this.style.visibility='hidden'">
						<span class="flex-1 text-sm text-gray-200 truncate">${team.teamName || 'Unknown'}</span>
						<span class="text-sm text-gray-400 tabular-nums">${points}</span>
					</div>
				`;
			}).join('');
			
			content.innerHTML = html;
			
			// Add click handlers to navigate to country
			content.querySelectorAll('.leaderboard-item').forEach(item => {
				item.addEventListener('click', () => {
					const countryName = item.getAttribute('data-country');
					hideLeaderboard();
					// Trigger country selection on globe
					if (countryName) {
						GlobeRenderer.selectCountryByName(countryName);
					}
				});
			});
			
		} catch (error) {
			console.error('Failed to load leaderboard:', error);
			content.innerHTML = '<div class="text-center text-red-400 py-8 text-sm">Failed to load rankings</div>';
		}
	}
	
	/**
	 * Hide leaderboard modal
	 */
	function hideLeaderboard() {
		const modal = document.getElementById('leaderboardModal');
		if (modal) {
			modal.classList.add('opacity-0', 'pointer-events-none');
		}
	}
	
	/**
	 * Setup zoom controls
	 */
	function setupZoomControls() {
		const zoomInBtn = document.getElementById('zoomIn');
		const zoomOutBtn = document.getElementById('zoomOut');
		
		if (zoomInBtn) {
			zoomInBtn.addEventListener('click', () => {
				GlobeRenderer.zoomIn();
			});
		}
		
		if (zoomOutBtn) {
			zoomOutBtn.addEventListener('click', () => {
				GlobeRenderer.zoomOut();
			});
		}
	}
	
	/**
	 * Handle country selection from globe
	 */
	async function handleCountrySelection(countryId, countryName) {
		// Fetch live ranking from FIVB API
		let ranking = null;
		try {
			ranking = await RankingFetcher.getCountryRanking(countryName, currentGender);
		} catch (error) {
			console.error('Failed to fetch ranking:', error);
		}
		
		// Show card with ranking data
		showCountryCard(countryName, countryId, ranking);
	}
	
	/**
	 * Show country card with ranking data
	 */
	function showCountryCard(countryName, countryId, ranking) {
		const card = document.querySelector('.country-card');
		if (!card) return;
		
		const iso2Code = DataLoader.getIso2Code(countryId);
		const flagUrl = `${API_CONFIG.flags.primary}${iso2Code.toLowerCase()}.png`;
		
		// Update flag
		const flagImg = card.querySelector('.country-flag');
		if (flagImg) {
			flagImg.src = flagUrl;
			flagImg.alt = `${countryName} flag`;
		}
		
		// Update country name
		const nameElement = card.querySelector('.country-name');
		if (nameElement) {
			nameElement.textContent = countryName;
		}
		
		// Update federation name
		const fedElement = card.querySelector('.federation-name');
		if (fedElement) {
			fedElement.textContent = ranking?.confederationName || '';
		}
		
		// Build card body content
		const cardBody = card.querySelector('.card-body');
		if (!cardBody) return;
		
		let bodyHtml = '<p class="text-gray-500 text-sm">No ranking data available</p>';
		if (ranking) {
			const matchHistoryHtml = generateMatchHistory(ranking.pointsProgression);
			const sparklineHtml = generateSparkline(ranking.pointsProgression);
			
			bodyHtml = `
				<div class="flex items-center justify-between mb-3">
					<div>
						<p class="text-xs text-gray-400 uppercase">World Rank</p>
						<p class="text-2xl font-bold text-gray-900">#${ranking.rank}</p>
					</div>
					<div class="text-right">
						<p class="text-xs text-gray-400 uppercase">Points</p>
						<p class="text-xl font-semibold text-gray-700">${ranking.points.toFixed(2)}</p>
					</div>
				</div>
				${matchHistoryHtml}
				${sparklineHtml}
			`;
		}
		
		cardBody.innerHTML = bodyHtml;
		
		// Show card
		card.classList.add('show');
	}
	
	/**
	 * Generate SVG sparkline for points progression
	 * @param {Array} progression - Array of {date, points, increment} objects
	 * @returns {string} HTML string with SVG sparkline
	 */
	function generateSparkline(progression) {
		if (!progression || progression.length < 2) {
			return '';
		}
		
		// Extract points values
		const points = progression.map(p => p.points);
		const minPts = Math.min(...points);
		const maxPts = Math.max(...points);
		const range = maxPts - minPts || 1;
		
		// Fixed dimensions for the sparkline
		const width = 260;
		const height = 50;
		const padding = 6;
		
		// Calculate path coordinates
		const chartWidth = width - padding * 2;
		const chartHeight = height - padding * 2;
		const stepX = chartWidth / (points.length - 1);
		
		const pathPoints = points.map((pt, i) => {
			const x = padding + i * stepX;
			const y = padding + chartHeight - ((pt - minPts) / range) * chartHeight;
			return { x, y, pt };
		});
		
		// Create line path
		const linePath = pathPoints.map((p, i) => 
			(i === 0 ? 'M' : 'L') + `${p.x.toFixed(1)},${p.y.toFixed(1)}`
		).join(' ');
		
		// Area fill
		const areaPath = linePath + 
			` L${pathPoints[pathPoints.length - 1].x.toFixed(1)},${height - padding}` +
			` L${padding},${height - padding} Z`;
		
		// Trend color
		const startPt = points[0];
		const endPt = points[points.length - 1];
		const isPositive = endPt >= startPt;
		const lineColor = isPositive ? '#10b981' : '#ef4444';
		const areaColor = isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
		
		// Change text
		const change = endPt - startPt;
		const changeSign = change >= 0 ? '+' : '';
		const changeText = `${changeSign}${change.toFixed(1)}`;
		
		// Create hover dots for each point
		const hoverDots = pathPoints.map((p, i) => {
			const date = progression[i].date ? new Date(progression[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
			return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="transparent" class="sparkline-hover-dot" data-pts="${p.pt.toFixed(2)}" data-date="${date}" style="cursor: pointer;"/>
			<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${lineColor}" opacity="0" class="sparkline-dot"/>`;
		}).join('');
		
		const lastDot = pathPoints[pathPoints.length - 1];
		
		return `
			<div class="mt-3 bg-gray-100 rounded-lg border border-gray-200 overflow-visible relative">
				<div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
					<span class="text-xs text-gray-600 font-medium">Points Trend</span>
					<span class="sparkline-value text-xs font-bold" style="color: ${lineColor}">${changeText} pts</span>
				</div>
				<div class="p-2 bg-white rounded-b-lg" style="height: 60px;">
					<svg width="${width}" height="${height}" style="display: block; max-width: 100%;" class="sparkline-chart">
						<path d="${areaPath}" fill="${areaColor}" />
						<path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<circle cx="${lastDot.x.toFixed(1)}" cy="${lastDot.y.toFixed(1)}" r="3" fill="${lineColor}"/>
						${hoverDots}
					</svg>
				</div>
				<div class="sparkline-tooltip hidden absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap" style="pointer-events: none;"></div>
			</div>
		`;
	}
	
	/**
	 * Calculate current win/loss streak
	 * @param {Array} progression - Match history array
	 * @returns {Object} {type: 'W'|'L'|null, count: number}
	 */
	function calculateStreak(progression) {
		if (!progression || progression.length === 0) {
			return { type: null, count: 0 };
		}
		
		// Get matches in reverse order (most recent first)
		const matches = [...progression].reverse();
		
		let streakType = matches[0].result;
		let count = 0;
		
		for (const match of matches) {
			if (match.result === streakType) {
				count++;
			} else {
				break;
			}
		}
		
		return { type: streakType, count };
	}

	/**
	 * Generate match history list
	 * @param {Array} progression - Array of {date, points, increment, opponent, result, event, score} objects
	 * @returns {string} HTML string with match history
	 */
	function generateMatchHistory(progression) {
		if (!progression || progression.length === 0) {
			return '';
		}
		
		// Get last 5 matches (most recent first)
		const recentMatches = [...progression].reverse().slice(0, 5);
		
		const matchItems = recentMatches.map(match => {
			const isWin = match.result === 'W';
			const resultBg = isWin ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
			const resultText = isWin ? 'W' : 'L';
			
			// Opponent name
			const opponent = match.opponent || 'Unknown';
			
			// Score display (sets won - sets lost)
			const score = match.score || '';
			const [setsWon, setsLost] = score.split('-');
			
			return `
				<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
					<div class="flex items-center gap-2 flex-1 min-w-0">
						<span class="text-xs text-gray-400">vs</span>
						<span class="text-sm text-gray-800 font-medium truncate">${opponent}</span>
					</div>
					<div class="flex items-center gap-2 shrink-0">
						<div class="text-center">
							<span class="text-sm font-bold text-gray-800">${setsWon || '-'}</span>
							<span class="text-xs text-gray-400 mx-0.5">:</span>
							<span class="text-sm font-bold text-gray-500">${setsLost || '-'}</span>
						</div>
						<span class="text-xs font-bold w-6 h-6 rounded flex items-center justify-center ${resultBg}">${resultText}</span>
					</div>
				</div>
			`;
		}).join('');
		
		return `
			<div class="match-history">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Recent Matches</p>
				<div class="bg-gray-50 rounded-lg px-3 py-1">
					${matchItems}
				</div>
			</div>
		`;
	}

	/**
	 * Hide country card
	 */
	function hideCountryCard() {
		const card = document.querySelector('.country-card');
		if (card) {
			card.classList.remove('show');
		}
	}

	/**
	 * Show medals for selected country
	 */
	function showMedals(countryId) {
		const medalsCard = document.querySelector('.medals-card');
		if (!medalsCard) return;

		const countryData = medalsData[countryId];

		if (!countryData) {
			// No medal data available
			medalsCard.innerHTML = `
				<h3>Tournament Medals</h3>
				<p class="medals-intro">No medal data available for this country</p>
			`;
			medalsCard.classList.add('show');
			return;
		}
		
		// Check if country is banned
		let bannedHtml = '';
		if (countryData.banned) {
			bannedHtml = `
				<div class="banned-status">
					<div class="status-text">🔴 Banned from Competition</div>
					<div class="last-rank">Last Recorded: #${countryData.lastRank} (${countryData.bannedYear})</div>
				</div>
			`;
		}
		
		// Build medals HTML
		const { olympics, worldChampionship, vnl, continental } = countryData;
		
		medalsCard.innerHTML = `
			<h3>Tournament Medals</h3>
			
			<div class="medal-item">
				<div class="medal-tournament">🥇 Olympics</div>
				<div class="medal-counts">
					<span style="color: #ffd700">${olympics.gold}🥇</span>
					<span style="color: #c0c0c0">${olympics.silver}🥈</span>
					<span style="color: #cd7f32">${olympics.bronze}🥉</span>
				</div>
			</div>
			
			<div class="medal-item">
				<div class="medal-tournament">🏆 World Championship</div>
				<div class="medal-counts">
					<span style="color: #ffd700">${worldChampionship.gold}🥇</span>
					<span style="color: #c0c0c0">${worldChampionship.silver}🥈</span>
					<span style="color: #cd7f32">${worldChampionship.bronze}🥉</span>
				</div>
			</div>
			
			<div class="medal-item">
				<div class="medal-tournament">🌍 VNL</div>
				<div class="medal-counts">
					<span style="color: #ffd700">${vnl.gold}🥇</span>
					<span style="color: #c0c0c0">${vnl.silver}🥈</span>
					<span style="color: #cd7f32">${vnl.bronze}🥉</span>
				</div>
			</div>
			
			<div class="medal-item">
				<div class="medal-tournament">🌎 ${continental.name}</div>
				<div class="medal-counts">
					<span style="color: #ffd700">${continental.gold}🥇</span>
					<span style="color: #c0c0c0">${continental.silver}🥈</span>
					<span style="color: #cd7f32">${continental.bronze}🥉</span>
				</div>
			</div>
			
			${bannedHtml}
		`;
		
		// Show card with animation
		setTimeout(() => {
			medalsCard.classList.add('show');
		}, 150);
	}
	
	/**
	 * Show country volleyball history
	 */
	async function showCountryHistory(countryName, countryId) {
		const sidebar = document.querySelector('.info-sidebar');
		if (!sidebar) return;
		
		// Show sidebar with loading state
		sidebar.classList.add('show');
		sidebar.innerHTML = `
			<div class="country-history">
				<h3 class="country-history-title">${countryName} Volleyball</h3>
				<div class="history-content">
					<p class="history-intro">Loading volleyball information from Wikipedia...</p>
				</div>
			</div>
		`;
		
		// Fetch data from Wikipedia API
		try {
			const wikiData = await fetchWikipediaData(countryName);
			
			sidebar.innerHTML = `
				<div class="country-history">
					<h3 class="country-history-title">${countryName} Volleyball</h3>
					<div class="history-content">
						${wikiData}
					</div>
				</div>
			`;
		} catch (error) {
			console.error('Failed to load Wikipedia data:', error);
			sidebar.innerHTML = `
				<div class="country-history">
					<h3 class="country-history-title">${countryName} Volleyball</h3>
					<div class="history-content">
						<p>Information about ${countryName}'s volleyball program.</p>
						<p class="history-intro">This country participates in international volleyball competitions.</p>
					</div>
				</div>
			`;
		}
	}
	
	/**
	 * Fetch volleyball data from Wikipedia
	 */
	async function fetchWikipediaData(countryName) {
		try {
			// Try to get gender-specific volleyball article
			const genderText = currentGender === 'women' ? "women's" : "men's";
			const searchQuery = `${countryName} ${genderText} national volleyball team`;
			const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=1`;
			
			const searchResponse = await fetch(searchUrl);
			const searchData = await searchResponse.json();
			
			if (searchData.query.search.length === 0) {
				throw new Error('No Wikipedia article found');
			}
			
			const pageTitle = searchData.query.search[0].title;
			const pageId = searchData.query.search[0].pageid;
			
			// Get page extract
			const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*`;
			
			const extractResponse = await fetch(extractUrl);
			const extractData = await extractResponse.json();
			
			const extract = extractData.query.pages[pageId].extract;
			
			// Format the content
			const paragraphs = extract.split('\n').filter(p => p.trim().length > 0);
			let content = '<h4>📖 From Wikipedia</h4>';
			
			paragraphs.slice(0, 2).forEach(para => {
				content += `<p>${para}</p>`;
			});
			
			content += `<p class="history-intro"><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank" style="color: #ffd700; text-decoration: underline;">Read more on Wikipedia →</a></p>`;
			
			return content;
			
		} catch (error) {
			console.warn('Wikipedia fetch failed:', error);
			return `
				<h4>🏐 Volleyball Information</h4>
				<p>${countryName} has volleyball teams competing at various international levels.</p>
				<p>For more detailed information, visit the official FIVB website or search for "${countryName} volleyball" online.</p>
			`;
		}
	}
	
	/**
	 * Show/hide loading indicator
	 */
	function showLoading(show) {
		// Could add a loading spinner here
		console.log(show ? 'Loading...' : 'Loaded');
	}
	
	/**
	 * Show error message
	 */
	function showError(message) {
		console.error(message);
		// Could show toast notification here
		alert(message);
	}
	
	// Start application when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
