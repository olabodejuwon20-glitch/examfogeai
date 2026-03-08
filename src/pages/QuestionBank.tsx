import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GraduationCap, ArrowLeft, Plus, Trash2, BookOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Bank {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  question_count?: number;
}

interface SavedQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
}

export default function QuestionBank() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBankName, setNewBankName] = useState('');
  const [newBankDesc, setNewBankDesc] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    const { data } = await supabase
      .from('question_banks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      // Get question counts
      const banksWithCounts = await Promise.all(
        data.map(async (bank) => {
          const { count } = await supabase
            .from('saved_questions')
            .select('*', { count: 'exact', head: true })
            .eq('bank_id', bank.id);
          return { ...bank, question_count: count || 0 };
        })
      );
      setBanks(banksWithCounts);
    }
    setLoading(false);
  };

  const createBank = async () => {
    if (!newBankName.trim()) return;
    const { error } = await supabase.from('question_banks').insert({
      user_id: user!.id,
      name: newBankName.trim(),
      description: newBankDesc.trim() || null,
    });
    if (error) {
      toast.error('Failed to create bank');
      return;
    }
    toast.success('Question bank created!');
    setNewBankName('');
    setNewBankDesc('');
    setDialogOpen(false);
    loadBanks();
  };

  const deleteBank = async (bankId: string) => {
    const { error } = await supabase.from('question_banks').delete().eq('id', bankId);
    if (error) {
      toast.error('Failed to delete bank');
      return;
    }
    toast.success('Bank deleted');
    if (selectedBank?.id === bankId) {
      setSelectedBank(null);
      setQuestions([]);
    }
    loadBanks();
  };

  const loadQuestions = async (bank: Bank) => {
    setSelectedBank(bank);
    const { data } = await supabase
      .from('saved_questions')
      .select('*')
      .eq('bank_id', bank.id)
      .order('created_at');
    if (data) setQuestions(data);
  };

  const deleteQuestion = async (qId: string) => {
    await supabase.from('saved_questions').delete().eq('id', qId);
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
    toast.success('Question removed');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Question Banks</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!selectedBank ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">Your Question Banks</h1>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> New Bank</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Question Bank</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="e.g., Biology Terms" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input value={newBankDesc} onChange={(e) => setNewBankDesc(e.target.value)} placeholder="Chapter 1-5 review" />
                    </div>
                    <Button onClick={createBank} className="w-full" disabled={!newBankName.trim()}>Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : banks.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No question banks yet. Create one to save questions!</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {banks.map((bank) => (
                  <Card
                    key={bank.id}
                    className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => loadQuestions(bank)}
                  >
                    <div>
                      <h3 className="font-semibold text-foreground">{bank.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {bank.question_count} questions {bank.description && `• ${bank.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteBank(bank.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedBank(null); setQuestions([]); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Banks
              </Button>
              <h1 className="text-xl font-bold text-foreground">{selectedBank.name}</h1>
              <span className="text-sm text-muted-foreground">({questions.length} questions)</span>
            </div>

            {questions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No questions saved yet. Save questions from test results!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <Card key={q.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-2">{i + 1}. {q.question_text}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                          {['A', 'B', 'C', 'D'].map((l) => (
                            <span key={l} className={`${q.correct_answer === l ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                              {l}. {q[`option_${l.toLowerCase()}` as keyof SavedQuestion]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
