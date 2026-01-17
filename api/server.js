const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Sample volleyball countries data
const countriesData = {
	men: [
		{ id: '616', name: 'Poland', rank: 1, points: 391.56, flag: 'pl' },
		{ id: '380', name: 'Italy', rank: 2, points: 370.14, flag: 'it' },
		{ id: '840', name: 'United States', rank: 3, points: 365.95, flag: 'us' },
		{ id: '076', name: 'Brazil', rank: 4, points: 352.69, flag: 'br' },
		{ id: '392', name: 'Japan', rank: 5, points: 347.52, flag: 'jp' },
		{ id: '250', name: 'France', rank: 6, points: 342.18, flag: 'fr' },
		{ id: '688', name: 'Serbia', rank: 7, points: 335.77, flag: 'rs' },
		{ id: '032', name: 'Argentina', rank: 8, points: 328.45, flag: 'ar' },
		{ id: '276', name: 'Germany', rank: 9, points: 315.23, flag: 'de' },
		{ id: '528', name: 'Netherlands', rank: 10, points: 308.91, flag: 'nl' }
	],
	women: [
		{ id: '840', name: 'United States', rank: 1, points: 389.45, flag: 'us' },
		{ id: '076', name: 'Brazil', rank: 2, points: 373.88, flag: 'br' },
		{ id: '380', name: 'Italy', rank: 3, points: 358.19, flag: 'it' },
		{ id: '156', name: 'China', rank: 4, points: 351.77, flag: 'cn' },
		{ id: '792', name: 'Turkey', rank: 5, points: 345.23, flag: 'tr' },
		{ id: '616', name: 'Poland', rank: 6, points: 338.56, flag: 'pl' },
		{ id: '688', name: 'Serbia', rank: 7, points: 332.41, flag: 'rs' },
		{ id: '392', name: 'Japan', rank: 8, points: 325.18, flag: 'jp' },
		{ id: '528', name: 'Netherlands', rank: 9, points: 318.92, flag: 'nl' },
		{ id: '276', name: 'Germany', rank: 10, points: 312.67, flag: 'de' }
	]
};

// Medals data for countries
const medalsData = {
	'840': { // USA
		olympics: { gold: 3, silver: 3, bronze: 2 },
		worldChampionship: { gold: 0, silver: 2, bronze: 1 },
		continental: { name: 'NORCECA', gold: 7, silver: 3, bronze: 1 }
	},
	'076': { // Brazil
		olympics: { gold: 3, silver: 3, bronze: 2 },
		worldChampionship: { gold: 3, silver: 3, bronze: 2 },
		continental: { name: 'CSV', gold: 15, silver: 8, bronze: 5 }
	},
	'380': { // Italy
		olympics: { gold: 0, silver: 3, bronze: 3 },
		worldChampionship: { gold: 3, silver: 2, bronze: 2 },
		continental: { name: 'CEV', gold: 6, silver: 7, bronze: 5 }
	},
	'616': { // Poland
		olympics: { gold: 1, silver: 0, bronze: 2 },
		worldChampionship: { gold: 3, silver: 0, bronze: 1 },
		continental: { name: 'CEV', gold: 1, silver: 3, bronze: 7 }
	},
	'156': { // China
		olympics: { gold: 3, silver: 2, bronze: 1 },
		worldChampionship: { gold: 2, silver: 1, bronze: 3 },
		continental: { name: 'AVC', gold: 13, silver: 4, bronze: 2 }
	}
};

// Routes
// Get all countries for a specific gender
app.get('/api/rankings/:gender', (req, res) => {
	const { gender } = req.params;
	
	if (gender !== 'men' && gender !== 'women') {
		return res.status(400).json({ error: 'Gender must be "men" or "women"' });
	}
	
	res.json({
		success: true,
		gender: gender,
		data: countriesData[gender]
	});
});

// Get specific country data
app.get('/api/country/:id', (req, res) => {
	const { id } = req.params;
	
	// Search in both men and women
	const menCountry = countriesData.men.find(c => c.id === id);
	const womenCountry = countriesData.women.find(c => c.id === id);
	
	if (!menCountry && !womenCountry) {
		return res.status(404).json({ error: 'Country not found' });
	}
	
	res.json({
		success: true,
		data: {
			men: menCountry || null,
			women: womenCountry || null
		}
	});
});

// Get medals for a country
app.get('/api/medals/:id', (req, res) => {
	const { id } = req.params;
	
	const medals = medalsData[id];
	
	if (!medals) {
		return res.status(404).json({ 
			success: false,
			error: 'No medal data available for this country' 
		});
	}
	
	res.json({
		success: true,
		data: medals
	});
});

