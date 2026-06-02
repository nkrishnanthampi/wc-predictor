-- 2026 FIFA World Cup Fixtures — Group Stage
-- Real group compositions from the official draw (December 2025)
-- Kickoff times are in UTC. Run in Supabase SQL Editor.

INSERT INTO public.matches (stage, group_name, match_number, home_team, away_team, kickoff_time, status) VALUES

-- GROUP A: Mexico, South Africa, South Korea, Czechia
('group', 'A', 1,  'Mexico',       'South Africa', '2026-06-11 19:00:00+00', 'scheduled'),
('group', 'A', 2,  'South Korea',  'Czechia',       '2026-06-12 02:00:00+00', 'scheduled'),
('group', 'A', 3,  'Mexico',       'South Korea',   '2026-06-17 22:00:00+00', 'scheduled'),
('group', 'A', 4,  'South Africa', 'Czechia',       '2026-06-18 01:00:00+00', 'scheduled'),
('group', 'A', 5,  'Mexico',       'Czechia',       '2026-06-22 23:00:00+00', 'scheduled'),
('group', 'A', 6,  'South Africa', 'South Korea',   '2026-06-22 23:00:00+00', 'scheduled'),

-- GROUP B: Canada, Bosnia and Herzegovina, Qatar, Switzerland
('group', 'B', 7,  'Canada',       'Switzerland',          '2026-06-12 19:00:00+00', 'scheduled'),
('group', 'B', 8,  'Bosnia and Herzegovina', 'Qatar',      '2026-06-12 22:00:00+00', 'scheduled'),
('group', 'B', 9,  'Canada',       'Qatar',                '2026-06-17 19:00:00+00', 'scheduled'),
('group', 'B', 10, 'Switzerland',  'Bosnia and Herzegovina','2026-06-17 22:00:00+00', 'scheduled'),
('group', 'B', 11, 'Canada',       'Bosnia and Herzegovina','2026-06-22 02:00:00+00', 'scheduled'),
('group', 'B', 12, 'Switzerland',  'Qatar',                '2026-06-22 02:00:00+00', 'scheduled'),

-- GROUP C: Brazil, Morocco, Haiti, Scotland
('group', 'C', 13, 'Brazil',       'Morocco',       '2026-06-13 19:00:00+00', 'scheduled'),
('group', 'C', 14, 'Haiti',        'Scotland',      '2026-06-13 22:00:00+00', 'scheduled'),
('group', 'C', 15, 'Brazil',       'Haiti',         '2026-06-18 19:00:00+00', 'scheduled'),
('group', 'C', 16, 'Morocco',      'Scotland',      '2026-06-18 22:00:00+00', 'scheduled'),
('group', 'C', 17, 'Brazil',       'Scotland',      '2026-06-23 23:00:00+00', 'scheduled'),
('group', 'C', 18, 'Morocco',      'Haiti',         '2026-06-23 23:00:00+00', 'scheduled'),

-- GROUP D: USA, Paraguay, Australia, Turkey
('group', 'D', 19, 'USA',          'Paraguay',      '2026-06-14 19:00:00+00', 'scheduled'),
('group', 'D', 20, 'Australia',    'Turkey',        '2026-06-14 22:00:00+00', 'scheduled'),
('group', 'D', 21, 'USA',          'Australia',     '2026-06-19 19:00:00+00', 'scheduled'),
('group', 'D', 22, 'Paraguay',     'Turkey',        '2026-06-19 22:00:00+00', 'scheduled'),
('group', 'D', 23, 'USA',          'Turkey',        '2026-06-24 23:00:00+00', 'scheduled'),
('group', 'D', 24, 'Paraguay',     'Australia',     '2026-06-24 23:00:00+00', 'scheduled'),

-- GROUP E: Germany, Curaçao, Ivory Coast, Ecuador
('group', 'E', 25, 'Germany',      'Ecuador',       '2026-06-14 02:00:00+00', 'scheduled'),
('group', 'E', 26, 'Curaçao',      'Ivory Coast',   '2026-06-15 01:00:00+00', 'scheduled'),
('group', 'E', 27, 'Germany',      'Curaçao',       '2026-06-19 02:00:00+00', 'scheduled'),
('group', 'E', 28, 'Ecuador',      'Ivory Coast',   '2026-06-20 01:00:00+00', 'scheduled'),
('group', 'E', 29, 'Germany',      'Ivory Coast',   '2026-06-25 02:00:00+00', 'scheduled'),
('group', 'E', 30, 'Ecuador',      'Curaçao',       '2026-06-25 02:00:00+00', 'scheduled'),

-- GROUP F: Netherlands, Japan, Sweden, Tunisia
('group', 'F', 31, 'Netherlands',  'Tunisia',       '2026-06-15 19:00:00+00', 'scheduled'),
('group', 'F', 32, 'Japan',        'Sweden',        '2026-06-15 22:00:00+00', 'scheduled'),
('group', 'F', 33, 'Netherlands',  'Japan',         '2026-06-20 19:00:00+00', 'scheduled'),
('group', 'F', 34, 'Sweden',       'Tunisia',       '2026-06-20 22:00:00+00', 'scheduled'),
('group', 'F', 35, 'Netherlands',  'Sweden',        '2026-06-25 23:00:00+00', 'scheduled'),
('group', 'F', 36, 'Japan',        'Tunisia',       '2026-06-25 23:00:00+00', 'scheduled'),

