/**
 * @fileoverview Country data mappings and volleyball statistics
 * @author Volleyball Globe Team
 * @version 1.0.0
 */

/**
 * ISO3 numeric code to country name mapping
 * Comprehensive list of 177 countries with their official names
 * @constant {Object.<string, string>}
 */
export const COUNTRY_NAMES = {
  '4': 'Afghanistan', '8': 'Albania', '12': 'Algeria', '16': 'American Samoa',
  '20': 'Andorra', '24': 'Angola', '28': 'Antigua and Barbuda', '31': 'Azerbaijan',
  '32': 'Argentina', '36': 'Australia', '40': 'Austria', '44': 'Bahamas',
  '48': 'Bahrain', '50': 'Bangladesh', '51': 'Armenia', '52': 'Barbados',
  '56': 'Belgium', '60': 'Bermuda', '64': 'Bhutan', '68': 'Bolivia',
  '70': 'Bosnia and Herzegovina', '72': 'Botswana', '76': 'Brazil', '84': 'Belize',
  '90': 'Solomon Islands', '96': 'Brunei', '100': 'Bulgaria', '104': 'Myanmar',
  '108': 'Burundi', '112': 'Belarus', '116': 'Cambodia', '120': 'Cameroon',
  '124': 'Canada', '132': 'Cape Verde', '136': 'Cayman Islands', '140': 'Central African Republic',
  '144': 'Sri Lanka', '148': 'Chad', '152': 'Chile', '156': 'China',
  '170': 'Colombia', '174': 'Comoros', '178': 'Congo', '180': 'Democratic Republic of the Congo',
  '188': 'Costa Rica', '191': 'Croatia', '192': 'Cuba', '196': 'Cyprus',
  '203': 'Czech Republic', '208': 'Denmark', '212': 'Dominica', '214': 'Dominican Republic',
  '218': 'Ecuador', '222': 'El Salvador', '226': 'Equatorial Guinea', '231': 'Ethiopia',
  '232': 'Eritrea', '233': 'Estonia', '242': 'Fiji', '246': 'Finland',
  '250': 'France', '254': 'French Guiana', '258': 'French Polynesia', '266': 'Gabon',
  '268': 'Georgia', '270': 'Gambia', '276': 'Germany', '288': 'Ghana',
  '292': 'Gibraltar', '296': 'Kiribati', '300': 'Greece', '304': 'Greenland',
  '308': 'Grenada', '312': 'Guadeloupe', '316': 'Guam', '320': 'Guatemala', 
  '324': 'Guinea', '328': 'Guyana', '332': 'Haiti', '340': 'Honduras', 
  '344': 'Hong Kong', '348': 'Hungary', '352': 'Iceland', '356': 'India', 
  '360': 'Indonesia', '364': 'Iran', '368': 'Iraq', '372': 'Ireland', 
  '376': 'Israel', '380': 'Italy', '384': 'Ivory Coast', '388': 'Jamaica', 
  '392': 'Japan', '398': 'Kazakhstan', '400': 'Jordan', '404': 'Kenya', 
  '408': 'North Korea', '410': 'South Korea', '414': 'Kuwait', '417': 'Kyrgyzstan', 
  '418': 'Laos', '422': 'Lebanon', '426': 'Lesotho', '428': 'Latvia', 
  '430': 'Liberia', '434': 'Libya', '438': 'Liechtenstein', '440': 'Lithuania', 
  '442': 'Luxembourg', '446': 'Macau', '450': 'Madagascar', '454': 'Malawi', 
  '458': 'Malaysia', '462': 'Maldives', '466': 'Mali', '470': 'Malta', 
  '474': 'Martinique', '478': 'Mauritania', '480': 'Mauritius', '484': 'Mexico', 
  '492': 'Monaco', '496': 'Mongolia', '498': 'Moldova', '499': 'Montenegro', 
  '504': 'Morocco', '508': 'Mozambique', '512': 'Oman', '516': 'Namibia', 
  '520': 'Nauru', '524': 'Nepal', '528': 'Netherlands', '540': 'New Caledonia', 
  '548': 'Vanuatu', '554': 'New Zealand', '558': 'Nicaragua', '562': 'Niger', 
  '566': 'Nigeria', '578': 'Norway', '580': 'Northern Mariana Islands', '583': 'Micronesia',
  '584': 'Marshall Islands', '585': 'Palau', '586': 'Pakistan', '591': 'Panama', 
  '598': 'Papua New Guinea', '600': 'Paraguay', '604': 'Peru', '608': 'Philippines', 
  '612': 'Pitcairn Islands', '616': 'Poland', '620': 'Portugal', '624': 'Guinea-Bissau', 
  '626': 'Timor-Leste', '630': 'Puerto Rico', '634': 'Qatar', '638': 'Reunion', 
  '642': 'Romania', '643': 'Russia', '646': 'Rwanda', '652': 'Saint Barthelemy',
  '654': 'Saint Helena', '659': 'Saint Kitts and Nevis', '660': 'Anguilla',
  '662': 'Saint Lucia', '663': 'Saint Martin', '666': 'Saint Pierre and Miquelon', 
  '670': 'Saint Vincent and the Grenadines', '674': 'San Marino', '678': 'Sao Tome and Principe', 
  '682': 'Saudi Arabia', '686': 'Senegal', '688': 'Serbia', '690': 'Seychelles', 
  '694': 'Sierra Leone', '702': 'Singapore', '703': 'Slovakia', '704': 'Vietnam', 
  '705': 'Slovenia', '706': 'Somalia', '710': 'South Africa', '716': 'Zimbabwe', 
  '724': 'Spain', '728': 'South Sudan', '732': 'Western Sahara', '736': 'Sudan', 
  '740': 'Suriname', '744': 'Svalbard and Jan Mayen', '748': 'Swaziland', '752': 'Sweden', 
  '756': 'Switzerland', '760': 'Syria', '762': 'Tajikistan', '764': 'Thailand', 
  '768': 'Togo', '772': 'Tokelau', '776': 'Tonga', '780': 'Trinidad and Tobago', 
  '784': 'United Arab Emirates', '788': 'Tunisia', '792': 'Turkey', '795': 'Turkmenistan', 
  '796': 'Turks and Caicos Islands', '798': 'Tuvalu', '800': 'Uganda', '804': 'Ukraine', 
  '807': 'North Macedonia', '818': 'Egypt', '826': 'United Kingdom', '831': 'Guernsey',
  '832': 'Jersey', '833': 'Isle of Man', '834': 'Tanzania', '840': 'United States', 
  '850': 'Virgin Islands', '854': 'Burkina Faso', '858': 'Uruguay', '860': 'Uzbekistan', 
  '862': 'Venezuela', '876': 'Wallis and Futuna', '882': 'Samoa', '887': 'Yemen', 
  '894': 'Zambia'
};

/**
 * ISO3 numeric code to ISO2 alpha code mapping for flag API
 * Used to fetch country flags from flag CDN services
 * @constant {Object.<string, string>}
 */
export const ISO3_TO_ISO2 = {
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

/**
 * Volleyball statistics by country
 * Data includes world rankings, player counts, and tournament numbers
 * @constant {Object.<string, {ranking: number|string, players: string, tournaments: number|string}>}
 * 
 * @example
 * VOLLEYBALL_DATA['840'] // USA data
 * // Returns: { ranking: 1, players: '50K+', tournaments: 120 }
 */
export const VOLLEYBALL_DATA = {
  '840': { ranking: 1, players: '50K+', tournaments: 120 },    // USA
  '076': { ranking: 2, players: '45K+', tournaments: 95 },     // Brazil
  '616': { ranking: 3, players: '30K+', tournaments: 80 },     // Poland
  '380': { ranking: 5, players: '28K+', tournaments: 75 },     // Italy
  '392': { ranking: 8, players: '35K+', tournaments: 85 },     // Japan
  '156': { ranking: 4, players: '60K+', tournaments: 100 },    // China
  'default': { ranking: '—', players: '—', tournaments: '—' }
};
