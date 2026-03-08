
-- Question banks table
CREATE TABLE public.question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question banks" ON public.question_banks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own question banks" ON public.question_banks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own question banks" ON public.question_banks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own question banks" ON public.question_banks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved questions table (linked to banks)
CREATE TABLE public.saved_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved questions" ON public.saved_questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.question_banks WHERE id = saved_questions.bank_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own saved questions" ON public.saved_questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.question_banks WHERE id = saved_questions.bank_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own saved questions" ON public.saved_questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.question_banks WHERE id = saved_questions.bank_id AND user_id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_question_banks_updated_at BEFORE UPDATE ON public.question_banks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
