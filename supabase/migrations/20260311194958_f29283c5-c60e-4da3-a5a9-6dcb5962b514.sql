-- Drop the overly broad leaderboard policy that exposes all test_results (including answers JSONB)
DROP POLICY IF EXISTS "All authenticated users can view results for leaderboard" ON public.test_results;

-- Create a server-side function to submit test answers and calculate score securely
CREATE OR REPLACE FUNCTION public.submit_test_answers(
  p_test_id uuid,
  p_user_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_correct integer := 0;
  v_total integer := 0;
  v_score numeric;
  v_question record;
  v_user_answer text;
  v_answer_details jsonb := '[]'::jsonb;
  v_result_id uuid;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the test belongs to this user
  IF NOT EXISTS (SELECT 1 FROM public.tests WHERE id = p_test_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Test not found or not owned by user';
  END IF;

  -- Check if already submitted
  IF EXISTS (SELECT 1 FROM public.test_results WHERE test_id = p_test_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Test already submitted';
  END IF;

  -- Calculate score server-side by comparing against stored correct answers
  FOR v_question IN
    SELECT id, question_number, correct_answer
    FROM public.questions
    WHERE test_id = p_test_id
    ORDER BY question_number
  LOOP
    v_total := v_total + 1;
    v_user_answer := p_user_answers ->> v_question.id::text;

    IF v_user_answer IS NOT NULL AND v_user_answer = v_question.correct_answer THEN
      v_correct := v_correct + 1;
      v_answer_details := v_answer_details || jsonb_build_object(
        'question_id', v_question.id,
        'question_number', v_question.question_number,
        'user_answer', v_user_answer,
        'correct_answer', v_question.correct_answer,
        'is_correct', true
      );
    ELSE
      v_answer_details := v_answer_details || jsonb_build_object(
        'question_id', v_question.id,
        'question_number', v_question.question_number,
        'user_answer', COALESCE(v_user_answer, ''),
        'correct_answer', v_question.correct_answer,
        'is_correct', false
      );
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No questions found for this test';
  END IF;

  v_score := (v_correct::numeric / v_total::numeric) * 100;

  -- Insert the result
  INSERT INTO public.test_results (test_id, user_id, score, total_questions, correct_answers, answers, time_taken_seconds)
  VALUES (p_test_id, v_user_id, v_score, v_total, v_correct, v_answer_details, 0)
  RETURNING id INTO v_result_id;

  -- Mark test as completed
  UPDATE public.tests SET status = 'completed' WHERE id = p_test_id;

  RETURN jsonb_build_object(
    'result_id', v_result_id,
    'score', v_score,
    'correct_answers', v_correct,
    'total_questions', v_total
  );
END;
$$;
