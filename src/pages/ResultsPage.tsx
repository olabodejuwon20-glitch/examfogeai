import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GraduationCap, ArrowLeft, CheckCircle, XCircle, Trophy, BookmarkPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionResult {
  question_id: string;
  question_number: number;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

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

interface QuestionBank {
  id: string;
  name: string;
}

export default function ResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [savingToBank, setSavingToBank] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    loadResults();
  }, [testId]);

  const loadResults = async () => {
    const [resultRes, questionsRes, banksRes] = await Promise.all([
      supabase.from('test_results').select('*, test:tests(title)').eq('test_id', testId).eq('user_id', user!.id).order('completed_at', { ascending: false }).limit(1).single(),
      supabase.from('questions').select('*').eq('test_id', testId).order('question_number'),
      supabase.from('question_banks').select('id, name').order('name'),
    ]);
    if (resultRes.data) setResult(resultRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    if (banksRes.data) setBanks(banksRes.data as QuestionBank[]);
    setLoading(false);
  };

  const saveQuestionsToBank = async () => {
    if (!selectedBankId) {
      toast.error('Select a question bank');
      return;
    }
    setSavingToBank(true);
    const toInsert = questions.map((q) => ({
      bank_id: selectedBankId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));

    const { error } = await supabase.from('saved_questions').insert(toInsert);
    if (error) {
      toast.error('Failed to save questions');
    } else {
      toast.success(`${questions.length} questions saved to bank!`);
      setSaveDialogOpen(false);
    }
    setSavingToBank(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No results found.</p>
          <Link to="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  const score = Math.round(Number(result.score));
  const answerMap: Record<string, QuestionResult> = {};
  (result.answers as QuestionResult[])?.forEach((a) => { answerMap[a.question_id] = a; });

  const getOptionText = (q: Question, letter: string) => {
    return q[`option_${letter.toLowerCase()}` as keyof Question] as string;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Results</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Score Card */}
        <Card className="p-8 text-center mb-8">
          <Trophy className={`h-16 w-16 mx-auto mb-4 ${
            score >= 70 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'
          }`} />
          <h1 className="text-4xl font-extrabold text-foreground mb-1">{score}%</h1>
          <p className="text-muted-foreground text-lg mb-2">{result.test?.title}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {result.correct_answers} of {result.total_questions} correct
          </p>

          {/* Save to Bank */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <BookmarkPlus className="h-4 w-4 mr-2" /> Save to Question Bank
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Questions to Bank</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {banks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No question banks yet. <Link to="/question-banks" className="text-primary underline">Create one first</Link>.
                  </p>
                ) : (
                  <>
                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={saveQuestionsToBank} className="w-full" disabled={savingToBank || !selectedBankId}>
                      {savingToBank ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Save {questions.length} Questions
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </Card>

        {/* Question Review */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Question Review</h2>
        <div className="space-y-4">
          {questions.map((q) => {
            const answer = answerMap[q.id];
            const isCorrect = answer?.is_correct;
            const userAnswer = answer?.user_answer;

            return (
              <Card key={q.id} className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-3">
                      {q.question_number}. {q.question_text}
                    </p>
                    <div className="space-y-2 mb-3">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const isUserAnswer = userAnswer === letter;
                        const isCorrectAnswer = q.correct_answer === letter;
                        return (
                          <div
                            key={letter}
                            className={`p-3 rounded-lg text-sm border ${
                              isCorrectAnswer
                                ? 'border-success/50 bg-success/5'
                                : isUserAnswer && !isCorrect
                                ? 'border-destructive/50 bg-destructive/5'
                                : 'border-border bg-card'
                            }`}
                          >
                            <span className="font-semibold mr-2">{letter}.</span>
                            {getOptionText(q, letter)}
                            {isCorrectAnswer && <span className="ml-2 text-success text-xs font-medium">✓ Correct</span>}
                            {isUserAnswer && !isCorrect && <span className="ml-2 text-destructive text-xs font-medium">✗ Your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="p-3 rounded-lg bg-accent text-sm">
                        <span className="font-semibold text-accent-foreground">Explanation: </span>
                        <span className="text-foreground">{q.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <Link to="/dashboard">
            <Button variant="outline" size="lg">Back to Dashboard</Button>
          </Link>
          <Link to="/create-test">
            <Button size="lg">Create Another Test</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
