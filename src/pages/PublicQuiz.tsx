import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Clock, Users, Trophy, ArrowRight, Loader2 } from 'lucide-react';

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

interface TestInfo {
  id: string;
  title: string;
  num_questions: number;
  duration_minutes: number;
  share_code: string;
}

export default function PublicQuiz() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    loadQuiz();
  }, [code]);

  const loadQuiz = async () => {
    if (!code) { setNotFound(true); setLoading(false); return; }

    const { data: testData } = await supabase
      .from('tests')
      .select('id, title, num_questions, duration_minutes, share_code, user_id, is_public')
      .eq('share_code', code)
      .eq('is_public', true)
      .single();

    if (!testData) { setNotFound(true); setLoading(false); return; }
    setTest(testData as TestInfo);

    // Load creator name
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', testData.user_id).single();
    setCreatorName(profile?.display_name || 'Anonymous');

    // Load questions
    const { data: qs } = await supabase.from('questions').select('*').eq('test_id', testData.id).order('question_number');
    if (qs) setQuestions(qs as Question[]);

    // Load attempt count
    const { count } = await supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('share_code', code);
    setAttemptCount(count || 0);

    setLoading(false);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const s = Math.round((correct / questions.length) * 100);
    setScore(s);
    setCorrectCount(correct);
    setSubmitted(true);

    // Log attempt
    await supabase.from('quiz_attempts').insert({
      share_code: code!,
      user_id: user?.id || null,
      score: s,
      total_questions: questions.length,
      correct_answers: correct,
    });
  };

  const getWaecGrade = (s: number) => {
    if (s >= 75) return { grade: 'A1', label: 'Excellent', color: 'text-emerald-500' };
    if (s >= 70) return { grade: 'B2', label: 'Very Good', color: 'text-emerald-500' };
    if (s >= 65) return { grade: 'B3', label: 'Good', color: 'text-blue-500' };
    if (s >= 60) return { grade: 'C4', label: 'Credit', color: 'text-blue-500' };
    if (s >= 55) return { grade: 'C5', label: 'Credit', color: 'text-amber-500' };
    if (s >= 50) return { grade: 'C6', label: 'Credit', color: 'text-amber-500' };
    if (s >= 45) return { grade: 'D7', label: 'Pass', color: 'text-orange-500' };
    if (s >= 40) return { grade: 'E8', label: 'Pass', color: 'text-orange-500' };
    return { grade: 'F9', label: 'Fail', color: 'text-destructive' };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 text-center max-w-md">
        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Quiz Not Found</h1>
        <p className="text-muted-foreground mb-4">This quiz link is invalid or has been removed.</p>
        <Button onClick={() => navigate('/')}>Go to ExamForge</Button>
      </Card>
    </div>
  );

  if (submitted) {
    const grade = getWaecGrade(score);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Trophy className={`h-16 w-16 mx-auto ${grade.color}`} />
          <h1 className="text-4xl font-extrabold text-foreground">{score}%</h1>
          <p className={`text-2xl font-bold ${grade.color}`}>{grade.grade} — {grade.label}</p>
          <p className="text-muted-foreground">{correctCount} of {questions.length} correct</p>

          {!user && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm font-medium text-foreground mb-2">
                Create a free ExamForge account to save your results and track your progress
              </p>
              <Button onClick={() => navigate('/')} size="sm">
                Sign Up Free <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Card>
          )}

          <Button variant="outline" onClick={() => { setSubmitted(false); setStarted(false); setAnswers({}); setCurrentIndex(0); }}>
            Retake Quiz
          </Button>
        </Card>
      </div>
    );
  }

  if (!started) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <GraduationCap className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">{test?.title}</h1>
        <p className="text-sm text-muted-foreground">Created by {creatorName}</p>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {test?.num_questions} questions</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {test?.duration_minutes} min</span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Users className="h-3.5 w-3.5" /> {attemptCount} people have taken this quiz
        </p>
        <Button size="lg" className="w-full" onClick={() => setStarted(true)}>Take Quiz</Button>
      </Card>
    </div>
  );

  // Quiz in progress
  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground">Q{currentIndex + 1}/{questions.length}</span>
          <span className="text-sm text-muted-foreground">{test?.title}</span>
        </div>
        <Progress value={((currentIndex + 1) / questions.length) * 100} className="mb-6" />

        <Card className="p-6 mb-4">
          <p className="font-medium text-foreground mb-4">{q.question_text}</p>
          <div className="space-y-2">
            {(['A', 'B', 'C', 'D'] as const).map(letter => (
              <button key={letter} onClick={() => handleAnswer(q.id, letter)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                  answers[q.id] === letter ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-primary/50'
                }`}>
                <span className="font-semibold mr-2">{letter}.</span>
                {q[`option_${letter.toLowerCase()}` as keyof Question] as string}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>Previous</Button>
          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length}>Submit</Button>
          ) : (
            <Button onClick={() => setCurrentIndex(i => i + 1)}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