-- GROUP G: Iran, New Zealand, Belgium, Egypt
('group', 'G', 37, 'Belgium',      'Egypt',         '2026-06-16 19:00:00+00', 'scheduled'),
('group', 'G', 38, 'Iran',         'New Zealand',   '2026-06-16 22:00:00+00', 'scheduled'),
('group', 'G', 39, 'Belgium',      'Iran',          '2026-06-21 19:00:00+00', 'scheduled'),
('group', 'G', 40, 'Egypt',        'New Zealand',   '2026-06-21 22:00:00+00', 'scheduled'),
('group', 'G', 41, 'Belgium',      'New Zealand',   '2026-06-26 23:00:00+00', 'scheduled'),
('group', 'G', 42, 'Iran',         'Egypt',         '2026-06-26 23:00:00+00', 'scheduled'),

-- GROUP H: Spain, Cape Verde, Saudi Arabia, Uruguay
('group', 'H', 43, 'Spain',        'Uruguay',       '2026-06-16 02:00:00+00', 'scheduled'),
('group', 'H', 44, 'Cape Verde',   'Saudi Arabia',  '2026-06-17 01:00:00+00', 'scheduled'),
('group', 'H', 45, 'Spain',        'Cape Verde',    '2026-06-21 02:00:00+00', 'scheduled'),
('group', 'H', 46, 'Saudi Arabia', 'Uruguay',       '2026-06-22 01:00:00+00', 'scheduled'),
('group', 'H', 47, 'Spain',        'Saudi Arabia',  '2026-06-27 02:00:00+00', 'scheduled'),
('group', 'H', 48, 'Cape Verde',   'Uruguay',       '2026-06-27 02:00:00+00', 'scheduled'),

-- GROUP I: France, Senegal, Iraq, Norway
('group', 'I', 49, 'France',       'Norway',        '2026-06-17 02:00:00+00', 'scheduled'),
('group', 'I', 50, 'Senegal',      'Iraq',          '2026-06-17 23:00:00+00', 'scheduled'),
('group', 'I', 51, 'France',       'Senegal',       '2026-06-22 19:00:00+00', 'scheduled'),
('group', 'I', 52, 'Iraq',         'Norway',        '2026-06-22 22:00:00+00', 'scheduled'),
('group', 'I', 53, 'France',       'Iraq',          '2026-06-27 23:00:00+00', 'scheduled'),
('group', 'I', 54, 'Senegal',      'Norway',        '2026-06-27 23:00:00+00', 'scheduled'),

-- GROUP J: Argentina, Algeria, Austria, Jordan
('group', 'J', 55, 'Argentina',    'Algeria',       '2026-06-18 02:00:00+00', 'scheduled'),
('group', 'J', 56, 'Austria',      'Jordan',        '2026-06-18 23:00:00+00', 'scheduled'),
('group', 'J', 57, 'Argentina',    'Austria',       '2026-06-23 19:00:00+00', 'scheduled'),
('group', 'J', 58, 'Algeria',      'Jordan',        '2026-06-23 22:00:00+00', 'scheduled'),
('group', 'J', 59, 'Argentina',    'Jordan',        '2026-06-28 23:00:00+00', 'scheduled'),
('group', 'J', 60, 'Algeria',      'Austria',       '2026-06-28 23:00:00+00', 'scheduled'),

-- GROUP K: Portugal, DR Congo, Uzbekistan, Colombia
('group', 'K', 61, 'Portugal',     'Colombia',      '2026-06-19 02:00:00+00', 'scheduled'),
('group', 'K', 62, 'DR Congo',     'Uzbekistan',    '2026-06-19 23:00:00+00', 'scheduled'),
('group', 'K', 63, 'Portugal',     'DR Congo',      '2026-06-24 19:00:00+00', 'scheduled'),
('group', 'K', 64, 'Colombia',     'Uzbekistan',    '2026-06-24 22:00:00+00', 'scheduled'),
('group', 'K', 65, 'Portugal',     'Uzbekistan',    '2026-06-29 23:00:00+00', 'scheduled'),
('group', 'K', 66, 'Colombia',     'DR Congo',      '2026-06-29 23:00:00+00', 'scheduled'),

-- GROUP L: England, Croatia, Ghana, Panama
('group', 'L', 67, 'England',      'Croatia',       '2026-06-20 02:00:00+00', 'scheduled'),
('group', 'L', 68, 'Ghana',        'Panama',        '2026-06-20 23:00:00+00', 'scheduled'),
('group', 'L', 69, 'England',      'Ghana',         '2026-06-25 19:00:00+00', 'scheduled'),
('group', 'L', 70, 'Croatia',      'Panama',        '2026-06-25 22:00:00+00', 'scheduled'),
('group', 'L', 71, 'England',      'Panama',        '2026-06-30 02:00:00+00', 'scheduled'),
('group', 'L', 72, 'Croatia',      'Ghana',         '2026-06-30 02:00:00+00', 'scheduled');
