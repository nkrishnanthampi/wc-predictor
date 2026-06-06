UPDATE matches
SET home_score = floor(random()*3)::int,
    away_score = floor(random()*3)::int,
    status = 'finished',
    manual_override = true
WHERE stage = 'group';

INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
SELECT p.id, m.id, floor(random()*3)::int, floor(random()*3)::int
FROM profiles p CROSS JOIN matches m
WHERE m.stage = 'group'
ON CONFLICT DO NOTHING;

/* nullify match results */
update matches
SET home_score=NULL, away_score=NULL, manual_override=FALSE, status='scheduled'

/* set random values for results */
UPDATE matches 
SET home_score = floor(random() * 3), 
    away_score = floor(random() * 3),
    manual_override=TRUE,
    status='finished';
    
/* Insert projections */
call create_user_predictions('teekrish@tutanota.com');
call create_user_predictions('nkrishnanthampi@gmail.com');
call create_user_predictions('nkrishnanthampi@googlemail.com');



