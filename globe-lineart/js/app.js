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
	let activeTournamentCountry = '';
	let activeTournamentType = '';
	let startupAnimationCleanup = null;
	let vnlStatusPopupAnimationCleanup = null;
	let vnlCardPreviewTimer = null;
	let lastSelectedCountryContext = null;
	let tournamentButtonSceneCleanup = null;

	function isMobileViewport() {
		return window.matchMedia('(max-width: 768px)').matches;
	}

	function applyMobileCountryLayout(isOpen) {
		document.body.classList.toggle('country-card-open', !!isOpen);
		document.body.classList.toggle('mobile-country-open', isMobileViewport() && isOpen);
	}

	function isVnlTournamentMode(type = activeTournamentType) {
		return type === 'vnl';
	}

	function disposeVnlStatusPopupAnimation() {
		if (typeof vnlStatusPopupAnimationCleanup === 'function') {
			vnlStatusPopupAnimationCleanup();
		}
		vnlStatusPopupAnimationCleanup = null;
	}

	function clearVnlCardPreviewTimer() {
		if (vnlCardPreviewTimer) {
			clearTimeout(vnlCardPreviewTimer);
			vnlCardPreviewTimer = null;
		}
	}

	function stopVnlPreviewAnimations(card) {
		if (!card) return;
		card.classList.remove(
			'vnl-body-led-newcomer',
			'vnl-body-led-relegated',
			'vnl-body-led-champion'
		);

		const topLed = card.querySelector('.card-top-vnl-led');
		if (topLed) {
			topLed.classList.add('is-static');
		}
	}

	function scheduleVnlPreviewReset(card, vnlStatus) {
		clearVnlCardPreviewTimer();
		if (!card || !vnlStatus || !isVnlTournamentMode()) return;
		card.classList.remove('vnl-preview-static');

		const topLed = card.querySelector('.card-top-vnl-led');
		if (topLed) {
			topLed.classList.remove('is-static');
		}

		const isPreviewStatus = (
			vnlStatus.status === 'newcomer' ||
			vnlStatus.status === 'relegated' ||
			(vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated')
		);
		if (!isPreviewStatus) return;

		vnlCardPreviewTimer = setTimeout(() => {
			if (!card.classList.contains('show')) return;
			card.classList.add('vnl-preview-static');
			stopVnlPreviewAnimations(card);
			vnlCardPreviewTimer = null;
		}, 3000);
	}

	function createThreeVolleyballAnimation(canvas, options = {}) {
		if (typeof THREE === 'undefined' || !canvas) return null;

		const mode = String(options.mode || 'default').toLowerCase();
		const spinSpeed = Number.isFinite(options.spinSpeed) ? options.spinSpeed : 0.018;
		const seamColor = Number.isFinite(options.seamColor) ? options.seamColor : 0x1f4aa8;
		const ballColor = Number.isFinite(options.ballColor) ? options.ballColor : 0xf8fafc;
		const accentColor = Number.isFinite(options.accentColor) ? options.accentColor : 0xfacc15;

		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
		camera.position.set(0, 0, 4.2);

		const root = new THREE.Group();
		scene.add(root);
		const effectsGroup = new THREE.Group();
		scene.add(effectsGroup);

		const sphereGeometry = new THREE.SphereGeometry(1, 40, 40);
		const sphereMaterial = new THREE.MeshStandardMaterial({
			color: ballColor,
			roughness: 0.42,
			metalness: 0.08
		});
		const ball = new THREE.Mesh(sphereGeometry, sphereMaterial);
		root.add(ball);

		const seamMaterial = new THREE.MeshStandardMaterial({
			color: seamColor,
			roughness: 0.38,
			metalness: 0.04
		});
		const seamGeometryA = new THREE.TorusGeometry(1.03, 0.05, 16, 120);
		const seamGeometryB = new THREE.TorusGeometry(1.03, 0.05, 16, 120);
		const seamGeometryC = new THREE.TorusGeometry(1.03, 0.05, 16, 120);

		const seamA = new THREE.Mesh(seamGeometryA, seamMaterial);
		seamA.rotation.x = Math.PI / 2;
		root.add(seamA);

		const seamB = new THREE.Mesh(seamGeometryB, seamMaterial);
		seamB.rotation.y = Math.PI / 2.25;
		root.add(seamB);

		const seamC = new THREE.Mesh(seamGeometryC, seamMaterial);
		seamC.rotation.z = Math.PI / 2.35;
		root.add(seamC);

		let pulseRing = null;
		let pulseRingGeometry = null;
		let pulseRingMaterial = null;
		let directionArrow = null;
		let directionArrowBodyGeometry = null;
		let directionArrowHeadGeometry = null;
		let directionArrowMaterial = null;
		let championHalo = null;
		let championHaloGeometry = null;
		let championHaloMaterial = null;
		let loadingShadow = null;
		let loadingShadowGeometry = null;
		let loadingShadowMaterial = null;

		if (mode === 'newcomer' || mode === 'relegated') {
			pulseRingGeometry = new THREE.TorusGeometry(1.28, 0.05, 14, 90);
			pulseRingMaterial = new THREE.MeshStandardMaterial({
				color: accentColor,
				emissive: accentColor,
				emissiveIntensity: 0.05,
				transparent: true,
				opacity: 0.62,
				roughness: 0.38,
				metalness: 0.08
			});
			pulseRing = new THREE.Mesh(pulseRingGeometry, pulseRingMaterial);
			pulseRing.rotation.x = Math.PI / 2;
			pulseRing.position.y = mode === 'newcomer' ? -1.05 : 1.05;
			effectsGroup.add(pulseRing);

			directionArrowBodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 16);
			directionArrowHeadGeometry = new THREE.ConeGeometry(0.19, 0.35, 20);
			directionArrowMaterial = new THREE.MeshStandardMaterial({
				color: accentColor,
				emissive: accentColor,
				emissiveIntensity: 0.06,
				roughness: 0.34,
				metalness: 0.12
			});

			const arrowBody = new THREE.Mesh(directionArrowBodyGeometry, directionArrowMaterial);
			const arrowHead = new THREE.Mesh(directionArrowHeadGeometry, directionArrowMaterial);
			directionArrow = new THREE.Group();

			if (mode === 'newcomer') {
				arrowBody.position.y = 0.04;
				arrowHead.position.y = 0.48;
				directionArrow.position.y = -1.45;
			} else {
				arrowBody.position.y = -0.04;
				arrowHead.rotation.x = Math.PI;
				arrowHead.position.y = -0.48;
				directionArrow.position.y = 1.45;
			}

			directionArrow.add(arrowBody);
			directionArrow.add(arrowHead);
			effectsGroup.add(directionArrow);
		}

		if (mode === 'champion') {
			championHaloGeometry = new THREE.TorusGeometry(1.34, 0.07, 18, 120);
			championHaloMaterial = new THREE.MeshStandardMaterial({
				color: accentColor,
				emissive: 0xd4a017,
				emissiveIntensity: 0.08,
				roughness: 0.24,
				metalness: 0.48
			});
			championHalo = new THREE.Mesh(championHaloGeometry, championHaloMaterial);
			championHalo.rotation.x = Math.PI / 2.1;
			championHalo.position.y = 1.05;
			effectsGroup.add(championHalo);
		}

		if (mode === 'loading') {
			loadingShadowGeometry = new THREE.CircleGeometry(0.95, 40);
			loadingShadowMaterial = new THREE.MeshBasicMaterial({
				color: 0x0b2548,
				transparent: true,
				opacity: 0.25
			});
			loadingShadow = new THREE.Mesh(loadingShadowGeometry, loadingShadowMaterial);
			loadingShadow.rotation.x = -Math.PI / 2;
			loadingShadow.position.y = -1.18;
			effectsGroup.add(loadingShadow);
		}

		const ambient = new THREE.AmbientLight(0xffffff, 0.64);
		scene.add(ambient);

		const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
		keyLight.position.set(2.1, 2.8, 3.5);
		scene.add(keyLight);

		const rimLight = new THREE.DirectionalLight(0xa5d8ff, 0.82);
		rimLight.position.set(-2.4, -1.6, -2.7);
		scene.add(rimLight);

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1));
			const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 1));

			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};

		resize();

		let rafId = 0;
		const animate = () => {
			const t = performance.now() * 0.001;
			const phase = (t * 0.95) % 1;
			ball.position.y = 0;
			root.position.y = 0;
			root.scale.set(1, 1, 1);
			root.rotation.y += spinSpeed;
			root.rotation.z += spinSpeed * 0.52;

			if (mode === 'loading') {
				const bounce = Math.max(0, Math.sin(t * 3.1));
				const hop = Math.pow(bounce, 1.35);
				root.rotation.x = Math.sin(t * 2.4) * 0.09;
				ball.position.y = hop * 0.84;
				root.position.y = -0.56 + (hop * 0.56);
				root.scale.y = 1.02 - (hop * 0.1);
				root.scale.x = 1 - (hop * 0.05);
				root.scale.z = 1 - (hop * 0.05);
				if (loadingShadow) {
					const squash = 1.05 - (hop * 0.38);
					loadingShadow.scale.set(squash, squash, squash);
					loadingShadow.material.opacity = 0.16 + (1 - hop) * 0.58;
				}
			} else if (mode === 'newcomer') {
				root.rotation.x = Math.sin(t * 1.5) * 0.06;
				ball.position.y = Math.sin(t * 2.2) * 0.06 + 0.06;
				if (directionArrow) {
					directionArrow.position.y = -1.45 + phase * 0.7;
				}
				if (pulseRing) {
					const pulse = 0.84 + 0.26 * Math.sin(t * 4.4);
					pulseRing.scale.set(pulse, pulse, pulse);
					pulseRing.material.opacity = 0.5 + 0.3 * (0.5 + 0.5 * Math.sin(t * 4.4));
				}
			} else if (mode === 'relegated') {
				root.rotation.x = -Math.abs(Math.sin(t * 1.35)) * 0.1;
				ball.position.y = -Math.abs(Math.sin(t * 1.8)) * 0.08;
				if (directionArrow) {
					directionArrow.position.y = 1.45 - phase * 0.78;
				}
				if (pulseRing) {
					const pulse = 0.82 + 0.2 * Math.sin(t * 3.8 + Math.PI / 2);
					pulseRing.scale.set(pulse, pulse, pulse);
					pulseRing.material.opacity = 0.42 + 0.24 * (0.5 + 0.5 * Math.sin(t * 3.8));
				}
			} else if (mode === 'champion') {
				root.rotation.x = Math.sin(t * 1.2) * 0.05;
				if (championHalo) {
					championHalo.rotation.z += spinSpeed * 0.78;
					championHalo.position.y = 1.02 + Math.sin(t * 1.9) * 0.05;
				}
			} else {
				root.rotation.x = Math.sin(t * 1.25) * 0.08;
			}

			renderer.render(scene, camera);
			rafId = requestAnimationFrame(animate);
		};
		animate();

		window.addEventListener('resize', resize);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('resize', resize);

			sphereGeometry.dispose();
			sphereMaterial.dispose();
			seamGeometryA.dispose();
			seamGeometryB.dispose();
			seamGeometryC.dispose();
			seamMaterial.dispose();
			if (pulseRingGeometry) pulseRingGeometry.dispose();
			if (pulseRingMaterial) pulseRingMaterial.dispose();
			if (directionArrowBodyGeometry) directionArrowBodyGeometry.dispose();
			if (directionArrowHeadGeometry) directionArrowHeadGeometry.dispose();
			if (directionArrowMaterial) directionArrowMaterial.dispose();
			if (championHaloGeometry) championHaloGeometry.dispose();
			if (championHaloMaterial) championHaloMaterial.dispose();
			if (loadingShadowGeometry) loadingShadowGeometry.dispose();
			if (loadingShadowMaterial) loadingShadowMaterial.dispose();
			renderer.dispose();
		};
	}

	function setupTournamentButtonScene() {
		if (typeof tournamentButtonSceneCleanup === 'function') {
			tournamentButtonSceneCleanup();
			tournamentButtonSceneCleanup = null;
		}

		const button = document.getElementById('btnTournament');
		const canvas = button?.querySelector('.control-chip-scene');
		if (!button || !canvas || typeof THREE === 'undefined') return;

		try {
			const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 24);
			camera.position.set(0, 0.35, 6.1);

			const disposables = [];
			const track = (resource) => {
				disposables.push(resource);
				return resource;
			};

			scene.add(new THREE.AmbientLight(0xffffff, 0.72));
			const keyLight = new THREE.DirectionalLight(0xffffff, 1.06);
			keyLight.position.set(2, 3, 4);
			scene.add(keyLight);
			const fillLight = new THREE.DirectionalLight(0x9cc6ff, 0.44);
			fillLight.position.set(-2, -1.2, -2);
			scene.add(fillLight);

			const skinMaterial = track(new THREE.MeshStandardMaterial({
				color: 0xf7ddc5,
				roughness: 0.45,
				metalness: 0.04
			}));

			const createPlayer = (uniformColor) => {
				const uniformMaterial = track(new THREE.MeshStandardMaterial({
					color: uniformColor,
					roughness: 0.34,
					metalness: 0.12
				}));

				const group = new THREE.Group();
				const torso = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.9, 0.28)), uniformMaterial);
				torso.position.y = 0.42;
				group.add(torso);

				const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.19, 14, 14)), skinMaterial);
				head.position.y = 1.1;
				group.add(head);

				const leftLeg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10)), uniformMaterial);
				leftLeg.position.set(-0.12, -0.16, 0);
				group.add(leftLeg);

				const rightLeg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10)), uniformMaterial);
				rightLeg.position.set(0.12, -0.16, 0);
				group.add(rightLeg);

				const leftArmPivot = new THREE.Group();
				leftArmPivot.position.set(-0.28, 0.68, 0);
				const leftArm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.055, 0.48, 10)), uniformMaterial);
				leftArm.position.y = -0.2;
				leftArm.rotation.z = 0.2;
				leftArmPivot.add(leftArm);
				group.add(leftArmPivot);

				const rightArmPivot = new THREE.Group();
				rightArmPivot.position.set(0.28, 0.68, 0);
				const rightArm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.055, 0.48, 10)), uniformMaterial);
				rightArm.position.y = -0.2;
				rightArm.rotation.z = -0.2;
				rightArmPivot.add(rightArm);
				group.add(rightArmPivot);

				return { group, leftArmPivot, rightArmPivot };
			};

			const leftPlayer = createPlayer(0x3a72c3);
			leftPlayer.group.position.set(-1.45, -0.44, 0);
			scene.add(leftPlayer.group);

			const rightPlayer = createPlayer(0x2f9a68);
			rightPlayer.group.position.set(1.45, -0.44, 0);
			rightPlayer.group.rotation.y = Math.PI;
			scene.add(rightPlayer.group);

			const net = new THREE.Mesh(
				track(new THREE.BoxGeometry(0.055, 1.45, 0.045)),
				track(new THREE.MeshStandardMaterial({ color: 0xdbe7f5, roughness: 0.6, metalness: 0.1 }))
			);
			net.position.set(0, -0.06, 0);
			scene.add(net);

			const court = new THREE.Mesh(
				track(new THREE.PlaneGeometry(5.2, 2.2)),
				track(new THREE.MeshBasicMaterial({ color: 0xa8bfdc, transparent: true, opacity: 0.16 }))
			);
			court.rotation.x = -Math.PI / 2;
			court.position.y = -0.96;
			scene.add(court);

			const ball = new THREE.Mesh(
				track(new THREE.SphereGeometry(0.24, 18, 18)),
				track(new THREE.MeshStandardMaterial({ color: 0xf3c347, roughness: 0.28, metalness: 0.2 }))
			);
			ball.position.set(-1.2, 0.66, 0.04);
			scene.add(ball);

			const resize = () => {
				const rect = canvas.getBoundingClientRect();
				const width = Math.max(1, Math.round(rect.width || 1));
				const height = Math.max(1, Math.round(rect.height || 1));
				renderer.setSize(width, height, false);
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
			};

			resize();
			window.addEventListener('resize', resize);

			let rafId = 0;
			const animate = () => {
				const t = performance.now() * 0.001;
				const phase = (Math.sin(t * 2.2) + 1) * 0.5;
				const travel = THREE.MathUtils.smootherstep(phase, 0, 1);

				ball.position.x = THREE.MathUtils.lerp(-1.2, 1.2, travel);
				ball.position.y = -0.02 + Math.sin(travel * Math.PI) * 1.16;
				ball.position.z = Math.sin(t * 2.2) * 0.06;
				ball.rotation.x += 0.13;
				ball.rotation.y += 0.17;

				leftPlayer.group.position.y = -0.44 + Math.sin(t * 4.1) * 0.03;
				rightPlayer.group.position.y = -0.44 + Math.cos(t * 4.1) * 0.03;

				leftPlayer.leftArmPivot.rotation.z = -0.38 + Math.sin(t * 2.2) * 0.22;
				leftPlayer.rightArmPivot.rotation.z = 0.48 - Math.sin(t * 2.2 + 0.6) * 0.18;
				rightPlayer.leftArmPivot.rotation.z = -0.47 + Math.sin(t * 2.2 + Math.PI + 0.4) * 0.18;
				rightPlayer.rightArmPivot.rotation.z = 0.36 - Math.sin(t * 2.2 + Math.PI) * 0.22;

				renderer.render(scene, camera);
				rafId = requestAnimationFrame(animate);
			};
			animate();

			const cleanup = () => {
				cancelAnimationFrame(rafId);
				window.removeEventListener('resize', resize);
				disposables.forEach((resource) => {
					if (resource && typeof resource.dispose === 'function') {
						resource.dispose();
					}
				});
				renderer.dispose();
			};

			tournamentButtonSceneCleanup = cleanup;
			window.addEventListener('beforeunload', cleanup, { once: true });
		} catch (error) {
			console.warn('Tournament button scene unavailable:', error);
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

	function formatVnlYearList(years) {
		if (!Array.isArray(years) || !years.length) return 'None';
		return years.join(', ');
	}

	function buildVnlMedalChip(type, count, years) {
		const medalLabelByType = {
			gold: 'Gold',
			silver: 'Silver',
			bronze: 'Bronze'
		};
		const medalPrefixByType = {
			gold: 'G',
			silver: 'S',
			bronze: 'B'
		};
		const safeType = medalLabelByType[type] ? type : 'gold';
		const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
		const tooltip = `${medalLabelByType[safeType]} editions: ${formatVnlYearList(years)}`;
		const stateClass = safeCount > 0 ? 'is-earned' : 'is-zero';

		return `<span class="vnl-medal-chip ${safeType} ${stateClass}" title="${escapeHtml(tooltip)}">${medalPrefixByType[safeType]} ${safeCount}</span>`;
	}

	function buildVnlHistoryTooltip(vnlHistory) {
		if (!vnlHistory) return 'No VNL edition history available';
		return [
			`Gold: ${formatVnlYearList(vnlHistory.goldYears)}`,
			`Silver: ${formatVnlYearList(vnlHistory.silverYears)}`,
			`Bronze: ${formatVnlYearList(vnlHistory.bronzeYears)}`
		].join(' | ');
	}

	function buildVnlInlineStatus(vnlStatus, countryName, ranking) {
		if (!vnlStatus || !isVnlTournamentMode()) return '';

		const safeRank = Number(ranking?.rank);
		const previousEdition = getVnlPreviousEditionInfo(countryName, ranking, vnlStatus.seasonYear);
		let label = 'VNL TEAM';
		let subline = `${countryName} • VNL ${vnlStatus.seasonYear}`;
		let toneClass = 'is-active';

		if (vnlStatus.status === 'newcomer') {
			label = 'PROMOTED TEAM';
			subline = `${countryName} • Promoted for VNL ${vnlStatus.seasonYear}`;
			toneClass = 'is-newcomer';
		} else if (vnlStatus.status === 'relegated') {
			const downYear = vnlStatus.previousSeasonYear || (Number(vnlStatus.seasonYear) - 1);
			label = 'RELEGATED TEAM';
			subline = `${countryName} • Relegated after ${downYear}`;
			toneClass = 'is-relegated';
		}

		if (vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated') {
			label = 'DEFENDING CHAMPION';
			subline = `${countryName} • VNL ${vnlStatus.seasonYear} title holder`;
			toneClass = 'is-champion';
		}

		if (Number.isFinite(safeRank)) {
			subline += ` • World #${safeRank}`;
		}

		const previousYearLabel = Number.isFinite(Number(previousEdition.year)) ? previousEdition.year : 'N/A';
		const previousMedalLabel = previousEdition.medalLabel || 'No podium';
		const trophyMarkup = (vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated')
			? `<img class="vnl-inline-trophy" src="${VNL_TROPHY_IMAGE_PATH}" alt="VNL trophy" onerror="this.style.display='none'">`
			: '';
		const medalChipsMarkup = [
			buildVnlMedalChip('gold', previousEdition.gold, previousEdition.goldYears),
			buildVnlMedalChip('silver', previousEdition.silver, previousEdition.silverYears),
			buildVnlMedalChip('bronze', previousEdition.bronze, previousEdition.bronzeYears)
		].join('');

		return `
			<div class="vnl-inline-banner ${toneClass}">
				<div class="vnl-inline-main">
					${trophyMarkup}
					<div class="vnl-inline-copy">
						<div class="vnl-inline-line">
							<span class="vnl-inline-label">${escapeHtml(label)}</span>
						</div>
						<span class="vnl-inline-subline">${escapeHtml(subline)}</span>
					</div>
				</div>
				<div class="vnl-inline-prev">
					<span class="vnl-inline-prev-label">Previous Edition (${escapeHtml(previousYearLabel)}): ${escapeHtml(previousMedalLabel)}</span>
					<div class="vnl-history-medals">
						${medalChipsMarkup}
					</div>
				</div>
			</div>
		`;
	}

	function clearChampionTopBanner(card) {
		if (!card) return;
		const existingBanner = card.querySelector('.card-top-vnl-banner');
		if (existingBanner) {
			existingBanner.remove();
		}
	}

	function getVnlTopBannerMeta(vnlStatus) {
		let label = 'VNL TEAM';
		let toneClass = 'is-active';
		let ledDirection = '';
		let showTrophy = false;

		if (vnlStatus?.status === 'newcomer') {
			label = 'PROMOTED TEAM';
			toneClass = 'is-newcomer';
			ledDirection = '';
		} else if (vnlStatus?.status === 'relegated') {
			label = 'RELEGATED TEAM';
			toneClass = 'is-relegated';
			// Keep relegated cards cleaner by removing the small LED popout.
			ledDirection = '';
		}

		if (vnlStatus?.isDefendingChampion && vnlStatus?.status !== 'relegated') {
			label = 'DEFENDING CHAMPION';
			toneClass = 'is-champion';
			showTrophy = false;
			ledDirection = '';
		}

		return {
			label,
			toneClass,
			ledDirection,
			showTrophy
		};
	}

	function renderVnlTopBanner(card, vnlStatus, countryName, ranking) {
		if (!card || !vnlStatus || !isVnlTournamentMode()) {
			clearChampionTopBanner(card);
			return;
		}

		clearChampionTopBanner(card);
		const bannerMeta = getVnlTopBannerMeta(vnlStatus);
		const trophyMarkup = bannerMeta.showTrophy
			? `<img class="card-top-vnl-trophy" src="${VNL_TROPHY_IMAGE_PATH}" alt="VNL trophy" onerror="this.style.display='none'">`
			: '';
		const ledMarkup = bannerMeta.ledDirection
			? `<span class="card-top-vnl-led ${bannerMeta.ledDirection}" aria-hidden="true"></span>`
			: '';

		const banner = document.createElement('div');
		banner.className = `card-top-vnl-banner ${bannerMeta.toneClass}`;
		banner.innerHTML = `
			${trophyMarkup}
			<div class="card-top-vnl-copy">
				<span class="card-top-vnl-label">${escapeHtml(bannerMeta.label)}</span>
			</div>
			${ledMarkup}
		`;

		const cardHeader = card.querySelector('.card-header');
		if (cardHeader) {
			card.insertBefore(banner, cardHeader);
		}
	}

	function positionVnlStatusPopup() {
		const popup = document.getElementById('vnlStatusPopup');
		const card = document.querySelector('.country-card');
		if (!popup || !card || !popup.classList.contains('show') || !card.classList.contains('show')) return;

		const cardRect = card.getBoundingClientRect();
		const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
		const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
		const gap = isMobileViewport() ? 8 : 10;

		popup.style.width = `${Math.round(cardRect.width)}px`;
		const popupRect = popup.getBoundingClientRect();
		let top = cardRect.top - popupRect.height - gap;
		if (top < 12) {
			top = cardRect.bottom + gap;
		}
		if ((top + popupRect.height) > (viewportH - 12)) {
			top = Math.max(12, viewportH - popupRect.height - 12);
		}

		const maxLeft = Math.max(12, viewportW - popupRect.width - 12);
		const left = Math.min(maxLeft, Math.max(12, cardRect.left));

		popup.style.left = `${Math.round(left)}px`;
		popup.style.top = `${Math.round(top)}px`;
	}

	function hideVnlStatusPopup() {
		const popup = document.getElementById('vnlStatusPopup');
		if (!popup) return;

		disposeVnlStatusPopupAnimation();
		popup.classList.remove('show', 'is-active', 'is-newcomer', 'is-relegated', 'is-champion', 'is-gold', 'is-silver', 'is-bronze');
		popup.style.left = '';
		popup.style.top = '';
		popup.style.width = '';
		popup.innerHTML = '';
		popup.setAttribute('aria-hidden', 'true');
	}

	function showVnlStatusPopup(vnlStatus, countryName, ranking) {
		const popup = document.getElementById('vnlStatusPopup');
		if (!popup) return;
		if (!vnlStatus || !isVnlTournamentMode()) {
			hideVnlStatusPopup();
			return;
		}

		if (vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated') {
			hideVnlStatusPopup();
			return;
		}

		if (vnlStatus.status === 'relegated') {
			hideVnlStatusPopup();
			return;
		}

		disposeVnlStatusPopupAnimation();
		const safeRank = Number(ranking?.rank);
		const previousEdition = getVnlPreviousEditionInfo(countryName, ranking, vnlStatus.seasonYear);

		let label = 'VNL TEAM';
		let subline = `${countryName} • VNL ${vnlStatus.seasonYear}`;
		let toneClass = 'is-active';

		if (vnlStatus.status === 'newcomer') {
			label = 'PROMOTED TEAM';
			subline = `${countryName} • Promoted for VNL ${vnlStatus.seasonYear}`;
			toneClass = 'is-newcomer';
		} else if (vnlStatus.status === 'relegated') {
			const downYear = vnlStatus.previousSeasonYear || (Number(vnlStatus.seasonYear) - 1);
			label = 'RELEGATED TEAM';
			subline = `${countryName} • Relegated after ${downYear}`;
			toneClass = 'is-relegated';
		}

		if (vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated') {
			label = 'DEFENDING CHAMPION';
			subline = `${countryName}`;
			toneClass = 'is-champion';
		}

		if (!vnlStatus.isDefendingChampion && Number.isFinite(safeRank) && safeRank === 1) {
			toneClass = 'is-champion';
		}

		if (Number.isFinite(safeRank)) {
			subline += ` • World #${safeRank}`;
		}

		const trophyMarkup = (vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated')
			? `<img class="vnl-status-trophy" src="${VNL_TROPHY_IMAGE_PATH}" alt="VNL trophy" onerror="this.style.display='none'">`
			: '';

		const previousYearLabel = Number.isFinite(Number(previousEdition.year)) ? previousEdition.year : 'N/A';
		const previousMedalLabel = previousEdition.medalLabel || 'No podium';
		const regularMedalMarkup = [
			buildVnlMedalChip('gold', previousEdition.gold, previousEdition.goldYears),
			buildVnlMedalChip('silver', previousEdition.silver, previousEdition.silverYears),
			buildVnlMedalChip('bronze', previousEdition.bronze, previousEdition.bronzeYears)
		].join('');

		const championGoldMarkup = buildVnlMedalChip(
			'gold',
			1,
			Number.isFinite(Number(previousEdition.year)) ? [Number(previousEdition.year)] : []
		);

		const historyMarkup = vnlStatus.isDefendingChampion && vnlStatus.status !== 'relegated'
			? `
				<div class="vnl-status-history champion-only">
					<div class="vnl-history-medals">
						${championGoldMarkup}
					</div>
				</div>
			`
			: `
				<div class="vnl-status-history">
					<div class="vnl-history-medals">
						${regularMedalMarkup}
					</div>
					<span class="vnl-history-winners">Previous Edition (${escapeHtml(previousYearLabel)}): ${escapeHtml(previousMedalLabel)}</span>
				</div>
			`;


		popup.innerHTML = `
			<div class="vnl-status-popup-inner">
				${trophyMarkup}
				<div class="vnl-status-copy">
					<div class="vnl-status-line">
						<span class="vnl-status-label">${escapeHtml(label)}</span>
					</div>
					<span class="vnl-status-subline">${escapeHtml(subline)}</span>
					${historyMarkup}
				</div>
			</div>
		`;

		popup.classList.remove('is-active', 'is-newcomer', 'is-relegated', 'is-champion', 'is-gold', 'is-silver', 'is-bronze');
		popup.classList.add('show', toneClass);
		popup.setAttribute('aria-hidden', 'false');

		positionVnlStatusPopup();
		requestAnimationFrame(positionVnlStatusPopup);
		setTimeout(positionVnlStatusPopup, 420);
	}

	function setupMobileTitleToggle() {
		const titleWrap = document.getElementById('titleWrap');
		if (!titleWrap) return;

		titleWrap.addEventListener('click', () => {
			if (!isMobileViewport()) return;
			titleWrap.classList.toggle('collapsed');
		});

		window.addEventListener('resize', () => {
			if (!isMobileViewport()) {
				titleWrap.classList.remove('collapsed');
			}
			if (!document.querySelector('.country-card')?.classList.contains('show')) {
				applyMobileCountryLayout(false);
			}
			positionVnlStatusPopup();
		});
	}

	function setupReleaseNotesModal() {
		const modal = document.getElementById('releaseNotesModal');
		const closeBtn = document.getElementById('releaseNotesClose');
		const openFromInfoBtn = document.getElementById('openReleaseNotesFromInfo');
		if (!modal) return;

		const closeModal = () => {
			modal.classList.add('hidden');
			modal.setAttribute('aria-hidden', 'true');
			syncOverlayUiState();
		};

		if (closeBtn) {
			closeBtn.addEventListener('click', closeModal);
		}

		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				closeModal();
			}
		});

		if (openFromInfoBtn) {
			openFromInfoBtn.addEventListener('click', () => {
				hideInfoModal();
				showReleaseNotesModal();
			});
		}
	}

	function showReleaseNotesModal() {
		const modal = document.getElementById('releaseNotesModal');
		if (!modal) return;

		modal.classList.remove('hidden');
		modal.setAttribute('aria-hidden', 'false');
		syncOverlayUiState();
	}

	function shouldAutoShowReleaseNotes() {
		try {
			const params = new URLSearchParams(window.location.search);
			return params.get('notes') === '1';
		} catch (error) {
			return false;
		}
	}

	function isOverlayElementOpen(element) {
		if (!element) return false;
		if (element.classList.contains('hidden')) return false;
		if (element.classList.contains('opacity-0')) return false;
		if (element.classList.contains('pointer-events-none')) return false;
		return true;
	}

	function syncOverlayUiState() {
		const overlayOpen =
			isOverlayElementOpen(document.getElementById('tournamentModal')) ||
			isOverlayElementOpen(document.getElementById('infoModal')) ||
			isOverlayElementOpen(document.getElementById('releaseNotesModal')) ||
			isOverlayElementOpen(document.getElementById('leaderboardModal'));

		document.body.classList.toggle('overlay-open', overlayOpen);
	}
	
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

	const VNL_TEAMS_API = {
		women: new Set(),
		men: new Set()
	};

	// Manual map for current defending champions until Volleyball World API exposes champion metadata.
	const VNL_DEFENDING_CHAMPIONS = {
		women: {
			2026: 'ITA',
			2025: 'ITA'
		},
		men: {
			2026: 'FRA',
			2025: 'FRA'
		}
	};

	const VNL_TROPHY_IMAGE_PATH = 'src/assets/img/vnl.png';

	const VNL_PAST_PODIUMS = {
		women: {
			2021: { gold: 'USA', silver: 'BRA', bronze: 'TUR' },
			2022: { gold: 'ITA', silver: 'BRA', bronze: 'SRB' },
			2023: { gold: 'TUR', silver: 'CHN', bronze: 'POL' },
			2024: { gold: 'ITA', silver: 'JPN', bronze: 'POL' },
			2025: { gold: 'ITA', silver: '', bronze: '' }
		},
		men: {
			2021: { gold: 'BRA', silver: 'POL', bronze: 'FRA' },
			2022: { gold: 'FRA', silver: 'USA', bronze: 'POL' },
			2023: { gold: 'POL', silver: 'USA', bronze: 'JPN' },
			2024: { gold: 'FRA', silver: 'JPN', bronze: 'POL' },
			2025: { gold: 'FRA', silver: '', bronze: '' }
		}
	};

	function createEmptyVnlSeasonState() {
		const nowYear = new Date().getFullYear();
		return {
			requestedYear: nowYear,
			seasonYear: nowYear,
			previousSeasonYear: null,
			isFallbackYear: false,
			availableYears: [],
			activeTeams: [],
			activeTeamRecords: [],
			newcomerTeams: [],
			relegatedTeams: [],
			activeSet: new Set(),
			teamByNormalizedName: new Map(),
			newcomerSet: new Set(),
			relegatedSet: new Set(),
			defendingChampionCode: '',
			defendingChampionName: ''
		};
	}

	const VNL_SEASON_STATE = {
		women: createEmptyVnlSeasonState(),
		men: createEmptyVnlSeasonState()
	};

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
			'usa': 'united states',
			'us': 'united states',
			'bih': 'bosnia and herzegovina',
			'bosnia and herz': 'bosnia and herzegovina',
			'bosnia and herzeg': 'bosnia and herzegovina',
			'turkiye': 'turkey',
			'czech republic': 'czechia',
			'republic of korea': 'korea',
			'south korea': 'korea',
			'korea republic of': 'korea',
			'dominican rep': 'dominican republic'
		};

		return aliases[normalized] || normalized;
	}

	function resolveCountryCode(countryName, ranking) {
		const rankingCode = String(ranking?.federationCode || '').toUpperCase().trim();
		if (rankingCode) return rankingCode;

		const normalized = normalizeTeamName(countryName);
		const state = VNL_SEASON_STATE[currentGender] || createEmptyVnlSeasonState();
		const teamRecord = state.teamByNormalizedName instanceof Map
			? state.teamByNormalizedName.get(normalized)
			: null;
		const vnlCode = String(teamRecord?.federationCode || '').toUpperCase().trim();
		if (vnlCode) return vnlCode;

		const fallbackByName = {
			'bosnia and herzegovina': 'BIH',
			'bosnia and herz': 'BIH',
			'bosnia and herzeg': 'BIH',
			'turkey': 'TUR',
			'czechia': 'CZE',
			'south korea': 'KOR',
			'korea': 'KOR',
			'russia': 'RUS',
			'russian federation': 'RUS',
			'belarus': 'BLR'
		};

		return fallbackByName[normalized] || '';
	}

	function getWorldRankMedalTier(rank, tournamentType) {
		const numericRank = Number(rank);
		if (!Number.isFinite(numericRank)) return '';

		if (numericRank === 1) return 'gold';
		if (!!tournamentType && numericRank === 2) return 'silver';
		if (!!tournamentType && numericRank === 3) return 'bronze';
		return '';
	}

	function getVnlPastWinners(countryName, ranking) {
		const code = resolveCountryCode(countryName, ranking);
		const podiumByGender = VNL_PAST_PODIUMS[currentGender] || {};
		const seasons = Object.keys(podiumByGender)
			.map(year => Number(year))
			.filter(Number.isFinite)
			.sort((a, b) => a - b);
		const goldYears = [];
		const silverYears = [];
		const bronzeYears = [];

		seasons.forEach(season => {
			const podium = podiumByGender[season] || {};
			if (String(podium.gold || '').toUpperCase() === code) goldYears.push(season);
			if (String(podium.silver || '').toUpperCase() === code) silverYears.push(season);
			if (String(podium.bronze || '').toUpperCase() === code) bronzeYears.push(season);
		});

		const seasonsLabel = seasons.length
			? `${seasons[0]}-${seasons[seasons.length - 1]}`
			: '';

		return {
			code,
			gold: goldYears.length,
			silver: silverYears.length,
			bronze: bronzeYears.length,
			winnerYears: goldYears,
			goldYears,
			silverYears,
			bronzeYears,
			seasonsLabel
		};
	}

	function getVnlPreviousEditionInfo(countryName, ranking, seasonYear) {
		const code = resolveCountryCode(countryName, ranking);
		const podiumByGender = VNL_PAST_PODIUMS[currentGender] || {};
		const seasons = Object.keys(podiumByGender)
			.map(year => Number(year))
			.filter(Number.isFinite)
			.sort((a, b) => a - b);

		if (!seasons.length) {
			return {
				year: null,
				medalType: 'none',
				medalLabel: 'No podium',
				gold: 0,
				silver: 0,
				bronze: 0,
				goldYears: [],
				silverYears: [],
				bronzeYears: []
			};
		}

		const safeSeasonYear = Number(seasonYear);
		const preferredYear = Number.isFinite(safeSeasonYear) ? (safeSeasonYear - 1) : null;
		let targetYear = preferredYear && seasons.includes(preferredYear)
			? preferredYear
			: null;

		if (!targetYear) {
			const earlierYears = Number.isFinite(safeSeasonYear)
				? seasons.filter(year => year < safeSeasonYear)
				: seasons;
			targetYear = earlierYears.length ? earlierYears[earlierYears.length - 1] : seasons[seasons.length - 1];
		}

		const podium = podiumByGender[targetYear] || {};
		const isGold = String(podium.gold || '').toUpperCase() === code;
		const isSilver = String(podium.silver || '').toUpperCase() === code;
		const isBronze = String(podium.bronze || '').toUpperCase() === code;
		const medalType = isGold ? 'gold' : (isSilver ? 'silver' : (isBronze ? 'bronze' : 'none'));
		const medalLabelByType = {
			gold: 'Gold',
			silver: 'Silver',
			bronze: 'Bronze',
			none: 'No podium'
		};

		return {
			year: targetYear,
			medalType,
			medalLabel: medalLabelByType[medalType] || 'No podium',
			gold: isGold ? 1 : 0,
			silver: isSilver ? 1 : 0,
			bronze: isBronze ? 1 : 0,
			goldYears: isGold ? [targetYear] : [],
			silverYears: isSilver ? [targetYear] : [],
			bronzeYears: isBronze ? [targetYear] : []
		};
	}

	function resolveDefendingChampionCode(gender, seasonYear, activeTeams = []) {
		const byGender = VNL_DEFENDING_CHAMPIONS[gender] || {};
		const requested = Number(seasonYear);
		const candidates = [
			byGender[requested],
			byGender[requested - 1],
			byGender.default
		]
			.filter(Boolean)
			.map(code => String(code).toUpperCase());

		if (!candidates.length) return '';

		const activeCodes = new Set(
			activeTeams
				.map(team => String(team?.federationCode || '').toUpperCase())
				.filter(Boolean)
		);

		if (!activeCodes.size) {
			return candidates[0] || '';
		}

		return candidates.find(code => activeCodes.has(code)) || '';
	}

	function createStatusPayload(state, status, isDefendingChampion) {
		return {
			status,
			seasonYear: state.seasonYear,
			previousSeasonYear: state.previousSeasonYear,
			isFallbackYear: state.isFallbackYear,
			isDefendingChampion: !!isDefendingChampion
		};
	}

	function getVnlCountryStatus(countryName) {
		if (!isVnlTournamentMode()) return null;

		const normalized = normalizeTeamName(countryName);
		const state = VNL_SEASON_STATE[currentGender] || createEmptyVnlSeasonState();
		const teamRecord = state.teamByNormalizedName instanceof Map
			? state.teamByNormalizedName.get(normalized)
			: null;
		const teamCode = String(teamRecord?.federationCode || '').toUpperCase();
		const championCode = String(state.defendingChampionCode || '').toUpperCase();
		const championByName = normalizeTeamName(state.defendingChampionName || '') === normalized;
		const isDefendingChampion = championByName || (!!championCode && championCode === teamCode);

		if (state.newcomerSet.has(normalized)) {
			return createStatusPayload(state, 'newcomer', isDefendingChampion);
		}

		if (state.activeSet.has(normalized)) {
			return createStatusPayload(state, 'active', isDefendingChampion);
		}

		if (state.relegatedSet.has(normalized)) {
			return createStatusPayload(state, 'relegated', false);
		}

		return null;
	}

	function getVnlCountryInfo(countryName) {
		const status = getVnlCountryStatus(countryName);
		if (!status) return null;

		const seasonYear = Number(status.seasonYear) || new Date().getFullYear();
		let statusLabel = 'VNL TEAM';
		if (status.status === 'newcomer') {
			statusLabel = 'VNL NEWCOMER';
		}
		if (status.status === 'relegated') {
			statusLabel = 'PAST RELEGATED';
		}
		if (status.isDefendingChampion) {
			statusLabel = 'DEFENDING CHAMPION';
		}

		return {
			label: statusLabel,
			status: status.status,
			seasonYear,
			previousSeasonYear: status.previousSeasonYear,
			isFallbackYear: !!status.isFallbackYear,
			isDefendingChampion: !!status.isDefendingChampion
		};
	}

	function getVnlSeasonSummary(gender = currentGender) {
		const state = VNL_SEASON_STATE[gender] || createEmptyVnlSeasonState();
		if (!state.activeTeams.length) return '';

		const newcomerCount = state.newcomerTeams.length;
		const relegatedCount = state.relegatedTeams.length;
		const fallbackNote = state.isFallbackYear ? ' (latest season in API)' : '';

		return `VNL ${state.seasonYear}${fallbackNote} - ${newcomerCount} newcomer${newcomerCount === 1 ? '' : 's'}, ${relegatedCount} relegated`;
	}

	function isCountryInActiveTournament(countryName) {
		if (!isVnlTournamentMode()) return false;
		const info = getVnlCountryInfo(countryName);
		return !!info;
	}

	function getTournamentLabel(type) {
		switch (type) {
			case 'vnl': return 'Volleyball Nations League';
			case 'world': return 'World Championship';
			case 'eurovolley': return 'EuroVolley';
			case 'olympics': return 'Olympics';
			default: return 'Tournament';
		}
	}
	
	/**
	 * Initialize application
	 */
	async function init() {
		try {
			window.getVnlBadgeInfo = getVnlCountryInfo;
			window.isTournamentVnlModeEnabled = () => isVnlTournamentMode();
			window.isCountryInActiveTournament = isCountryInActiveTournament;
			
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
			setupTournamentToggle();
			setupTournamentModal();
			setupTournamentButtonScene();
			setupInfoModal();
			setupMobileTitleToggle();
			setupReleaseNotesModal();
			
			// Setup country selection callback
			window.onCountrySelected = handleCountrySelection;
			void refreshVnlTeamsFromApi(currentGender);
			if (shouldAutoShowReleaseNotes()) {
				setTimeout(showReleaseNotesModal, 760);
			}
			
		} catch (error) {
			console.error('Initialization error:', error);
			showError('Failed to load application. Please refresh the page.');
		}
	}

	/**
	 * Setup info modal
	 */
	function setupInfoModal() {
		const btnInfo = document.getElementById('btnInfo');
		const infoModal = document.getElementById('infoModal');
		const closeInfo = document.getElementById('closeInfo');

		if (btnInfo) {
			btnInfo.addEventListener('click', () => {
				if (!infoModal) return;
				infoModal.classList.remove('opacity-0', 'pointer-events-none');
				if (isMobileViewport()) {
					document.body.classList.add('mobile-info-open');
				}
				syncOverlayUiState();
			});
		}

		if (closeInfo) {
			closeInfo.addEventListener('click', hideInfoModal);
		}

		if (infoModal) {
			infoModal.addEventListener('click', (e) => {
				if (e.target === infoModal) {
					hideInfoModal();
				}
			});
		}
	}

	function hideInfoModal() {
		const infoModal = document.getElementById('infoModal');
		if (infoModal) {
			infoModal.classList.add('opacity-0', 'pointer-events-none');
		}
		document.body.classList.remove('mobile-info-open');
		syncOverlayUiState();
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
		if (!btnWomen || !btnMen) return;
		
		const isWomen = currentGender === 'women';
		btnWomen.classList.toggle('active', isWomen);
		btnMen.classList.toggle('active', !isWomen);
		btnWomen.setAttribute('aria-pressed', String(isWomen));
		btnMen.setAttribute('aria-pressed', String(!isWomen));
		
		// Update body class for theme
		document.body.classList.remove('women', 'men');
		document.body.classList.add(currentGender);
		
		// Close any open card
		hideCountryCard();
		hideTournamentModal();
		GlobeRenderer.clearSelection();
		window.getVnlBadgeInfo = getVnlCountryInfo;
		window.isTournamentVnlModeEnabled = () => isVnlTournamentMode();
		window.isCountryInActiveTournament = isCountryInActiveTournament;
		if (isVnlTournamentMode()) {
			void refreshVnlTeamsFromApi(currentGender).then(() => {
				GlobeRenderer.refreshTournamentMarkers?.();
			});
		}
		GlobeRenderer.refreshTournamentMarkers?.();
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
			dateEl.textContent = `as of: ${today}`;
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
		if (btnLeaderboard) {
			btnLeaderboard.addEventListener('click', () => {
				openRankingsPage();
			});
		}
	}

	function openRankingsPage() {
		const params = new URLSearchParams();
		params.set('gender', currentGender);
		if (activeTournamentType) {
			params.set('tournament', activeTournamentType);
		}
		window.location.href = `rankings.html?${params.toString()}`;
	}

	function setupTournamentModal() {
		const tournamentModal = document.getElementById('tournamentModal');
		const closeTournament = document.getElementById('closeTournament');
		const openCountryBtn = document.getElementById('tournamentOpenCountry');
		const tournamentContent = document.getElementById('tournamentContent');
		const tournamentActions = document.querySelector('.tournament-actions');

		if (openCountryBtn) {
			openCountryBtn.style.display = 'none';
		}
		if (tournamentActions) {
			tournamentActions.classList.add('is-hidden');
		}

		if (closeTournament) {
			closeTournament.addEventListener('click', hideTournamentModal);
		}

		if (tournamentModal) {
			tournamentModal.addEventListener('click', (e) => {
				if (e.target === tournamentModal) {
					hideTournamentModal();
				}
			});
		}

		if (openCountryBtn) {
			openCountryBtn.addEventListener('click', () => {
				const team = activeTournamentCountry;
				hideTournamentModal();
				if (team) {
					GlobeRenderer.selectCountryByName(team);
				}
			});
		}

		if (tournamentContent) {
			tournamentContent.addEventListener('click', (e) => {
				const target = e.target.closest('[data-tournament-select]');
				if (!target) return;
				if (target.hasAttribute('disabled') || target.getAttribute('data-under-construction') === '1') {
					return;
				}
				const type = target.getAttribute('data-tournament-select') || '';
				void applyTournamentSelection(type);
			});
		}
	}

	function getTournamentFilterButtonLabel() {
		return activeTournamentType === 'vnl' ? 'VNL' : 'Tournament Filter';
	}

	function syncTournamentFilterButton() {
		const btnTournament = document.getElementById('btnTournament');
		if (!btnTournament) return;

		const labelEl = document.getElementById('btnTournamentLabel');
		if (labelEl) {
			labelEl.textContent = getTournamentFilterButtonLabel();
		}

		btnTournament.classList.toggle('active', !!activeTournamentType);
		btnTournament.classList.toggle('has-filter', !!activeTournamentType);
	}

	function setupTournamentToggle() {
		const btnTournament = document.getElementById('btnTournament');
		if (!btnTournament) return;

		btnTournament.addEventListener('click', (event) => {
			if (event.target.closest('.control-chip-clear')) {
				event.preventDefault();
				event.stopPropagation();
				void applyTournamentSelection('');
				return;
			}

			showTournamentPickerModal();
		});

		syncTournamentFilterButton();
	}

	async function applyTournamentSelection(type) {
		const normalizedType = String(type || '').toLowerCase();
		if (normalizedType && normalizedType !== 'all' && normalizedType !== 'vnl') {
			return;
		}

		activeTournamentType = normalizedType === 'all' ? '' : normalizedType;
		if (isVnlTournamentMode(activeTournamentType)) {
			await refreshVnlTeamsFromApi(currentGender);
		} else {
			hideVnlStatusPopup();
			clearVnlCardPreviewTimer();
			const activeCard = document.querySelector('.country-card');
			if (activeCard) {
				activeCard.classList.remove('vnl-active-card', 'vnl-champion-card', 'vnl-newcomer-card', 'vnl-relegated-card', 'vnl-past-relegated-card', 'vnl-body-led-newcomer', 'vnl-body-led-relegated', 'vnl-body-led-champion', 'vnl-preview-static');
				clearChampionTopBanner(activeCard);
			}
		}
		document.body.classList.toggle('tournament-vnl', isVnlTournamentMode(activeTournamentType));
		syncTournamentFilterButton();

		window.getVnlBadgeInfo = getVnlCountryInfo;
		window.isTournamentVnlModeEnabled = () => isVnlTournamentMode();
		window.isCountryInActiveTournament = isCountryInActiveTournament;
		if (lastSelectedCountryContext && document.querySelector('.country-card')?.classList.contains('show')) {
			showCountryCard(
				lastSelectedCountryContext.countryName,
				lastSelectedCountryContext.countryId,
				lastSelectedCountryContext.ranking
			);
		}
		GlobeRenderer.refreshTournamentMarkers?.();
		hideTournamentModal();
	}

	async function refreshVnlTeamsFromApi(gender) {
		try {
			const requestedYear = new Date().getFullYear();

			if (typeof RankingFetcher.getVnlSeasonSnapshot === 'function') {
				const snapshot = await RankingFetcher.getVnlSeasonSnapshot(gender, { year: requestedYear });
				const activeTeams = Array.isArray(snapshot?.teams) ? snapshot.teams : [];
				const newcomerTeams = Array.isArray(snapshot?.newcomerTeams) ? snapshot.newcomerTeams : [];
				const relegatedTeams = Array.isArray(snapshot?.relegatedTeams) ? snapshot.relegatedTeams : [];
				const seasonYear = snapshot?.seasonYear || requestedYear;

				const activeTeamRecords = activeTeams
					.map(team => ({
						federationName: String(team?.federationName || '').trim(),
						federationCode: String(team?.federationCode || '').toUpperCase().trim()
					}))
					.filter(team => !!team.federationName);

				const activeNames = activeTeamRecords.map(team => team.federationName);
				const newcomerNames = newcomerTeams.map(team => team?.federationName).filter(Boolean);
				const relegatedNames = relegatedTeams.map(team => team?.federationName).filter(Boolean);
				const teamByNormalizedName = new Map(
					activeTeamRecords.map(team => [normalizeTeamName(team.federationName), team])
				);
				const defendingChampionCode = resolveDefendingChampionCode(gender, seasonYear, activeTeamRecords);
				const defendingChampion = activeTeamRecords.find(team => team.federationCode === defendingChampionCode);

				const activeSet = new Set(activeNames.map(name => normalizeTeamName(name)));
				const newcomerSet = new Set(newcomerNames.map(name => normalizeTeamName(name)));
				const relegatedSet = new Set(relegatedNames.map(name => normalizeTeamName(name)));

				VNL_TEAMS_API[gender] = activeSet;
				VNL_SEASON_STATE[gender] = {
					requestedYear: snapshot?.requestedYear || requestedYear,
					seasonYear,
					previousSeasonYear: snapshot?.previousSeasonYear || null,
					isFallbackYear: !!snapshot?.isFallbackYear,
					availableYears: Array.isArray(snapshot?.availableYears) ? snapshot.availableYears : [],
					activeTeams: activeNames,
					activeTeamRecords,
					newcomerTeams: newcomerNames,
					relegatedTeams: relegatedNames,
					activeSet,
					teamByNormalizedName,
					newcomerSet,
					relegatedSet,
					defendingChampionCode,
					defendingChampionName: defendingChampion?.federationName || ''
				};
				return;
			}

			const teams = typeof RankingFetcher.getCurrentVnlTeams === 'function'
				? await RankingFetcher.getCurrentVnlTeams(gender, { year: requestedYear })
				: await RankingFetcher.getTournamentTeams(gender, 'vnl');

			const activeTeamRecords = Array.isArray(teams)
				? teams
					.map(team => {
						if (typeof team === 'string') {
							return {
								federationName: team,
								federationCode: ''
							};
						}

						return {
							federationName: String(team?.federationName || '').trim(),
							federationCode: String(team?.federationCode || '').toUpperCase().trim()
						};
					})
					.filter(team => !!team.federationName)
				: [];

			const names = activeTeamRecords.map(team => team.federationName);
			const teamByNormalizedName = new Map(
				activeTeamRecords.map(team => [normalizeTeamName(team.federationName), team])
			);
			const defendingChampionCode = resolveDefendingChampionCode(gender, requestedYear, activeTeamRecords);
			const defendingChampion = activeTeamRecords.find(team => team.federationCode === defendingChampionCode);

			const activeSet = new Set(names.map(name => normalizeTeamName(name)));
			VNL_TEAMS_API[gender] = activeSet;
			VNL_SEASON_STATE[gender] = {
				requestedYear,
				seasonYear: requestedYear,
				previousSeasonYear: null,
				isFallbackYear: false,
				availableYears: [requestedYear],
				activeTeams: names,
				activeTeamRecords,
				newcomerTeams: [],
				relegatedTeams: [],
				activeSet,
				teamByNormalizedName,
				newcomerSet: new Set(),
				relegatedSet: new Set(),
				defendingChampionCode,
				defendingChampionName: defendingChampion?.federationName || ''
			};
		} catch (error) {
			console.error('Failed to derive VNL teams from API:', error);
			VNL_TEAMS_API[gender] = new Set();
			VNL_SEASON_STATE[gender] = createEmptyVnlSeasonState();
		}
	}

	function showTournamentPickerModal() {
		const modal = document.getElementById('tournamentModal');
		const content = document.getElementById('tournamentContent');
		const title = document.getElementById('tournamentTitle');
		const openCountryBtn = document.getElementById('tournamentOpenCountry');
		const tournamentActions = document.querySelector('.tournament-actions');
		if (!modal || !content) return;

		activeTournamentCountry = '';
		if (title) {
			title.textContent = 'Choose Tournament';
		}
		if (openCountryBtn) {
			openCountryBtn.style.display = 'none';
		}
		if (tournamentActions) {
			tournamentActions.classList.add('is-hidden');
		}

		content.innerHTML = `
			<div class="tournament-picker-grid">
				<button type="button" class="tournament-select-btn ${activeTournamentType === 'vnl' ? 'selected' : ''}" data-tournament-select="vnl">
					<i class="fa-solid fa-volleyball"></i>
					<span>VNL</span>
				</button>
				<button type="button" class="tournament-select-btn is-under-construction" data-tournament-select="world" data-under-construction="1" disabled>
					<span class="tournament-construction-tape">Under Construction</span>
					<i class="fa-solid fa-earth-europe"></i>
					<span>World Championship</span>
				</button>
				<button type="button" class="tournament-select-btn is-under-construction" data-tournament-select="eurovolley" data-under-construction="1" disabled>
					<span class="tournament-construction-tape">Under Construction</span>
					<i class="fa-solid fa-flag-checkered"></i>
					<span>EuroVolley</span>
				</button>
				<button type="button" class="tournament-select-btn is-under-construction" data-tournament-select="olympics" data-under-construction="1" disabled>
					<span class="tournament-construction-tape">Under Construction</span>
					<i class="fa-solid fa-medal"></i>
					<span>Olympics</span>
				</button>
			</div>
		`;

		modal.classList.remove('opacity-0', 'pointer-events-none');
		if (isMobileViewport()) {
			document.body.classList.add('mobile-tournament-open');
		}
		syncOverlayUiState();
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
				item.style.display = '';
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
		if (isMobileViewport()) {
			document.body.classList.add('mobile-leaderboard-open');
		}
		syncOverlayUiState();
		
		// Show loading state
		content.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">Loading...</div>';
		
		try {
			// Fetch all rankings
			const rankings = await RankingFetcher.getAllRankings(currentGender);
			
			if (!rankings || rankings.length === 0) {
				content.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">No rankings available</div>';
				return;
			}

			const displayRankings = isVnlTournamentMode(activeTournamentType)
				? rankings.filter(team => {
					const vnlStatus = getVnlCountryStatus(team.teamName || '');
					return !!vnlStatus;
				})
				: rankings;

			if (!displayRankings.length) {
				content.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">No teams in selected tournament filter</div>';
				return;
			}
			
			// Generate leaderboard HTML - cleaner table-like presentation
			const vnlState = VNL_SEASON_STATE[currentGender] || createEmptyVnlSeasonState();
			const vnlSeasonSummary = isVnlTournamentMode(activeTournamentType) && vnlState.activeTeams.length
				? `VNL ${vnlState.seasonYear}`
				: '';
			const rowsHtml = displayRankings.map((team, index) => {
				const rank = team.rank || index + 1;
				const flagUrl = `https://flagcdn.com/w40/${(team.teamCode || '').toLowerCase()}.png`;
				const points = team.wrs?.toFixed(2) || '—';
				const teamName = team.teamName || 'Unknown';
				const vnlStatus = isVnlTournamentMode(activeTournamentType) ? getVnlCountryStatus(teamName) : null;
				const isVnlTeam = !!(vnlStatus && vnlStatus.status !== 'relegated');
				const medalTier = getWorldRankMedalTier(rank, activeTournamentType);
				const rowClasses = [];
				if (isVnlTeam) rowClasses.push('vnl-team-row');
				if (vnlStatus?.status === 'newcomer') rowClasses.push('vnl-newcomer-row');
				if (vnlStatus?.status === 'relegated') rowClasses.push('vnl-relegated-row');
				if (medalTier) rowClasses.push(`rank-${medalTier}`);
				const vnlClass = rowClasses.length ? ` ${rowClasses.join(' ')}` : '';
				let vnlBadge = '';
				if (isVnlTeam) {
					vnlBadge = '<span class="team-vnl-badge"><i class="fa-solid fa-trophy"></i>VNL</span>';
					if (vnlStatus?.isDefendingChampion) {
						vnlBadge += '<span class="team-vnl-badge champion"><i class="fa-solid fa-crown"></i>Champion</span>';
					}
					if (vnlStatus?.status === 'newcomer') {
						vnlBadge += '<span class="team-vnl-badge newcomer"><i class="fa-solid fa-arrow-up"></i>Newcomer</span>';
					}
				}
				let rankClass = '';
				if (rank === 1) rankClass = 'top1';
				else if (rank === 2) rankClass = 'top2';
				else if (rank === 3) rankClass = 'top3';
				
				return `
					<div class="leaderboard-row leaderboard-item${vnlClass}" data-country="${teamName}" data-vnl="${isVnlTeam ? '1' : '0'}">
						<div><span class="rank-pill ${rankClass}">${rank}</span></div>
						<div class="team-cell">
							<img src="${flagUrl}" alt="" class="team-flag" onerror="this.style.visibility='hidden'">
							<span class="team-name">${teamName}</span>
							${vnlBadge}
						</div>
						<div class="team-points">${points}</div>
					</div>
				`;
			}).join('');

			content.innerHTML = `
				${activeTournamentType ? `<div class="leaderboard-tour-banner"><i class="fa-solid fa-volleyball"></i><span>Tournament Focus: ${getTournamentLabel(activeTournamentType)}</span>${vnlSeasonSummary ? `<span class="leaderboard-tour-sub">${vnlSeasonSummary}</span>` : ''}</div>` : ''}
				<div class="leaderboard-table-head">
					<span>Rank</span>
					<span>Team</span>
					<span style="text-align:right;">Points</span>
				</div>
				${rowsHtml}
			`;
			
			// Keep modal list read-only when opened directly.
			
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
		document.body.classList.remove('mobile-leaderboard-open');
		document.body.classList.remove('mobile-tournament-open');
		syncOverlayUiState();
	}

	function showTournamentModal(countryName) {
		const modal = document.getElementById('tournamentModal');
		const content = document.getElementById('tournamentContent');
		const openCountryBtn = document.getElementById('tournamentOpenCountry');
		const tournamentActions = document.querySelector('.tournament-actions');
		if (!modal || !content) return;

		activeTournamentCountry = countryName || '';
		const genderLabel = currentGender === 'women' ? 'Women' : 'Men';
		const headingText = activeTournamentCountry || `${genderLabel} Tournament Overview`;
		const title = document.getElementById('tournamentTitle');
		if (title) {
			title.textContent = getTournamentLabel(activeTournamentType || 'vnl');
		}
		const vnlStatus = isVnlTournamentMode(activeTournamentType) ? getVnlCountryStatus(activeTournamentCountry) : null;
		const vnlState = VNL_SEASON_STATE[currentGender] || createEmptyVnlSeasonState();
		const seasonYear = vnlState.seasonYear || new Date().getFullYear();
		const selectedRank = Number(lastSelectedCountryContext?.ranking?.rank);
		const rankTier = getWorldRankMedalTier(selectedRank, activeTournamentType);
		const rankLabel = Number.isFinite(selectedRank) ? `#${selectedRank}` : '—';
		let chipLabel = `${genderLabel} Tournament Team`;
		if (isVnlTournamentMode(activeTournamentType)) {
			if (vnlStatus?.status === 'newcomer') chipLabel = `${genderLabel} VNL Newcomer`;
			else if (vnlStatus?.status === 'relegated') chipLabel = `${genderLabel} Relegated Team`;
			else chipLabel = `${genderLabel} VNL Team`;
		}

		const transitionSummary = isVnlTournamentMode(activeTournamentType)
			? `
				<div class="tournament-transition">
					<div class="tournament-transition-row"><span>Season</span><strong>VNL ${seasonYear}</strong></div>
				</div>
			`
			: '';

		if (openCountryBtn) {
			openCountryBtn.style.display = activeTournamentCountry ? 'inline-flex' : 'none';
		}
		if (tournamentActions) {
			tournamentActions.classList.toggle('is-hidden', !activeTournamentCountry);
		}

		content.innerHTML = `
			<div class="tournament-team-row">
				<div class="tournament-chip"><i class="fa-solid fa-trophy"></i><span>${chipLabel}</span></div>
				<h4>${headingText}</h4>
			</div>
			<div class="tournament-list">
				<div class="tournament-item"><span>World Rank</span><strong>${rankLabel}</strong></div>
				<div class="tournament-item"><span>Podium Tier</span><strong>${rankTier ? rankTier.toUpperCase() : 'STANDARD'}</strong></div>
				<div class="tournament-item"><span>Current Season</span><strong>VNL ${seasonYear}</strong></div>
				<div class="tournament-item"><span>Defending Champion</span><strong>${vnlState.defendingChampionName || 'Unknown'}</strong></div>
			</div>
			${transitionSummary}
		`;

		modal.classList.remove('opacity-0', 'pointer-events-none');
		if (isMobileViewport()) {
			document.body.classList.add('mobile-tournament-open');
		}
		syncOverlayUiState();
	}

	function hideTournamentModal() {
		const modal = document.getElementById('tournamentModal');
		const openCountryBtn = document.getElementById('tournamentOpenCountry');
		const tournamentActions = document.querySelector('.tournament-actions');
		if (modal) {
			modal.classList.add('opacity-0', 'pointer-events-none');
		}
		if (openCountryBtn) {
			openCountryBtn.style.display = 'none';
		}
		if (tournamentActions) {
			tournamentActions.classList.add('is-hidden');
		}
		activeTournamentCountry = '';
		document.body.classList.remove('mobile-tournament-open');
		syncOverlayUiState();
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
		// Open the card immediately so click feedback is instant.
		try {
			showCountryCard(countryName, countryId, null);
		} catch (error) {
			console.error('Failed to show country card placeholder:', error);
		}

		// Fetch live ranking from FIVB API
		let ranking = null;
		try {
			ranking = await RankingFetcher.getCountryRanking(countryName, currentGender);
		} catch (error) {
			console.error('Failed to fetch ranking:', error);
		}
		
		// Refresh card with ranking data when available.
		try {
			showCountryCard(countryName, countryId, ranking);
		} catch (error) {
			console.error('Failed to render country card:', error);
			try {
				showCountryCard(countryName, countryId, null);
			} catch (fallbackError) {
				console.error('Fallback country card render failed:', fallbackError);
			}
		}
	}
	
	/**
	 * Show country card with ranking data
	 */
	function showCountryCard(countryName, countryId, ranking) {
		const card = document.querySelector('.country-card');
		if (!card) return;
		disposeVnlStatusPopupAnimation();
		clearVnlCardPreviewTimer();
		lastSelectedCountryContext = {
			countryName,
			countryId,
			ranking: ranking || null
		};
		
		const flagBase = (typeof API_CONFIG !== 'undefined' && API_CONFIG?.flags?.primary)
			? API_CONFIG.flags.primary
			: 'https://flagcdn.com/w320/';
		const iso2CodeRaw = (typeof DataLoader !== 'undefined' && typeof DataLoader.getIso2Code === 'function')
			? DataLoader.getIso2Code(countryId)
			: '';
		const iso2Code = (typeof iso2CodeRaw === 'string' && iso2CodeRaw.length === 2)
			? iso2CodeRaw.toLowerCase()
			: 'un';
		const flagUrl = `${flagBase}${iso2Code}.png`;
		
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

		const isVnlMode = isVnlTournamentMode(activeTournamentType);
		const vnlStatus = isVnlMode ? getVnlCountryStatus(countryName) : null;
		const medalTier = getWorldRankMedalTier(ranking?.rank, activeTournamentType);
		const isChampion = !!(vnlStatus?.isDefendingChampion && vnlStatus?.status !== 'relegated');
		const isRelegated = vnlStatus?.status === 'relegated';
		const numericRank = Number(ranking?.rank);
		const isWorldNumberOne = Number.isFinite(numericRank) && numericRank === 1;
		const shouldRenderVnlTopBanner = isVnlMode && !!vnlStatus;
		const countryCode = resolveCountryCode(countryName, ranking);
		const teamMeta = medalsData[countryCode] || null;
		const isBannedTeam = !!teamMeta?.banned;
		card.classList.remove(
			'world-rank-gold-card',
			'world-rank-silver-card',
			'world-rank-bronze-card',
			'vnl-active-card',
			'vnl-newcomer-card',
			'vnl-relegated-card',
			'vnl-past-relegated-card',
			'vnl-preview-static',
			'vnl-body-led-newcomer',
			'vnl-body-led-relegated',
			'vnl-body-led-champion'
		);
		const isActiveVnlTeam = shouldRenderVnlTopBanner && !isChampion && !isRelegated && vnlStatus?.status !== 'newcomer';
		card.classList.toggle('vnl-active-card', isActiveVnlTeam);
		card.classList.toggle('vnl-champion-card', shouldRenderVnlTopBanner && isChampion);
		card.classList.toggle('vnl-newcomer-card', shouldRenderVnlTopBanner && vnlStatus?.status === 'newcomer');
		card.classList.toggle('vnl-relegated-card', shouldRenderVnlTopBanner && isRelegated);
		card.classList.toggle('vnl-past-relegated-card', shouldRenderVnlTopBanner && isRelegated);
		card.classList.toggle('vnl-body-led-newcomer', shouldRenderVnlTopBanner && vnlStatus?.status === 'newcomer');
		card.classList.toggle('vnl-body-led-relegated', shouldRenderVnlTopBanner && isRelegated);
		card.classList.toggle('vnl-body-led-champion', shouldRenderVnlTopBanner && isChampion);
		if (isChampion || isWorldNumberOne) {
			card.classList.add('world-rank-gold-card');
		} else if (!vnlStatus || vnlStatus.status === 'active') {
			if (medalTier === 'silver') {
				card.classList.add('world-rank-silver-card');
			} else if (medalTier === 'bronze') {
				card.classList.add('world-rank-bronze-card');
			}
		}

		clearChampionTopBanner(card);
		if (shouldRenderVnlTopBanner) {
			renderVnlTopBanner(card, vnlStatus, countryName, ranking);
		}
		scheduleVnlPreviewReset(card, vnlStatus);
		
		// Build card body content
		const cardBody = card.querySelector('.card-body');
		if (!cardBody) return;
		
		let bodyHtml = '<p class="text-gray-500 text-sm">No ranking data available</p>';
		if (isBannedTeam) {
			const bannedYear = Number(teamMeta?.bannedYear);
			const bannedYearLabel = Number.isFinite(bannedYear) ? ` (${bannedYear})` : '';
			bodyHtml = `
				<div class="team-status-panel banned">
					<div class="team-status-icon"><i class="fa-solid fa-skull-crossbones" aria-hidden="true"></i></div>
					<div class="team-status-copy">
						<h4>Banned / Suspended Team${bannedYearLabel}</h4>
						<p>Competition activity is blocked due to war-related sanctions (Russia/Belarus suspension policy).</p>
					</div>
				</div>
			`;
		} else if (ranking) {
			const safeRank = Number.isFinite(ranking.rank) ? ranking.rank : '—';
			const safePoints = Number.isFinite(ranking.points) ? ranking.points.toFixed(2) : '—';
			const matchHistoryHtml = generateMatchHistory(ranking.pointsProgression);
			const sparklineHtml = generateSparkline(ranking.pointsProgression);
			
			bodyHtml = `
				<div class="flex items-center justify-between mb-3">
					<div>
						<p class="text-xs text-gray-400 uppercase">World Rank</p>
						<p class="text-2xl font-bold text-gray-900">#${safeRank}</p>
					</div>
					<div class="text-right">
						<p class="text-xs text-gray-400 uppercase">Points</p>
						<p class="text-xl font-semibold text-gray-700">${safePoints}</p>
					</div>
				</div>
				${matchHistoryHtml}
				${sparklineHtml}
			`;
		} else {
			bodyHtml = `
				<div class="team-status-panel inactive">
					<div class="team-status-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>
					<div class="team-status-copy">
						<h4><span class="inactive-404">404</span> No Active Data</h4>
						<p>Ranking data not found for this federation in the current feed.</p>
					</div>
				</div>
			`;
		}
		
		cardBody.innerHTML = bodyHtml;
		
		// Show card
		card.classList.add('show');
		applyMobileCountryLayout(true);
		hideVnlStatusPopup();
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
		const width = 300;
		const height = 60;
		const padding = 8;
		
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
			<div class="points-trend-shell mt-3 overflow-visible relative">
				<div class="points-trend-head">
					<span class="points-trend-title">Points Trend</span>
					<span class="sparkline-value points-trend-value" style="color: ${lineColor}">${changeText} pts</span>
				</div>
				<div class="points-trend-chart-wrap" style="height: 76px;">
					<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="display:block; width:100%; height:100%;" class="sparkline-chart">
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
			const resultText = isWin ? 'W' : 'L';
			
			// Opponent name
			const opponent = match.opponent || 'Unknown';
			
			// Score display (sets won - sets lost)
			const score = match.score || '';
			const [setsWon, setsLost] = score.split('-');
			
			return `
				<div class="match-row">
					<div class="flex items-center gap-2 min-w-0">
						<span class="match-vs">vs</span>
						<span class="match-opponent">${opponent}</span>
					</div>
					<div class="flex items-center gap-2 shrink-0">
						<div class="text-center min-w-[46px] match-score">
							<span>${setsWon || '-'}</span>
							<span class="text-slate-400 mx-0.5">:</span>
							<span class="text-slate-500">${setsLost || '-'}</span>
						</div>
						<span class="match-badge ${isWin ? 'win' : 'loss'}">${resultText}</span>
					</div>
				</div>
			`;
		}).join('');
		
		return `
			<div class="match-history">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Recent Matches</p>
				<div class="matches-shell">
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
		clearVnlCardPreviewTimer();
		if (card) {
			card.classList.remove('show');
			card.classList.remove('vnl-active-card');
			card.classList.remove('vnl-champion-card');
			card.classList.remove('vnl-newcomer-card', 'vnl-relegated-card', 'vnl-past-relegated-card', 'vnl-preview-static', 'vnl-body-led-newcomer', 'vnl-body-led-relegated', 'vnl-body-led-champion');
			card.classList.remove('world-rank-gold-card', 'world-rank-silver-card', 'world-rank-bronze-card');
			clearChampionTopBanner(card);
		}
		lastSelectedCountryContext = null;
		hideVnlStatusPopup();
		applyMobileCountryLayout(false);
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
		const overlay = document.getElementById('startupOverlay');
		if (!overlay) return;

		if (show) {
			overlay.style.display = 'flex';
			overlay.classList.remove('loaded');
			overlay.setAttribute('aria-hidden', 'false');

			if (!startupAnimationCleanup) {
				const canvas = document.getElementById('startupScene');
				try {
					startupAnimationCleanup = createThreeVolleyballAnimation(canvas, {
						mode: 'loading',
						spinSpeed: 0.02,
						seamColor: 0x1f4aa8,
						ballColor: 0xf8fafc
					});
				} catch (error) {
					console.warn('Startup 3D animation failed, using CSS fallback bounce.', error);
					startupAnimationCleanup = null;
				}
			}
			overlay.classList.toggle('has-three-startup', typeof startupAnimationCleanup === 'function');
			return;
		}

		overlay.classList.add('loaded');
		overlay.classList.remove('has-three-startup');
		overlay.setAttribute('aria-hidden', 'true');
		setTimeout(() => {
			overlay.style.display = 'none';
		}, 650);

		if (typeof startupAnimationCleanup === 'function') {
			startupAnimationCleanup();
		}
		startupAnimationCleanup = null;
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
