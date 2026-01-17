// Enhanced line-art revolving globe with volleyball theme
(function(){
	const width = 960;
	const height = 640;

	const svg = d3.select('#globe').append('svg')
		.attr('viewBox', `0 0 ${width} ${height}`)
		.attr('preserveAspectRatio','xMidYMid meet');

	const projection = d3.geoOrthographic()
		.scale(280)
		.translate([width/2, height/2])
		.clipAngle(90);

	const path = d3.geoPath().projection(projection);

	svg.append('circle').attr('class','sea')
		.attr('cx', width/2).attr('cy', height/2)
		.attr('r', projection.scale());

	const g = svg.append('g');

	// Graticule
	const graticule = d3.geoGraticule10();
	g.append('path').datum(graticule).attr('class','graticule').attr('d', path);

	// Tooltip
	const tooltip = d3.select('body').append('div')
		.attr('class','tooltip')
		.style('position', 'absolute')
		.style('background', 'rgba(0, 0, 0, 0.8)')
		.style('color', 'white')
		.style('padding', '8px 12px')
		.style('border-radius', '4px')
		.style('font-size', '14px')
		.style('font-family', 'Arial, sans-serif')
		.style('pointer-events', 'none')
		.style('z-index', '1000')
		.style('display','none');

	// Country name mapping
	const countryNames = {
		'4': 'Afghanistan', '8': 'Albania', '12': 'Algeria', '16': 'American Samoa',
		'20': 'Andorra', '24': 'Angola', '28': 'Antigua and Barbuda', '31': 'Azerbaijan',
		'32': 'Argentina', '36': 'Australia', '40': 'Austria', '44': 'Bahamas',
		'48': 'Bahrain', '50': 'Bangladesh', '51': 'Armenia', '52': 'Barbados',
		'56': 'Belgium', '60': 'Bermuda', '64': 'Bhutan', '68': 'Bolivia',
		'70': 'Bosnia and Herzegovina', '72': 'Botswana', '76': 'Brazil', '84': 'Belize',
		'90': 'Solomon Islands', '96': 'Brunei', '100': 'Bulgaria', '104': 'Myanmar',
		'108': 'Burundi', '112': 'Belarus', '116': 'Cambodia', '120': 'Cameroon',
		'124': 'Canada', '132': 'Cape Verde', '140': 'Central African Republic',
		'144': 'Sri Lanka', '148': 'Chad', '152': 'Chile', '156': 'China',
		'170': 'Colombia', '174': 'Comoros', '178': 'Congo', '180': 'Democratic Republic of the Congo',
		'188': 'Costa Rica', '191': 'Croatia', '192': 'Cuba', '196': 'Cyprus',
		'203': 'Czech Republic', '204': 'Benin', '208': 'Denmark', '212': 'Dominica',
		'214': 'Dominican Republic', '218': 'Ecuador', '222': 'El Salvador', '226': 'Equatorial Guinea',
		'231': 'Ethiopia', '232': 'Eritrea', '233': 'Estonia', '242': 'Fiji',
		'246': 'Finland', '250': 'France', '266': 'Gabon', '268': 'Georgia',
		'270': 'Gambia', '276': 'Germany', '288': 'Ghana', '300': 'Greece',
		'304': 'Greenland', '308': 'Grenada', '320': 'Guatemala', '324': 'Guinea',
		'328': 'Guyana', '332': 'Haiti', '340': 'Honduras', '348': 'Hungary',
		'352': 'Iceland', '356': 'India', '360': 'Indonesia', '364': 'Iran',
		'368': 'Iraq', '372': 'Ireland', '376': 'Israel', '380': 'Italy',
		'384': 'Ivory Coast', '388': 'Jamaica', '392': 'Japan', '398': 'Kazakhstan',
		'400': 'Jordan', '404': 'Kenya', '408': 'North Korea', '410': 'South Korea',
		'414': 'Kuwait', '417': 'Kyrgyzstan', '418': 'Laos', '422': 'Lebanon',
		'426': 'Lesotho', '428': 'Latvia', '430': 'Liberia', '434': 'Libya',
		'440': 'Lithuania', '442': 'Luxembourg', '450': 'Madagascar', '454': 'Malawi',
		'458': 'Malaysia', '462': 'Maldives', '466': 'Mali', '470': 'Malta',
		'478': 'Mauritania', '480': 'Mauritius', '484': 'Mexico', '496': 'Mongolia',
		'498': 'Moldova', '499': 'Montenegro', '504': 'Morocco', '508': 'Mozambique',
		'512': 'Oman', '516': 'Namibia', '524': 'Nepal', '528': 'Netherlands',
		'554': 'New Zealand', '558': 'Nicaragua', '562': 'Niger', '566': 'Nigeria',
		'578': 'Norway', '586': 'Pakistan', '591': 'Panama', '598': 'Papua New Guinea',
		'600': 'Paraguay', '604': 'Peru', '608': 'Philippines', '616': 'Poland',
		'620': 'Portugal', '624': 'Guinea-Bissau', '626': 'Timor-Leste', '630': 'Puerto Rico',
		'634': 'Qatar', '642': 'Romania', '643': 'Russia', '646': 'Rwanda',
		'682': 'Saudi Arabia', '686': 'Senegal', '688': 'Serbia', '690': 'Seychelles',
		'694': 'Sierra Leone', '702': 'Singapore', '703': 'Slovakia', '704': 'Vietnam',
		'705': 'Slovenia', '706': 'Somalia', '710': 'South Africa', '716': 'Zimbabwe',
		'724': 'Spain', '728': 'South Sudan', '729': 'Sudan', '732': 'Western Sahara',
		'740': 'Suriname', '748': 'Swaziland', '752': 'Sweden', '756': 'Switzerland',
		'760': 'Syria', '762': 'Tajikistan', '764': 'Thailand', '768': 'Togo',
		'776': 'Tonga', '780': 'Trinidad and Tobago', '784': 'United Arab Emirates',
		'788': 'Tunisia', '792': 'Turkey', '795': 'Turkmenistan', '800': 'Uganda',
		'804': 'Ukraine', '807': 'North Macedonia', '818': 'Egypt', '826': 'United Kingdom',
		'834': 'Tanzania', '840': 'United States', '854': 'Burkina Faso', '858': 'Uruguay',
		'860': 'Uzbekistan', '862': 'Venezuela', '882': 'Samoa', '887': 'Yemen',
		'894': 'Zambia'
	};

	// ISO3 to ISO2 country code mapping for flags
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

	function getCountryName(feature){
		const id = feature.id ? feature.id.toString().replace(/^0+/, '') : feature.id;
		if (countryNames[id]) {
			return countryNames[id];
		}
		const props = feature.properties || {};
		const nameOptions = [
			props.NAME, props.name, props.NAME_EN, props.NAME_LONG,
			props.ADMIN, props.admin, props.NAME_SORT, props.NAME_LOCAL,
			props.SOVEREIGNT, props.GEOUNIT
		];
		for (let name of nameOptions) {
			if (name && typeof name === 'string' && name.trim()) {
				return name.trim();
			}
		}
		return feature.id ? `Country ID: ${feature.id}` : 'Unknown Country';
	}

	// Load TopoJSON
	d3.json('world-110m.json').then(topology => {
		const countries = topojson.feature(topology, topology.objects.countries).features;

		const pinGroup = g.append('g').attr('class', 'pins');

		// Create invisible country areas for hover detection
		const countryAreas = g.selectAll('path.country-area').data(countries).enter().append('path')
			.attr('class','country-area')
			.attr('d', path)
			.style('fill', 'transparent')
			.style('stroke', 'none')
			.style('cursor', 'pointer');

		// Create visible country outlines
		const lands = g.selectAll('path.land').data(countries).enter().append('path')
			.attr('class','land')
			.attr('d', path)
			.style('pointer-events', 'none');

		// Sample volleyball stats
		const volleyballData = {
			'840': { ranking: 1, players: '50K+', tournaments: 120 },
			'76': { ranking: 2, players: '45K+', tournaments: 95 },
			'616': { ranking: 3, players: '30K+', tournaments: 80 },
			'380': { ranking: 5, players: '28K+', tournaments: 75 },
			'392': { ranking: 8, players: '35K+', tournaments: 85 },
			'156': { ranking: 4, players: '60K+', tournaments: 100 },
			'default': { ranking: '—', players: '—', tournaments: '—' }
		};

		let selectedCountry = null;
		let selectedCentroid = null;
		let autoRotate = true;

		function showCards(countryName, countryId) {
			selectedCountry = countryId;
			autoRotate = false;
			
			const stats = volleyballData[countryId] || volleyballData['default'];
			
			document.getElementById('countryName').textContent = countryName;
			const flagContainer = document.getElementById('flagContainer');
			
			const iso2Code = iso3ToIso2[countryId] || 'XX';
			
			flagContainer.innerHTML = `
				<img 
					src="https://flagcdn.com/w320/${iso2Code.toLowerCase()}.png" 
					alt="${countryName}" 
					onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Flag_of_None.svg/320px-Flag_of_None.svg.png'"
					style="width: 100%; height: 100%; object-fit: contain;"
				>`;
			
			document.getElementById('rankingValue').textContent = stats.ranking;
			document.getElementById('playersValue').textContent = stats.players;
			document.getElementById('tournamentsValue').textContent = stats.tournaments;
			
			setTimeout(() => { document.getElementById('countryCard').classList.add('show'); }, 100);
			setTimeout(() => { document.getElementById('rankingCard').classList.add('show'); }, 200);
			setTimeout(() => { document.getElementById('playersCard').classList.add('show'); }, 300);
			setTimeout(() => { document.getElementById('tournamentsCard').classList.add('show'); }, 400);
		}

		function hideCards() {
			selectedCountry = null;
			selectedCentroid = null;
			autoRotate = true;
			
			document.querySelectorAll('.card').forEach(card => card.classList.remove('show'));
			pinGroup.selectAll('*').remove();
		}

		// Close button
		document.getElementById('closeBtn').addEventListener('click', hideCards);

		// Country interactions
		countryAreas
			.on('mouseover', function(e, d) {
				const index = countries.indexOf(d);
				d3.select(lands.nodes()[index]).classed('hover', true);
				const countryName = getCountryName(d);
				tooltip.style('display', 'block').text(countryName);
			})
			.on('mousemove', function(e) {
				tooltip.style('left', (e.pageX + 12) + 'px').style('top', (e.pageY - 28) + 'px');
			})
			.on('mouseout', function(e, d) {
				const index = countries.indexOf(d);
				d3.select(lands.nodes()[index]).classed('hover', false);
				tooltip.style('display', 'none');
			})
			.on('click', function(e, d) {
				const countryName = getCountryName(d);
				const centroid = d3.geoCentroid(d);
				
				selectedCentroid = centroid;
				showCards(countryName, d.id);
				
				pinGroup.selectAll('*').remove();
				
				if (centroid) {
					rotation.lambda = -centroid[0];
					rotation.phi = -centroid[1];
					projection.rotate([rotation.lambda, rotation.phi]);
					render();
					
					const pinCoords = projection(centroid);
					if (pinCoords) {
						const pin = pinGroup.append('g')
							.attr('class', 'volleyball-pin')
							.attr('transform', `translate(${pinCoords[0]},${pinCoords[1]})`);
						
						pin.append('line')
							.attr('x1', 0).attr('y1', 0)
							.attr('x2', 0).attr('y2', -35)
							.attr('stroke', '#ffd700')
							.attr('stroke-width', 3.5)
							.style('opacity', 1);
						
						pin.append('circle')
							.attr('cx', 0).attr('cy', -35)
							.attr('r', 12)
							.attr('fill', '#fff')
							.attr('stroke', '#ffd700')
							.attr('stroke-width', 2.5)
							.style('opacity', 1);
						
						pin.append('path')
							.attr('d', 'M-8,-35 Q0,-28 8,-35 M-8,-35 Q0,-42 8,-35')
							.attr('stroke', '#333')
							.attr('stroke-width', 2)
							.attr('fill', 'none')
							.style('opacity', 1);
					}
				}
			});

		// Initial rotate animation
		let rotation = { lambda: 0, phi: -10 };
		projection.rotate([rotation.lambda, rotation.phi]);
		svg.call(d3.drag().on('drag', dragged));
		svg.call(d3.zoom().scaleExtent([0.6, 2]).on('zoom', zoomed));

		function render(){
			g.selectAll('path').attr('d', path);
			svg.select('circle.sea').attr('r', projection.scale()).attr('cx', width/2).attr('cy', height/2);
			
			if (selectedCentroid) {
				pinGroup.selectAll('*').remove();
				const pinCoords = projection(selectedCentroid);
				if (pinCoords) {
					const pin = pinGroup.append('g')
						.attr('class', 'volleyball-pin')
						.attr('transform', `translate(${pinCoords[0]},${pinCoords[1]})`);
					
					pin.append('line')
						.attr('x1', 0).attr('y1', 0)
						.attr('x2', 0).attr('y2', -35)
						.attr('stroke', '#ffd700')
						.attr('stroke-width', 3.5)
						.style('opacity', 1);
					
					pin.append('circle')
						.attr('cx', 0).attr('cy', -35)
						.attr('r', 12)
						.attr('fill', '#fff')
						.attr('stroke', '#ffd700')
						.attr('stroke-width', 2.5)
						.style('opacity', 1);
					
					pin.append('path')
						.attr('d', 'M-8,-35 Q0,-28 8,-35 M-8,-35 Q0,-42 8,-35')
						.attr('stroke', '#333')
						.attr('stroke-width', 2)
						.attr('fill', 'none')
						.style('opacity', 1);
				}
			}
		}

		function dragged(event){
			const deltaX = event.dx;
			const deltaY = event.dy;
			const sensitivity = 0.25;
			rotation.lambda += deltaX * sensitivity;
			rotation.phi += -deltaY * sensitivity;
			rotation.phi = Math.max(-90, Math.min(90, rotation.phi));
			projection.rotate([rotation.lambda, rotation.phi]);
			render();
		}

		function zoomed(event){
			projection.scale(event.transform.k * 280);
			render();
		}

		let lastTime = Date.now();
		function tick(){
			const now = Date.now();
			const deltaTime = now - lastTime;
			lastTime = now;
			if(autoRotate && !selectedCountry){ 
				rotation.lambda += 0.02 * deltaTime / 16; 
				projection.rotate([rotation.lambda, rotation.phi]); 
				render(); 
			}
			requestAnimationFrame(tick);
		}
		tick();

		svg.on('mousedown touchstart', ()=> autoRotate = false);
		svg.on('mouseup touchend mouseleave', ()=> { if(!selectedCountry) autoRotate = true; });

		// Gender toggle
		const genderToggle = document.getElementById('genderToggle');
		if (genderToggle) {
			genderToggle.addEventListener('click', function() {
				const currentGender = this.getAttribute('data-gender');
				const newGender = currentGender === 'men' ? 'women' : 'men';
				
				this.setAttribute('data-gender', newGender);
				this.textContent = newGender === 'men' ? 'Men' : 'Women';
				
				document.body.className = newGender;
			});
		}

	}).catch(err => {
		console.error('TopoJSON load failed:', err);
		svg.append('text').attr('x',20).attr('y',40).attr('fill','#fff').text('Failed to load world map data');
	});

})();

