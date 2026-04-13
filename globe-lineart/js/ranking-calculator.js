(function() {
	const RESULT_MAP = [
		{ key: '3-0', label: 'A wins 3-0', rA: 2, rB: -2 },
		{ key: '3-1', label: 'A wins 3-1', rA: 1.5, rB: -1.5 },
		{ key: '3-2', label: 'A wins 3-2', rA: 1, rB: -1 },
		{ key: '2-3', label: 'B wins 3-2', rA: -1, rB: 1 },
		{ key: '1-3', label: 'B wins 3-1', rA: -1.5, rB: 1.5 },
		{ key: '0-3', label: 'B wins 3-0', rA: -2, rB: 2 }
	];

	const CUT_POINTS = [-1.06, -0.394, 0, 0.394, 1.06];
	const TOURNAMENT_WEIGHTS = {
		vnl: 40,
		olympics: 50,
		worldcup: 50,
		continental: 40,
		'annual-continental': 30,
		'annual-zonal': 20
	};

	const state = {
		gender: 'women',
		tournament: 'vnl',
		rankings: [],
		selectedOutcomeKey: '3-0',
		matchups: [],
		matchupResults: [],
		extraMatchesCount: 0,
		hasCalculated: false,
		teamAName: '',
		teamBName: ''
	};

	const els = {
		meta: document.getElementById('calcMeta'),
		gender: document.getElementById('genderSelect'),
		tournament: document.getElementById('tournamentSelect'),
		customKWrap: document.getElementById('customKWrap'),
		customKInput: document.getElementById('customKInput'),
		teamA: document.getElementById('teamASelect'),
		teamB: document.getElementById('teamBSelect'),
		outcomeSelect: document.getElementById('outcomeSelect'),
		calculateBtn: document.getElementById('calculateBtn'),
		teamAFlagStage: document.getElementById('teamAFlagStage'),
		teamAResultStage: document.getElementById('teamAResultStage'),
		teamBFlagStage: document.getElementById('teamBFlagStage'),
		teamBResultStage: document.getElementById('teamBResultStage'),
		rankingStage: document.getElementById('rankingStage'),
		selectedOutcomeLabel: document.getElementById('selectedOutcomeLabel'),
		cardsRow: document.getElementById('cardsRow'),
		resultDisclaimer: document.getElementById('resultDisclaimer'),
		extraMatchCards: document.getElementById('extraMatchCards'),
		extraMatches: document.getElementById('extraMatches'),
		addMatchBtn: document.getElementById('addMatchBtn'),
		howHelp: document.getElementById('howHelp'),
		howHelpBtn: document.getElementById('howHelpBtn'),
		toRankings: document.getElementById('toRankings'),
		toGlobe: document.getElementById('toGlobe')
	};

	function updateCalculateVisibility() {
		if (!els.calculateBtn) return;
		els.calculateBtn.classList.add('hidden');
	}

	function parseParams() {
		const params = new URLSearchParams(window.location.search);
		const gender = params.get('gender');
		const tournament = params.get('tournament');

		state.gender = gender === 'men' ? 'men' : 'women';
		if (TOURNAMENT_WEIGHTS[tournament]) {
			state.tournament = tournament;
		} else {
			state.tournament = 'vnl';
		}
	}

	function updateContextLinks() {
		const params = new URLSearchParams();
		params.set('gender', state.gender);
		if (state.tournament) params.set('tournament', state.tournament);
		if (els.toRankings) els.toRankings.href = `rankings.html?${params.toString()}`;
		if (els.toGlobe) els.toGlobe.href = `index.html?${params.toString()}`;
	}

	function populateOutcomeOptions() {
		if (!els.outcomeSelect) return;
		els.outcomeSelect.innerHTML = RESULT_MAP.map(item => (
			`<option value="${item.key}">${item.key}</option>`
		)).join('');
		els.outcomeSelect.value = state.selectedOutcomeKey;
	}

	function describeOutcome(outcomeKey, teamAName, teamBName) {
		const a = String(teamAName || 'Team A');
		const b = String(teamBName || 'Team B');
		switch (outcomeKey) {
			case '3-0': return `${a} def. ${b} 3-0`;
			case '3-1': return `${a} def. ${b} 3-1`;
			case '3-2': return `${a} def. ${b} 3-2`;
			case '2-3': return `${b} def. ${a} 3-2`;
			case '1-3': return `${b} def. ${a} 3-1`;
			case '0-3': return `${b} def. ${a} 3-0`;
			default: return 'Match result';
		}
	}

	function describeMatchByIndex(idxA, idxB, outcomeKey) {
		const a = state.rankings[idxA]?.federationName || 'Team A';
		const b = state.rankings[idxB]?.federationName || 'Team B';
		return describeOutcome(outcomeKey, a, b);
	}

	function renderExtraMatchCards(matchDetails) {
		if (!els.extraMatchCards) return;
		const extras = (Array.isArray(matchDetails) ? matchDetails : []).filter(item => item.order > 1);
		if (!extras.length) {
			els.extraMatchCards.innerHTML = '';
			els.extraMatchCards.classList.add('hidden');
			return;
		}

		const markup = extras.map((detail) => {
			const displayMatchNumber = detail.order;
			const teamA = state.rankings[detail.idxA];
			const teamB = state.rankings[detail.idxB];
			if (!teamA || !teamB) return '';
			const deltaAClass = deltaClass(detail.deltaA);
			const deltaBClass = deltaClass(detail.deltaB);
			const deltaAText = `${detail.deltaA >= 0 ? '+' : ''}${detail.deltaA.toFixed(3)} pts`;
			const deltaBText = `${detail.deltaB >= 0 ? '+' : ''}${detail.deltaB.toFixed(3)} pts`;

			return `
				<section class="extra-match-block" aria-label="Match ${displayMatchNumber}">
					<div class="extra-match-head">
						<p class="extra-match-title">Match ${displayMatchNumber}</p>
					</div>
					<div class="extra-match-grid">
						<article class="team-panel">
							<div class="stage-card flag-stage">
								${flagMarkup(teamA)}
								<div>
									<div class="flag-team-name">${escapeHtml(teamA.federationName)}</div>
									<div class="flag-team-meta">Current Rank #${Number(teamA.rank)}</div>
								</div>
							</div>
							<div class="stage-card result-stage">
								<p class="result-title">Result</p>
								<p class="result-delta ${deltaAClass}">● ${deltaAText}</p>
							</div>
						</article>
						<div class="vs-column extra-vs-column">
							<div class="vs-badge">VS</div>
						</div>
						<article class="team-panel">
							<div class="stage-card flag-stage">
								${flagMarkup(teamB)}
								<div>
									<div class="flag-team-name">${escapeHtml(teamB.federationName)}</div>
									<div class="flag-team-meta">Current Rank #${Number(teamB.rank)}</div>
								</div>
							</div>
							<div class="stage-card result-stage">
								<p class="result-title">Result</p>
								<p class="result-delta ${deltaBClass}">● ${deltaBText}</p>
							</div>
						</article>
					</div>
				</section>
			`;
		}).join('');

		els.extraMatchCards.innerHTML = markup;
		els.extraMatchCards.classList.remove('hidden');
	}

	function refreshOutcomeSelectLabels(teamAName, teamBName) {
		if (!els.outcomeSelect) return;
		const selectedValue = String(els.outcomeSelect.value || state.selectedOutcomeKey);
		els.outcomeSelect.innerHTML = RESULT_MAP.map(item => (
			`<option value="${item.key}">${item.key}</option>`
		)).join('');
		els.outcomeSelect.value = selectedValue;
	}

	function round2(value) {
		return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
	}

	function round3(value) {
		return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
	}

	function erf(x) {
		const sign = x < 0 ? -1 : 1;
		const absX = Math.abs(x);
		const a1 = 0.254829592;
		const a2 = -0.284496736;
		const a3 = 1.421413741;
		const a4 = -1.453152027;
		const a5 = 1.061405429;
		const p = 0.3275911;
		const t = 1 / (1 + p * absX);
		const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
		return sign * y;
	}

	function normalCdf(z) {
		return 0.5 * (1 + erf(z / Math.sqrt(2)));
	}

	function getExpectedModel(scoreA, scoreB) {
		const delta = 8 * ((scoreA - scoreB) / 1000);
		const p1 = normalCdf(CUT_POINTS[0] + delta);
		const p2 = normalCdf(CUT_POINTS[1] + delta) - normalCdf(CUT_POINTS[0] + delta);
		const p3 = normalCdf(CUT_POINTS[2] + delta) - normalCdf(CUT_POINTS[1] + delta);
		const p4 = normalCdf(CUT_POINTS[3] + delta) - normalCdf(CUT_POINTS[2] + delta);
		const p5 = normalCdf(CUT_POINTS[4] + delta) - normalCdf(CUT_POINTS[3] + delta);
		const p6 = 1 - normalCdf(CUT_POINTS[4] + delta);
		const expected = (2 * p1) + (1.5 * p2) + (1 * p3) + (-1 * p4) + (-1.5 * p5) + (-2 * p6);

		return {
			delta,
			probabilities: [p1, p2, p3, p4, p5, p6],
			expected
		};
	}

	function computeDelta(rawDelta, didWin) {
		if (didWin && rawDelta < 0) return 0.01;
		if (!didWin && rawDelta > 0) return -0.01;
		if (rawDelta === 0) return didWin ? 0.01 : -0.01;
		return rawDelta;
	}

	function getWeight() {
		if (state.tournament === 'custom') {
			const custom = Number(els.customKInput.value);
			return Number.isFinite(custom) && custom > 0 ? custom : 40;
		}
		return TOURNAMENT_WEIGHTS[state.tournament] || 40;
	}

	function byProjectedRankWithPoints(rankings, indexA, indexB, pointsA, pointsB) {
		const list = rankings.map((team, idx) => ({
			idx,
			name: team.federationName,
			points: idx === indexA ? pointsA : (idx === indexB ? pointsB : Number(team.points || 0))
		}));

		list.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			return String(a.name || '').localeCompare(String(b.name || ''));
		});

		const rankMap = new Map();
		list.forEach((team, i) => rankMap.set(team.idx, i + 1));
		return rankMap;
	}

	function getProjectedStandings(rankings, indexA, indexB, pointsA, pointsB, limit = 12) {
		const list = rankings.map((team, idx) => ({
			idx,
			name: team.federationName,
			points: idx === indexA ? pointsA : (idx === indexB ? pointsB : Number(team.points || 0))
		}));

		list.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			return String(a.name || '').localeCompare(String(b.name || ''));
		});

		const rankMap = new Map();
		list.forEach((team, i) => rankMap.set(team.idx, i + 1));

		return {
			rankMap,
			top: list.slice(0, limit).map((item, i) => ({
				rank: i + 1,
				name: item.name,
				points: item.points,
				idx: item.idx
			}))
		};
	}

	function getProjectedStandingsFromPoints(rankings, pointsByIdx, limit = 12) {
		const list = rankings.map((team, idx) => ({
			idx,
			name: team.federationName,
			points: Number(pointsByIdx[idx] ?? team.points ?? 0)
		}));

		list.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			return String(a.name || '').localeCompare(String(b.name || ''));
		});

		const rankMap = new Map();
		list.forEach((team, i) => rankMap.set(team.idx, i + 1));

		return {
			rankMap,
			top: list.slice(0, limit).map((item, i) => ({
				rank: i + 1,
				name: item.name,
				points: item.points,
				idx: item.idx
			}))
		};
	}

	function escapeHtml(value) {
		return String(value ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function flagMarkup(team) {
		const code = String(team?.federationCode || '').toLowerCase();
		const apiFlag = String(team?.flagUrl || '').trim();
		const fallback = code ? `https://flagcdn.com/w80/${code}.png` : '';
		const src = apiFlag || fallback;
		if (!src) return '<div class="flag"></div>';
		const failover = apiFlag && fallback ? ` onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';"` : '';
		return `<img class="flag" src="${escapeHtml(src)}" alt="" loading="lazy"${failover}>`;
	}

	function setMetaLine(weight) {
		const labelGender = state.gender === 'women' ? 'Women' : 'Men';
		const tournamentText = els.tournament?.selectedOptions?.[0]?.textContent || 'Tournament';
		els.meta.textContent = `${labelGender} ranking projection using FIVB current method (${tournamentText}).`;
	}

	function setMatchVisualVisibility(visible) {
		if (els.cardsRow) els.cardsRow.classList.toggle('hidden', !visible);
		if (els.resultDisclaimer) els.resultDisclaimer.classList.toggle('hidden', !visible);
		if (els.selectedOutcomeLabel) {
			if (!visible) {
				els.selectedOutcomeLabel.textContent = '';
				els.selectedOutcomeLabel.classList.add('hidden');
			} else {
				els.selectedOutcomeLabel.classList.remove('hidden');
			}
		}
	}

	function resetCalculatedOutput() {
		state.hasCalculated = false;
		state.matchupResults = [];
		setMatchVisualVisibility(false);
		if (els.teamAFlagStage) els.teamAFlagStage.innerHTML = '';
		if (els.teamBFlagStage) els.teamBFlagStage.innerHTML = '';
		if (els.teamAResultStage) els.teamAResultStage.innerHTML = '';
		if (els.teamBResultStage) els.teamBResultStage.innerHTML = '';
		if (els.extraMatchCards) {
			els.extraMatchCards.innerHTML = '';
			els.extraMatchCards.classList.add('hidden');
		}
		if (els.cardsRow) {
			els.cardsRow.classList.remove('hidden');
		}
		renderAddedMatchups();
	}

	function renderBaselineRankingStage() {
		if (!els.rankingStage || !state.rankings.length) return;
		const projected = getProjectedStandingsFromPoints(
			state.rankings,
			state.rankings.map(team => Number(team.points || 0)),
			state.rankings.length || 200
		);
		renderRankingStage(null, null, projected.top, new Set());
	}

	function deltaClass(delta) {
		if (delta > 0) return 'positive';
		if (delta < 0) return 'negative';
		return 'neutral';
	}

	function renderTeamFlagStage(el, team) {
		if (!el || !team) return;
		el.innerHTML = `
			${flagMarkup(team)}
			<div>
				<div class="flag-team-name">${escapeHtml(team.federationName)}</div>
				<div class="flag-team-meta">Current Rank #${Number(team.rank)}</div>
			</div>
		`;
	}

	function renderTeamResultStage(el, team, nextRank, nextPoints, delta) {
		if (!el || !team) return;
		const arrow = nextRank < Number(team.rank) ? 'up' : (nextRank > Number(team.rank) ? 'down' : 'flat');
		const trend = arrow === 'up' ? '▲' : (arrow === 'down' ? '▼' : '●');
		el.innerHTML = `
			<p class="result-title">Result</p>
			<p class="result-value">#${Number(team.rank)} -> #${nextRank}</p>
			<p class="result-delta ${deltaClass(delta)}">${trend} ${delta >= 0 ? '+' : ''}${delta.toFixed(3)} pts</p>
		`;
	}

	function renderRankingStage(teamA, teamB, projectedTop, focusIdxSet) {
		if (!els.rankingStage) return;
		const nowText = new Date().toLocaleString();
		const topRows = (projectedTop || []).map(row => {
			const currentTeam = state.rankings[row.idx];
			const realPoints = Number(currentTeam?.points || 0);
			const projectedPoints = Number(row.points || 0);
			const change = projectedPoints - realPoints;
			const isFocus = focusIdxSet?.has(row.idx);
			const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
			const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(3)}`;

			return `
				<tr class="ranking-row ${isFocus ? 'is-focus' : ''}">
					<td>${row.rank}</td>
					<td class="trend-country ${changeClass}">${escapeHtml(row.name)}</td>
					<td>${realPoints.toFixed(3)}</td>
					<td class="trend-points ${changeClass}">${projectedPoints.toFixed(3)}</td>
					<td class="change-cell ${changeClass}">${changeText}</td>
				</tr>
			`;
		}).join('');

		els.rankingStage.innerHTML = `
			<div class="ranking-headline">
				<h4>Updated Ranking</h4>
				<p>Last update: ${escapeHtml(nowText)}</p>
			</div>
			<div class="ranking-table-wrap">
				<table class="ranking-table" aria-label="Updated ranking table">
					<thead>
						<tr>
							<th>#</th>
							<th>Country</th>
							<th>Real Point</th>
							<th>Point</th>
							<th>Change</th>
						</tr>
					</thead>
					<tbody>${topRows}</tbody>
				</table>
			</div>
		`;
	}

	function ensureDistinctTeams() {
		if (els.teamA.value !== els.teamB.value) return;
		for (let i = 0; i < els.teamB.options.length; i += 1) {
			const val = els.teamB.options[i].value;
			if (val !== els.teamA.value) {
				els.teamB.value = val;
				break;
			}
		}
	}

	function ensureDistinctPair(selectA, selectB) {
		if (!selectA || !selectB) return;
		if (!selectA.value || !selectB.value) return;
		if (selectA.value !== selectB.value) return;
		for (let i = 0; i < selectB.options.length; i += 1) {
			const val = selectB.options[i].value;
			if (val !== selectA.value) {
				selectB.value = val;
				break;
			}
		}
	}

	function renderAddedMatchups() {
		if (!els.extraMatches) return;
		if (!state.matchups.length) {
			els.extraMatches.innerHTML = '';
			return;
		}

		els.extraMatches.innerHTML = state.matchups.map((match, index) => {
			const matchNum = index + 1;
			const teamA = state.rankings[match.idxA];
			const teamB = state.rankings[match.idxB];
			if (!teamA || !teamB) return '';

			const teamAName = teamA.federationName || 'Team A';
			const teamBName = teamB.federationName || 'Team B';
			const currentRankA = Number(teamA.rank);
			const currentRankB = Number(teamB.rank);

			// Get result card data if calculation has been done
			let resultCard = '';
			if (state.hasCalculated && state.matchupResults && state.matchupResults[index]) {
				const result = state.matchupResults[index];
				const deltaAClass = deltaClass(result.deltaA);
				const deltaBClass = deltaClass(result.deltaB);
				const deltaAText = `${result.deltaA >= 0 ? '+' : ''}${result.deltaA.toFixed(3)} pts`;
				const deltaBText = `${result.deltaB >= 0 ? '+' : ''}${result.deltaB.toFixed(3)} pts`;
				const rankTransitionA = `#${currentRankA} → #${result.rankA}`;
				const rankTransitionB = `#${currentRankB} → #${result.rankB}`;

				resultCard = `
					<section class="extra-match-block" aria-label="Match ${matchNum}">
						<div class="extra-match-grid">
							<article class="team-panel">
								<div class="stage-card flag-stage">
									${flagMarkup(teamA)}
									<div>
										<div class="flag-team-name">${escapeHtml(teamAName)}</div>
										<div class="flag-team-meta">CURRENT RANK #${currentRankA}</div>
									</div>
								</div>
								<div class="stage-card result-stage">
									<p class="result-title">Result</p>
									<p class="result-delta ${deltaAClass}">${rankTransitionA}</p>
									<p class="result-delta ${deltaAClass}">● ${deltaAText}</p>
								</div>
							</article>
							<div class="vs-column extra-vs-column">
								<div class="vs-badge">VS</div>
							</div>
							<article class="team-panel">
								<div class="stage-card flag-stage">
									${flagMarkup(teamB)}
									<div>
										<div class="flag-team-name">${escapeHtml(teamBName)}</div>
										<div class="flag-team-meta">CURRENT RANK #${currentRankB}</div>
									</div>
								</div>
								<div class="stage-card result-stage">
									<p class="result-title">Result</p>
									<p class="result-delta ${deltaBClass}">${rankTransitionB}</p>
									<p class="result-delta ${deltaBClass}">● ${deltaBText}</p>
								</div>
							</article>
						</div>
					</section>
				`;
			}

			return `
				<div class="extra-match-row" data-row-id="${escapeHtml(match.rowId)}">
					<span class="extra-match-index">Match #${matchNum}</span>
					<span class="extra-match-team">${escapeHtml(teamAName)}</span>
					<span class="extra-match-team">${escapeHtml(teamBName)}</span>
					<span class="extra-match-score">${escapeHtml(match.outcomeKey)}</span>
					<button class="extra-match-remove" type="button" aria-label="Remove matchup" data-remove-match="${escapeHtml(match.rowId)}">&times;</button>
				</div>
				${resultCard}
			`;
		}).join('');
	}

	function createExtraMatchRow() {
		const idxA = Number.parseInt(String(els.teamA?.value ?? ''), 10);
		const idxB = Number.parseInt(String(els.teamB?.value ?? ''), 10);
		const outcomeKey = String(els.outcomeSelect?.value || state.selectedOutcomeKey || '3-0');

		if (!Number.isInteger(idxA) || !Number.isInteger(idxB) || idxA === idxB) {
			if (els.selectedOutcomeLabel) {
				els.selectedOutcomeLabel.textContent = 'Select two different teams first.';
			}
			return;
		}

		state.extraMatchesCount += 1;
		state.matchups.push({
			idxA,
			idxB,
			outcomeKey,
			rowId: `match-${state.extraMatchesCount}`
		});
		renderAddedMatchups();
		calculate();
	}

	function clearExtraMatchRows() {
		state.matchups = [];
		renderAddedMatchups();
		updateCalculateVisibility();
	}

	function refreshExtraMatchRowOptions() {
		state.matchups = state.matchups.filter(match => (
			Number.isInteger(match.idxA)
			&& Number.isInteger(match.idxB)
			&& match.idxA >= 0
			&& match.idxB >= 0
			&& match.idxA < state.rankings.length
			&& match.idxB < state.rankings.length
			&& match.idxA !== match.idxB
			&& RESULT_MAP.some(result => result.key === match.outcomeKey)
		));
		renderAddedMatchups();
		updateCalculateVisibility();
	}

	function getAllMatches() {
		return state.matchups.map(match => ({
			idxA: match.idxA,
			idxB: match.idxB,
			outcomeKey: match.outcomeKey,
			isPrimary: false,
			rowId: match.rowId
		}));
	}

	function renderTeamOptions() {
		const options = state.rankings.map((team, idx) => {
			const rank = Number(team.rank) || idx + 1;
			const label = `#${rank} ${team.federationName}`;
			return `<option value="${idx}">${escapeHtml(label)}</option>`;
		}).join('');

		els.teamA.innerHTML = options;
		els.teamB.innerHTML = options;

		if (state.rankings.length > 1) {
			els.teamA.value = '0';
			els.teamB.value = '1';
		}

		refreshExtraMatchRowOptions();
	}

	function getSelectedTeams() {
		const idxA = Number(els.teamA.value);
		const idxB = Number(els.teamB.value);
		if (!Number.isInteger(idxA) || !Number.isInteger(idxB)) return null;
		if (idxA === idxB) return null;
		const teamA = state.rankings[idxA];
		const teamB = state.rankings[idxB];
		if (!teamA || !teamB) return null;
		return { teamA, teamB, idxA, idxB };
	}

	function calculate() {
		const matches = getAllMatches();
		if (!matches.length) {
			resetCalculatedOutput();
			renderBaselineRankingStage();
			if (els.selectedOutcomeLabel) {
				els.selectedOutcomeLabel.textContent = 'Add at least one matchup to calculate.';
			}
			return;
		}

		const latestMatch = matches[matches.length - 1];
		const latestTeamA = state.rankings[latestMatch.idxA];
		const latestTeamB = state.rankings[latestMatch.idxB];
		if (!latestTeamA || !latestTeamB) return;

		state.hasCalculated = true;
		setMatchVisualVisibility(true);
		refreshOutcomeSelectLabels(latestTeamA?.federationName, latestTeamB?.federationName);
		const weight = getWeight();

		setMetaLine(weight);

		const pointsByIdx = state.rankings.map(team => Number(team.points || 0));
		const matchDetails = [];
		let latestMatchProjection = null;
		let projectedTopForLatestMatch = [];

		for (let i = 0; i < matches.length; i += 1) {
			const match = matches[i];
			if (!Number.isInteger(match.idxA) || !Number.isInteger(match.idxB)) continue;
			if (match.idxA < 0 || match.idxB < 0 || match.idxA >= state.rankings.length || match.idxB >= state.rankings.length) continue;
			if (match.idxA === match.idxB) continue;
			const result = RESULT_MAP.find(item => item.key === match.outcomeKey);
			if (!result) continue;

			const teamAName = state.rankings[match.idxA]?.federationName || 'Team A';
			const teamBName = state.rankings[match.idxB]?.federationName || 'Team B';
			const resultLabel = describeOutcome(match.outcomeKey, teamAName, teamBName);

			// Cumulative calculation: each new match starts from updated points.
			const currentA = Number(pointsByIdx[match.idxA] || 0);
			const currentB = Number(pointsByIdx[match.idxB] || 0);
			const model = getExpectedModel(currentA, currentB);
			const rawDeltaA = (weight * (result.rA - model.expected)) / 8;
			const didAWin = result.rA > 0;
			const deltaA = round3(computeDelta(rawDeltaA, didAWin));
			const deltaB = round3(-deltaA);
			const projectedPointsA = round3(currentA + deltaA);
			const projectedPointsB = round3(currentB + deltaB);

			pointsByIdx[match.idxA] = projectedPointsA;
			pointsByIdx[match.idxB] = projectedPointsB;

			const projectedSnapshot = getProjectedStandingsFromPoints(
				state.rankings,
				pointsByIdx,
				state.rankings.length || 200
			);
			const projectedRankMap = projectedSnapshot.rankMap;
			projectedTopForLatestMatch = projectedSnapshot.top;

			latestMatchProjection = {
				idxA: match.idxA,
				idxB: match.idxB,
				outcomeKey: match.outcomeKey,
				displayLabel: resultLabel,
				rankA: projectedRankMap.get(match.idxA),
				rankB: projectedRankMap.get(match.idxB),
				pointsA: projectedPointsA,
				pointsB: projectedPointsB,
				deltaA,
				deltaB
			};

			matchDetails.push({
				order: i + 1,
				rowId: match.rowId,
				idxA: match.idxA,
				idxB: match.idxB,
				teamA: teamAName,
				teamB: teamBName,
				result: resultLabel,
				rankA: projectedRankMap.get(match.idxA),
				rankB: projectedRankMap.get(match.idxB),
				pointsA: projectedPointsA,
				pointsB: projectedPointsB,
				deltaA,
				deltaB
			});
		}

		if (!latestMatchProjection) return;

		const selectedOutcome = {
			key: latestMatchProjection.outcomeKey,
			displayLabel: latestMatchProjection.displayLabel,
			rankA: latestMatchProjection.rankA,
			rankB: latestMatchProjection.rankB,
			pointsA: latestMatchProjection.pointsA,
			pointsB: latestMatchProjection.pointsB,
			deltaA: latestMatchProjection.deltaA,
			deltaB: latestMatchProjection.deltaB,
			primaryDeltaA: latestMatchProjection.deltaA,
			primaryDeltaB: latestMatchProjection.deltaB,
			projectedTop: projectedTopForLatestMatch
		};

		state.selectedOutcomeKey = String(selectedOutcome.key || '3-0');
		if (els.outcomeSelect) {
			els.outcomeSelect.value = state.selectedOutcomeKey;
		}

		state.teamAName = latestTeamA.federationName;
		state.teamBName = latestTeamB.federationName;

		// Hide the old main cards area - use unified extraMatches template for all
		if (els.cardsRow) {
			els.cardsRow.classList.add('hidden');
		}
		if (els.selectedOutcomeLabel) {
			els.selectedOutcomeLabel.textContent = selectedOutcome.displayLabel;
		}
		state.matchupResults = matchDetails;
		renderAddedMatchups();
		const focusIdxSet = new Set(matches.flatMap(match => [match.idxA, match.idxB]));
		renderRankingStage(latestTeamA, latestTeamB, selectedOutcome.projectedTop, focusIdxSet);
	}

	async function loadRankings() {
		try {
			state.rankings = await RankingFetcher.fetchCurrentRankings(state.gender);
			state.matchups = [];
			state.extraMatchesCount = 0;
			renderAddedMatchups();
			updateCalculateVisibility();
			renderTeamOptions();
			setMetaLine(getWeight());
			if (!state.hasCalculated) {
				setMatchVisualVisibility(false);
				renderBaselineRankingStage();
			} else {
				calculate();
			}
		} catch (error) {
			if (els.selectedOutcomeLabel) {
				els.selectedOutcomeLabel.textContent = `Failed to load rankings: ${escapeHtml(error?.message || 'unknown error')}`;
			}
		}
	}

	function syncFromControls() {
		state.gender = els.gender.value === 'men' ? 'men' : 'women';
		state.tournament = els.tournament.value;
		const custom = state.tournament === 'custom';
		els.customKWrap.classList.toggle('hidden', !custom);
		updateContextLinks();
	}

	function setupEvents() {
		els.gender.addEventListener('change', async () => {
			syncFromControls();
			state.hasCalculated = false;
			await loadRankings();
		});

		els.tournament.addEventListener('change', () => {
			syncFromControls();
			if (state.hasCalculated) {
				calculate();
			} else {
				setMetaLine(getWeight());
				renderBaselineRankingStage();
			}
		});

		els.customKInput.addEventListener('input', () => {
			if (state.tournament !== 'custom') return;
			if (state.hasCalculated) {
				calculate();
			} else {
				setMetaLine(getWeight());
				renderBaselineRankingStage();
			}
		});

		if (els.outcomeSelect) {
			els.outcomeSelect.addEventListener('change', () => {
				state.selectedOutcomeKey = String(els.outcomeSelect.value || '3-0');
				if (state.hasCalculated) calculate();
			});
		}

		els.teamA.addEventListener('change', () => {
			if (state.hasCalculated) calculate();
		});
		els.teamB.addEventListener('change', () => {
			if (state.hasCalculated) calculate();
		});
		els.calculateBtn.addEventListener('click', calculate);

		if (els.addMatchBtn) {
			els.addMatchBtn.addEventListener('click', () => {
				createExtraMatchRow();
				calculate();
			});
		}

		if (els.extraMatches) {
			els.extraMatches.addEventListener('click', (event) => {
				const button = event.target.closest('[data-remove-match]');
				if (!button) return;
				const rowId = String(button.getAttribute('data-remove-match') || '');
				if (!rowId) return;
				state.matchups = state.matchups.filter(match => match.rowId !== rowId);
				renderAddedMatchups();
				updateCalculateVisibility();
				if (state.matchups.length) {
					calculate();
				} else {
					resetCalculatedOutput();
					renderBaselineRankingStage();
				}
			});
		}

		if (els.extraMatchCards) {
			els.extraMatchCards.addEventListener('click', (event) => {
				const button = event.target.closest('[data-clear-extra-row]');
				if (!button) return;
				const rowId = String(button.getAttribute('data-clear-extra-row') || '');
				if (!rowId || !els.extraMatches) return;
				const row = els.extraMatches.querySelector(`.extra-match-row[data-row-id="${rowId}"]`);
				if (!row) return;
				row.remove();
				calculate();
			});
		}

		window.addEventListener('pageshow', (event) => {
			if (!event.persisted) return;
			resetCalculatedOutput();
			renderBaselineRankingStage();
		});

		if (els.howHelpBtn && els.howHelp) {
			els.howHelpBtn.addEventListener('click', (event) => {
				event.stopPropagation();
				els.howHelp.classList.toggle('open');
				const pop = document.getElementById('howHelpPopover');
				if (pop) {
					pop.setAttribute('aria-hidden', els.howHelp.classList.contains('open') ? 'false' : 'true');
				}
			});

			document.addEventListener('click', (event) => {
				if (!els.howHelp.contains(event.target)) {
					els.howHelp.classList.remove('open');
					const pop = document.getElementById('howHelpPopover');
					if (pop) pop.setAttribute('aria-hidden', 'true');
				}
			});
		}

	}

	async function init() {
		parseParams();
		populateOutcomeOptions();
		updateCalculateVisibility();
		resetCalculatedOutput();
		els.gender.value = state.gender;
		els.tournament.value = state.tournament;
		if (els.outcomeSelect) {
			els.outcomeSelect.value = state.selectedOutcomeKey;
		}
		syncFromControls();
		setupEvents();
		await loadRankings();
	}

	void init();
})();
