CREATE OR REPLACE PROCEDURE create_user_predictions(p_email TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
	v_match 							RECORD;
	v_random_home_score		INTEGER;
	v_random_away_score		INTEGER;

	v_user_id							profiles.id%TYPE;
	v_match_id  					matches.id%TYPE;

	v_actual_winner				TEXT;
	v_predicted_winner		TEXT;
	v_points							INTEGER;
BEGIN

	SELECT ID INTO v_user_id FROM profiles WHERE email=p_email;
	IF NOT FOUND then
		RAISE NOTICE 'Invalid user specified.';
	END IF;

	DELETE from predictions where user_id=v_user_id;

	DELETE from matches where generated_for_user_id=v_user_id;

	FOR v_match IN SELECT * FROM matches LOOP
		v_random_home_score:=floor(random() * 3);
		v_random_away_score:=floor(random() * 3);
		v_match_id:=v_match.id;
		
		IF (v_match.home_score > v_match.away_score) THEN
			v_actual_winner:= 'home';
  	elsif (v_match.away_score > v_match.home_score) THEN
			v_actual_winner:='away';
		else
			v_actual_winner:='draw';
		end if;

		IF (v_random_home_score > v_random_away_score) THEN
			v_predicted_winner:= 'home';
  	elsif (v_random_away_score > v_random_home_score) THEN
			v_predicted_winner:='away';
		else
			v_predicted_winner:='draw';
		end if;

		IF v_match.home_score is null and v_match.away_score is null then
			v_points:=0;
		ELSIF v_random_home_score=v_match.home_score AND v_random_away_score=v_match.away_score THEN
			v_points:=2;
		ELSIF v_actual_winner = v_predicted_winner then
			v_points:=1;
		else	
			v_points:=0;
		end if;

		insert into predictions(user_id, match_id, predicted_home_score, predicted_away_score, points_awarded)
		values(v_user_id,v_match_id,v_random_home_score, v_random_away_score, v_points);
		
	END LOOP;

	RAISE NOTICE 'All predictions have been created using randomized values.';

EXCEPTION
	-- Catch specific errors using standard SQLSTATE names or aliases        
	WHEN OTHERS THEN
		-- SQLERRM contains the error message, SQLSTATE contains the code
		RAISE WARNING 'An unexpected error occurred: % (Code: %)', SQLERRM, SQLSTATE;
END;
$$;