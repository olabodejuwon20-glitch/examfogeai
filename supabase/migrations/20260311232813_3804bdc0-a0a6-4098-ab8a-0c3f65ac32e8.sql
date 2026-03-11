-- 1. Drop test_results INSERT policy to force all inserts through submit_test_answers RPC
DROP POLICY IF EXISTS "Users can insert own results" ON public.test_results;

-- 2. Create RPC to fetch questions WITHOUT correct_answer for active tests
CREATE OR REPLACE FUNCTION public.get_test_questions(p_test_id uuid)
RETURNS TABLE(
  id uuid,
  test_id uuid,
  question_number integer,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the test belongs to the caller
  IF NOT EXISTS (SELECT 1 FROM public.tests t WHERE t.id = p_test_id AND t.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Test not found or not owned by user';
  END IF;

  RETURN QUERY
  SELECT q.id, q.test_id, q.question_number, q.question_text,
         q.option_a, q.option_b, q.option_c, q.option_d, q.explanation
  FROM public.questions q
  WHERE q.test_id = p_test_id
  ORDER BY q.question_number;
END;
$$;