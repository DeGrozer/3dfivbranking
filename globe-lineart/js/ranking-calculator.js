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
		clearMatchesBtn: document.getElementById('clearMatchesBtn'),
		howHelp: document.getElementById('howHelp'),
		howHelpBtn: document.getElementById('howHelpBtn'),
		toRankings: document.getElementById('toRankings'),
		toGlobe: document.getElementById('toGlobe')
	};

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

		const markup = extras.map((detail, extraIdx) => {
			const displayMatchNumber = extraIdx + 1;
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
						<button class="tiny-btn ghost extra-match-clear" type="button" data-clear-extra-row="${escapeHtml(detail.rowId || '')}">Clear</button>
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
		setMatchVisualVisibility(false);
		if (els.teamAFlagStage) els.teamAFlagStage.innerHTML = '';
		if (els.teamBFlagStage) els.teamBFlagStage.innerHTML = '';
		if (els.teamAResultStage) els.teamAResultStage.innerHTML = '';
		if (els.teamBResultStage) els.teamBResultStage.innerHTML = '';
		if (els.extraMatchCards) {
			els.extraMatchCards.innerHTML = '';
			els.extraMatchCards.classList.add('hidden');
		}
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

	function extraOutcomeOptionsMarkup() {
		return RESULT_MAP.map(item => `<option value="${item.key}">${item.key}</option>`).join('');
	}

	function extraTeamOptionsMarkup() {
		const teamOptions = (els.teamA?.innerHTML || '');
		return `<option value="" selected>Team</option>${teamOptions}`;
	}

	function extraOutcomeSelectMarkup() {
		return `<option value="" selected>Score</option>${extraOutcomeOptionsMarkup()}`;
	}

	function createExtraMatchRow() {
		if (!els.extraMatches) return;
		state.extraMatchesCount += 1;
		const rowId = `extra-match-${state.extraMatchesCount}`;
		const teamOptions = extraTeamOptionsMarkup();

		const row = document.createElement('div');
		row.className = 'extra-match-row';
		row.dataset.rowId = rowId;
		row.innerHTML = `
			<select class="extra-team-a">${teamOptions}</select>
			<select class="extra-team-b">${teamOptions}</select>
			<select class="extra-outcome">${extraOutcomeSelectMarkup()}</select>
			<button class="tiny-btn remove" type="button">Remove</button>
		`;

		const selectA = row.querySelector('.extra-team-a');
		const selectB = row.querySelector('.extra-team-b');
		const selectOutcome = row.querySelector('.extra-outcome');

		ensureDistinctPair(selectA, selectB);

		if (selectA) selectA.addEventListener('change', () => {
			ensureDistinctPair(selectA, selectB);
			if (state.hasCalculated) calculate();
		});
		if (selectB) selectB.addEventListener('change', () => {
			ensureDistinctPair(selectA, selectB);
			if (state.hasCalculated) calculate();
		});
		if (selectOutcome) selectOutcome.addEventListener('change', () => {
			if (state.hasCalculated) calculate();
		});

		const removeBtn = row.querySelector('.remove');
		if (removeBtn) {
			removeBtn.addEventListener('click', () => {
				row.remove();
				calculate();
			});
		}

		els.extraMatches.appendChild(row);
	}

	function clearExtraMatchRows() {
		if (!els.extraMatches) return;
		els.extraMatches.innerHTML = '';
	}

	function refreshExtraMatchRowOptions() {
		if (!els.extraMatches) return;
		const teamOptions = extraTeamOptionsMarkup();
		const outcomeOptions = extraOutcomeSelectMarkup();
		const rows = Array.from(els.extraMatches.querySelectorAll('.extra-match-row'));
		rows.forEach(row => {
			const selectA = row.querySelector('.extra-team-a');
			const selectB = row.querySelector('.extra-team-b');
			const selectOutcome = row.querySelector('.extra-outcome');
			const prevA = selectA?.value;
			const prevB = selectB?.value;
			const prevOutcome = selectOutcome?.value;

			if (selectA) {
				selectA.innerHTML = teamOptions;
				if (prevA != null) selectA.value = prevA;
				if (!selectA.value) selectA.value = '';
			}
			if (selectB) {
				selectB.innerHTML = teamOptions;
				if (prevB != null) selectB.value = prevB;
				if (!selectB.value) selectB.value = '';
			}
			if (selectOutcome) {
				selectOutcome.innerHTML = outcomeOptions;
				if (prevOutcome != null) selectOutcome.value = prevOutcome;
				if (!selectOutcome.value) selectOutcome.value = '';
			}
			ensureDistinctPair(selectA, selectB);
		});
	}

	function getAllMatches() {
		const primaryA = Number(els.teamA.value);
		const primaryB = Number(els.teamB.value);
		const primary = [{
			idxA: primaryA,
			idxB: primaryB,
			outcomeKey: state.selectedOutcomeKey,
			isPrimary: true,
			rowId: 'primary'
		}];

		if (!els.extraMatches) return primary;
		const extra = Array.from(els.extraMatches.querySelectorAll('.extra-match-row')).map(row => {
			const idxA = Number.parseInt(String(row.querySelector('.extra-team-a')?.value ?? ''), 10);
			const idxB = Number.parseInt(String(row.querySelector('.extra-team-b')?.value ?? ''), 10);
			const outcomeKey = String(row.querySelector('.extra-outcome')?.value || '3-0');
			const rowId = String(row.dataset.rowId || '');
			return { idxA, idxB, outcomeKey, isPrimary: false, rowId };
		});

		return primary.concat(extra);
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
		ensureDistinctTeams();
		const selected = getSelectedTeams();
		if (!selected) {
			if (els.selectedOutcomeLabel) {
				els.selectedOutcomeLabel.textContent = 'Select two different teams.';
			}
			return;
		}

		const { teamA, teamB, idxA, idxB } = selected;
		state.hasCalculated = true;
		setMatchVisualVisibility(true);
		refreshOutcomeSelectLabels(teamA?.federationName, teamB?.federationName);
		const weight = getWeight();

		setMetaLine(weight);

		const pointsByIdx = state.rankings.map(team => Number(team.points || 0));
		const matches = getAllMatches();
		const matchDetails = [];
		let primaryMatchDeltaA = 0;
		let primaryMatchDeltaB = 0;

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

			const currentA = Number(pointsByIdx[match.idxA] || 0);
			const currentB = Number(pointsByIdx[match.idxB] || 0);
			const model = getExpectedModel(currentA, currentB);
			const rawDeltaA = (weight * (result.rA - model.expected)) / 8;
			const didAWin = result.rA > 0;
			const deltaA = round3(computeDelta(rawDeltaA, didAWin));
			const deltaB = round3(-deltaA);

			pointsByIdx[match.idxA] = round3(currentA + deltaA);
			pointsByIdx[match.idxB] = round3(currentB + deltaB);

			matchDetails.push({
				order: i + 1,
				rowId: match.rowId,
				idxA: match.idxA,
				idxB: match.idxB,
				teamA: teamAName,
				teamB: teamBName,
				result: resultLabel,
				deltaA,
				deltaB
			});

			if (match.isPrimary) {
				primaryMatchDeltaA = deltaA;
				primaryMatchDeltaB = deltaB;
			}
		}

		const projected = getProjectedStandingsFromPoints(state.rankings, pointsByIdx, state.rankings.length || 200);
		const selectedOutcome = {
			key: state.selectedOutcomeKey,
			displayLabel: describeOutcome(state.selectedOutcomeKey, teamA.federationName, teamB.federationName),
			rankA: projected.rankMap.get(idxA),
			rankB: projected.rankMap.get(idxB),
			pointsA: Number(pointsByIdx[idxA] || 0),
			pointsB: Number(pointsByIdx[idxB] || 0),
			deltaA: round3(Number(pointsByIdx[idxA] || 0) - Number(teamA.points || 0)),
			deltaB: round3(Number(pointsByIdx[idxB] || 0) - Number(teamB.points || 0)),
			primaryDeltaA: primaryMatchDeltaA,
			primaryDeltaB: primaryMatchDeltaB,
			projectedTop: projected.top
		};

		state.selectedOutcomeKey = String(selectedOutcome.key || '3-0');
		if (els.outcomeSelect) {
			els.outcomeSelect.value = state.selectedOutcomeKey;
		}

		state.teamAName = teamA.federationName;
		state.teamBName = teamB.federationName;

		renderTeamFlagStage(els.teamAFlagStage, teamA);
		renderTeamFlagStage(els.teamBFlagStage, teamB);
		renderTeamResultStage(els.teamAResultStage, teamA, selectedOutcome.rankA, selectedOutcome.pointsA, selectedOutcome.deltaA);
		renderTeamResultStage(els.teamBResultStage, teamB, selectedOutcome.rankB, selectedOutcome.pointsB, selectedOutcome.deltaB);
		if (els.selectedOutcomeLabel) {
			els.selectedOutcomeLabel.textContent = selectedOutcome.displayLabel;
		}
		renderExtraMatchCards(matchDetails);
		renderRankingStage(teamA, teamB, selectedOutcome.projectedTop, new Set([idxA, idxB]));
	}

	async function loadRankings() {
		try {
			state.rankings = await RankingFetcher.fetchCurrentRankings(state.gender);
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

		if (els.clearMatchesBtn) {
			els.clearMatchesBtn.addEventListener('click', () => {
				clearExtraMatchRows();
				resetCalculatedOutput();
				renderBaselineRankingStage();
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
