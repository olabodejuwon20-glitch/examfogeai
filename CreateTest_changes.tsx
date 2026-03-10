// UPDATED SECTION OF CreateTest.tsx
// Replace your handleGenerate function and add the modal state

// 1. ADD these imports at the top of CreateTest.tsx:
// import { useCredits } from '@/hooks/useCredits';
// import OutOfCreditsModal from '@/components/credits/OutOfCreditsModal';

// 2. ADD this inside your CreateTest component (after existing useState lines):
// const { balance, deductCredit, checkLoyaltyBonus } = useCredits();
// const [showCreditsModal, setShowCreditsModal] = useState(false);

// 3. REPLACE your handleGenerate function with this:

const handleGenerate = async () => {
  if (!content.trim()) {
    toast.error('Please add some content first');
    return;
  }
  if (!title.trim()) {
    toast.error('Please add a title');
    return;
  }
  if (content.trim().length < 50) {
    toast.error('Content is too short. Please provide more material for quality questions.');
    return;
  }

  // ✅ CREDIT CHECK — block if no credits
  if (balance < 1) {
    setShowCreditsModal(true);
    return;
  }

  setLoading(true);

  // ✅ DEDUCT 1 CREDIT before generating
  const deducted = await deductCredit();
  if (!deducted) {
    setShowCreditsModal(true);
    setLoading(false);
    return;
  }

  try {
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({
        user_id: user!.id,
        title: title.trim(),
        source_content: content.trim().substring(0, 50000),
        num_questions: numQuestions,
        duration_minutes: duration,
        question_format: format,
        status: 'generating',
      })
      .select()
      .single();

    if (testError) throw testError;

    toast.info("Generating questions... You'll be notified when ready.");
    navigate(`/test/${test.id}`);

    // Fire generation in background
    supabase.functions.invoke('generate-questions', {
      body: {
        testId: test.id,
        content: content.trim(),
        numQuestions,
      },
    }).catch((err) => {
      console.error('Background generation failed:', err);
    });

    // ✅ CHECK LOYALTY BONUS after generation
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_tests_taken')
      .eq('user_id', user!.id)
      .single();

    const newTotal = (profile?.total_tests_taken || 0) + 1;

    await supabase
      .from('profiles')
      .update({ total_tests_taken: newTotal })
      .eq('user_id', user!.id);

    await checkLoyaltyBonus(newTotal);

  } catch (err: any) {
    toast.error(err.message || 'Failed to create test');
    setLoading(false);
  }
};

// 4. ADD the modal to your JSX return, just before the closing </div> of main:
// <OutOfCreditsModal open={showCreditsModal} onClose={() => setShowCreditsModal(false)} />

// 5. OPTIONALLY show credit balance near the Generate button:
// <p className="text-center text-xs text-muted-foreground mb-2">
//   <Zap className="inline h-3 w-3 mr-1" />
//   {balance} credit{balance !== 1 ? 's' : ''} remaining
// </p>
