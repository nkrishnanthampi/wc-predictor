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



