import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Clock, Flag } from 'lucide-react';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
}

export default function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testTitle, setTestTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  // Swipe gesture state
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const questionAreaRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTest();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [testId]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  const loadTest = async () => {
    const { data: test } = await supabase.from('tests').select('*').eq('id', testId).single();
    if (!test) { navigate('/dashboard'); return; }
    setTestTitle(test.title);
    setTimeLeft(test.duration_minutes * 60);

    if (test.status === 'generating') {
      setGenerating(true);
      setLoading(false);
      // Poll every 3 seconds until ready
      pollRef.current = setInterval(async () => {
        const { data: updated } = await supabase.from('tests').select('status').eq('id', testId).single();
        if (updated && updated.status === 'ready') {
          if (pollRef.current) clearInterval(pollRef.current);
          setGenerating(false);
          const { data: qs } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testId)
            .order('question_number');
          if (qs) setQuestions(qs);
          toast.success('Questions are ready! Start your test.');
        }
      }, 3000);
      return;
    }

    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_number');
    if (qs) setQuestions(qs);
    setLoading(false);
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    }, 300);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    let correct = 0;
    const answerDetails = questions.map((q) => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correct++;
      return {
        question_id: q.id,
        question_number: q.question_number,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
      };
    });

    const score = (correct / questions.length) * 100;

    const { error } = await supabase.from('test_results').insert({
      test_id: testId,
      user_id: user!.id,
      score,
      total_questions: questions.length,
      correct_answers: correct,
      time_taken_seconds: 0,
      answers: answerDetails,
    });

    await supabase.from('tests').update({ status: 'completed' }).eq('id', testId);

    if (error) {
      toast.error('Failed to save results');
      setSubmitting(false);
      return;
    }

    navigate(`/results/${testId}`);
  }, [submitting, questions, answers, testId, user, timeLeft, navigate]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) < minSwipeDistance) return;

    if (diff > 0 && currentIndex < questions.length - 1) {
      // Swipe left → next
      setCurrentIndex((i) => i + 1);
    } else if (diff < 0 && currentIndex > 0) {
      // Swipe right → previous
      setCurrentIndex((i) => i - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{testTitle}</h1>
          <p className="text-muted-foreground mb-2">
            {questions.length} questions • {formatTime(timeLeft)} time limit
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            💡 Swipe left/right to navigate between questions
          </p>
          <Button size="lg" className="w-full h-14 text-lg font-semibold" onClick={() => setStarted(true)}>
            Start Test
          </Button>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <span className="font-semibold text-foreground text-sm md:text-base truncate max-w-[200px]">
            {testTitle}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{questions.length}
            </span>
            <div className={`flex items-center gap-1 font-mono font-bold text-sm ${
              timeLeft < 60 ? 'text-destructive' : timeLeft < 300 ? 'text-warning' : 'text-foreground'
            }`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      <Progress value={progress} className="h-1 rounded-none" />

      {/* Question area with swipe */}
      <div
        ref={questionAreaRef}
        className="flex-1 flex items-center justify-center p-4 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-2xl">
          <p className="text-sm text-muted-foreground mb-2">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-6 leading-relaxed">
            {currentQ.question_text}
          </h2>

          <div className="space-y-3">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const optionText = currentQ[`option_${letter.toLowerCase()}` as keyof Question] as string;
              const isSelected = answers[currentQ.id] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => selectAnswer(currentQ.id, letter)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-accent shadow-sm'
                      : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {letter}
                    </span>
                    <span className="text-foreground pt-1">{optionText}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-border bg-card px-4 py-4">
        <div className="container mx-auto max-w-2xl flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>

          {/* Question dots - scrollable on mobile */}
          <div className="flex gap-1 flex-wrap justify-center max-w-[200px] md:max-w-xs overflow-x-auto">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-6 h-6 md:w-7 md:h-7 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
                  i === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[q.id]
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={submitting} className="font-semibold">
              <Flag className="h-4 w-4 mr-1" /> Submit
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
