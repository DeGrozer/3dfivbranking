(function() {
	let currentGender = 'women';
	let currentTournament = '';

	const titleEl = document.getElementById('pageTitle');
	const womenTab = document.getElementById('womenTab');
	const menTab = document.getElementById('menTab');
	const searchEl = document.getElementById('rankSearch');
	const listEl = document.getElementById('rankingsBody');
	const asOfEl = document.getElementById('asOfDate');

	function parseParams() {
		const params = new URLSearchParams(window.location.search);
		const gender = params.get('gender');
		const tournament = params.get('tournament');
		currentGender = gender === 'men' ? 'men' : 'women';
		currentTournament = tournament === 'vnl' ? 'vnl' : '';
	}

	function normalizeTeamName(name) {
		if (!name) return '';
		const normalized = String(name)
			.toLowerCase()
			.trim()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		const aliases = {
			'united states of america': 'united states',
			usa: 'united states',
			'us': 'united states',
			bih: 'bosnia and herzegovina',
			'bosnia and herz': 'bosnia and herzegovina',
			'bosnia and herzeg': 'bosnia and herzegovina',
			turkiye: 'turkey',
			'czech republic': 'czechia',
			'republic of korea': 'korea',
			'south korea': 'korea',
			'korea republic of': 'korea',
			'dominican rep': 'dominican republic'
		};

		return aliases[normalized] || normalized;
	}

	async function getTournamentFilterSet() {
		if (currentTournament !== 'vnl') return null;

		try {
			const snapshot = await RankingFetcher.getVnlSeasonSnapshot(currentGender, { year: new Date().getFullYear() });
			const teams = [
				...(Array.isArray(snapshot?.teams) ? snapshot.teams : []),
				...(Array.isArray(snapshot?.relegatedTeams) ? snapshot.relegatedTeams : [])
			];
			if (!teams.length) return null;

			return new Set(
				teams
					.map(team => normalizeTeamName(team?.federationName || ''))
					.filter(Boolean)
			);
		} catch (error) {
			console.warn('Failed to load VNL filter snapshot:', error);
			return null;
		}
	}

	function escapeHtml(value) {
		return String(value ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function buildFlagMarkup(item) {
		const flagCode = String(item?.teamCode || '').toLowerCase().trim();
		const flagPrimary = String(item?.flagUrl || '').trim();
		const fallback1x = flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : '';
		const fallback2x = flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : '';

		if (!flagPrimary && !fallback1x) {
			const shortCode = escapeHtml(String(item?.teamCode || 'N/A').toUpperCase());
			return `<div class="flag-fallback">${shortCode}</div>`;
		}

		const src = escapeHtml(flagPrimary || fallback1x);
		const srcSet = !flagPrimary && fallback2x
			? ` srcset="${escapeHtml(fallback1x)} 1x, ${escapeHtml(fallback2x)} 2x"`
			: '';
		const onError = flagPrimary && fallback1x
			? ` onerror="this.onerror=null;this.src='${escapeHtml(fallback1x)}';"`
			: '';

		return `<img class="country-flag" src="${src}"${srcSet} alt="" loading="lazy" decoding="async"${onError}>`;
	}

	function updateHeaderState() {
		const isWomen = currentGender === 'women';
		titleEl.textContent = currentTournament === 'vnl'
			? (isWomen ? "Women's VNL Teams" : "Men's VNL Teams")
			: (isWomen ? "Women's World Rankings" : "Men's World Rankings");
		womenTab.classList.toggle('active', isWomen);
		menTab.classList.toggle('active', !isWomen);
		womenTab.setAttribute('aria-selected', String(isWomen));
		menTab.setAttribute('aria-selected', String(!isWomen));
		document.body.classList.toggle('is-vnl-filter', currentTournament === 'vnl');
	}

	function formatAsOfDate(value) {
		const parsed = value ? new Date(value) : new Date();
		if (Number.isNaN(parsed.getTime())) {
			return new Date().toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		}

		return parsed.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	async function updateAsOfDate() {
		if (!asOfEl) return;

		try {
			const genderCode = currentGender === 'women' ? 0 : 1;
			const response = await fetch(`https://en.volleyballworld.com/api/v1/worldranking/volleyball/${genderCode}/0/1`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const payload = await response.json();
			const dateValue = payload?.date || payload?.updatedDate || payload?.teams?.[0]?.updatedDate;
			asOfEl.textContent = `As of: ${formatAsOfDate(dateValue)}`;
		} catch (error) {
			asOfEl.textContent = `As of: ${formatAsOfDate(null)}`;
		}
	}

	function renderRows(rankings) {
		if (!Array.isArray(rankings) || rankings.length === 0) {
			listEl.innerHTML = '<div class="loading-row">No rankings available.</div>';
			return;
		}

		const term = (searchEl.value || '').toLowerCase().trim();
		const rows = rankings
			.filter(item => {
				if (!term) return true;
				const team = String(item.teamName || '').toLowerCase();
				const code = String(item.teamCode || '').toLowerCase();
				const code3 = String(item.teamCode3 || '').toLowerCase();
				return team.includes(term) || code.includes(term) || code3.includes(term);
			})
			.map(item => {
				const rank = Number.isFinite(Number(item.rank)) ? Number(item.rank) : '-';
				const medalClass = rank === 1
					? ' rank-item-gold'
					: (currentTournament && rank === 2)
						? ' rank-item-silver'
						: (currentTournament && rank === 3)
							? ' rank-item-bronze'
							: '';
				const team = item.teamName || 'Unknown';
				const teamEsc = escapeHtml(team);
				const codeRaw = String(item.teamCode3 || '').toUpperCase().trim();
				const codeFallback = String(team).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
				const code = escapeHtml(codeRaw || codeFallback || '---');
				const points = Number.isFinite(item.wrs) ? item.wrs.toFixed(2) : '—';

				return `
					<div class="rank-item${medalClass}">
						<div class="rank-row">
							<div class="rank-cell">
								<span class="rank-no">${rank}</span>
							</div>
							<div class="country-cell">
								<div class="flag-wrap">${buildFlagMarkup(item)}</div>
								<div class="country-meta">
									<div class="country-name">${teamEsc}</div>
									<div class="country-code">${code}</div>
								</div>
							</div>
							<div class="points-val">${points}</div>
						</div>
					</div>
				`;
			})
			.join('');

		listEl.innerHTML = rows || '<div class="loading-row">No countries matched your search.</div>';
	}

	async function loadRankings() {
		listEl.innerHTML = '<div class="loading-row">Loading rankings...</div>';
		try {
			await updateAsOfDate();
			const [rankings, tournamentFilter] = await Promise.all([
				RankingFetcher.getAllRankings(currentGender),
				getTournamentFilterSet()
			]);

			const filteredRankings = tournamentFilter
				? rankings.filter(item => tournamentFilter.has(normalizeTeamName(item.teamName || '')))
				: rankings;

			renderRows(filteredRankings);
			searchEl.oninput = () => renderRows(filteredRankings);
		} catch (error) {
			console.error('Failed to load rankings:', error);
			await updateAsOfDate();
			listEl.innerHTML = '<div class="loading-row">Failed to load rankings.</div>';
		}
	}

	async function switchGender(gender) {
		if (currentGender === gender) return;
		currentGender = gender;
		updateHeaderState();
		await loadRankings();
		const params = new URLSearchParams(window.location.search);
		params.set('gender', currentGender);
		if (currentTournament) {
			params.set('tournament', currentTournament);
		} else {
			params.delete('tournament');
		}
		history.replaceState({}, '', `rankings.html?${params.toString()}`);
	}

	async function init() {
		parseParams();
		updateHeaderState();
		womenTab.addEventListener('click', () => void switchGender('women'));
		menTab.addEventListener('click', () => void switchGender('men'));
		await loadRankings();
	}

	void init();
})();
