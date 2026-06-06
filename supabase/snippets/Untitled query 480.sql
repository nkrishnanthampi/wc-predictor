select * from matches 
where stage='round_of_32'

select m.home_team, m.away_team,p.predicted_home_score, p.predicted_away_score, m.home_score, m.away_score, p.points_awarded 
from predictions p, matches m
where m.id=p.match_id
and m.stage='round_of_32'

select * from profiles