// Get all medals
app.get('/api/medals', (req, res) => {
	res.json({
		success: true,
		data: medalsData
	});
});

// Calculate ranking difference between men and women
app.post('/api/compare', (req, res) => {
	const { countryId } = req.body;
	
	if (!countryId) {
		return res.status(400).json({ error: 'Country ID required' });
	}
	
	const menCountry = countriesData.men.find(c => c.id === countryId);
	const womenCountry = countriesData.women.find(c => c.id === countryId);
	
	if (!menCountry && !womenCountry) {
		return res.status(404).json({ error: 'Country not found' });
	}
	
	res.json({
		success: true,
		data: {
			men: menCountry || null,
			women: womenCountry || null,
			comparison: {
				menRank: menCountry?.rank || null,
				womenRank: womenCountry?.rank || null,
				rankDifference: menCountry && womenCountry ? Math.abs(menCountry.rank - womenCountry.rank) : null,
				menHigher: menCountry && womenCountry ? menCountry.rank < womenCountry.rank : null,
				pointsDifference: menCountry && womenCountry ? Math.abs(menCountry.points - womenCountry.points) : null
			}
		}
	});
});

// Calculate average points for top N countries
app.get('/api/stats/average/:gender/:count', (req, res) => {
	const { gender, count } = req.params;
	const limit = parseInt(count) || 10;
	
	if (gender !== 'men' && gender !== 'women') {
		return res.status(400).json({ error: 'Gender must be "men" or "women"' });
	}
	
	const countries = countriesData[gender];
	const topCountries = countries.slice(0, Math.min(limit, countries.length));
	
	const totalPoints = topCountries.reduce((sum, c) => sum + c.points, 0);
	const averagePoints = (totalPoints / topCountries.length).toFixed(2);
	
	res.json({
		success: true,
		data: {
			gender: gender,
			topCount: topCountries.length,
			countries: topCountries,
			statistics: {
				totalPoints: totalPoints.toFixed(2),
				averagePoints: averagePoints,
				highestPoints: Math.max(...topCountries.map(c => c.points)).toFixed(2),
				lowestPoints: Math.min(...topCountries.map(c => c.points)).toFixed(2)
			}
		}
	});
});

// Get medal count summary
app.get('/api/medal-summary', (req, res) => {
	const summary = {};
	
	Object.keys(medalsData).forEach(countryId => {
		const medals = medalsData[countryId];
		const country = countriesData.men.find(c => c.id === countryId) || countriesData.women.find(c => c.id === countryId);
		
		if (country) {
			const totalOlympic = (medals.olympics.gold || 0) + (medals.olympics.silver || 0) + (medals.olympics.bronze || 0);
			const totalWorld = (medals.worldChampionship.gold || 0) + (medals.worldChampionship.silver || 0) + (medals.worldChampionship.bronze || 0);
			const totalContinental = (medals.continental.gold || 0) + (medals.continental.silver || 0) + (medals.continental.bronze || 0);
			
			summary[country.name] = {
				countryId: countryId,
				olympicMedals: totalOlympic,
				worldChampionshipMedals: totalWorld,
				continentalMedals: totalContinental,
				totalMedals: totalOlympic + totalWorld + totalContinental
			};
		}
	});
	
	res.json({
		success: true,
		data: summary
	});
})

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
	res.json({
		message: 'Volleyball World Calculator API',
		version: '1.0.0',
		endpoints: {
			rankings: 'GET /api/rankings/:gender (men/women)',
			country: 'GET /api/country/:id',
			compareCountry: 'POST /api/compare (body: {countryId})',
			statsAverage: 'GET /api/stats/average/:gender/:count',
			medals: 'GET /api/medals/:id',
			allMedals: 'GET /api/medals',
			medalSummary: 'GET /api/medal-summary',
			health: 'GET /health'
		}
	});
});

// Start server
app.listen(PORT, () => {
	console.log(`🏐 Volleyball World Calculator API running on http://localhost:${PORT}`);
	console.log(`📊 Available endpoints:`);
	console.log(`   GET /api/rankings/men`);
	console.log(`   GET /api/rankings/women`);
	console.log(`   GET /api/country/:id`);
	console.log(`   POST /api/compare`);
	console.log(`   GET /api/stats/average/:gender/:count`);
	console.log(`   GET /api/medals/:id`);
	console.log(`   GET /api/medal-summary`);
	console.log(`   GET /health`);
});
