-- 1. Restrict add_credits to service_role only
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, text) TO service_role;

-- 2. Drop direct SELECT on questions so correct_answer is only accessible via RPCs
DROP POLICY IF EXISTS "Users can view questions for own tests" ON public.questions;