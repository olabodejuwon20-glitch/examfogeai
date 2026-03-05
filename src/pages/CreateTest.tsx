import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { GraduationCap, Upload, FileText, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function CreateTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [duration, setDuration] = useState(30);
  const [format, setFormat] = useState('cbt');
  const [loading, setLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file'>('text');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain') {
      const text = await file.text();
      setContent(text);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast.success('File loaded!');
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      toast.info('PDF uploaded. Text will be extracted for question generation.');
      const text = await file.text();
      setContent(text);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    } else {
      const text = await file.text();
      setContent(text);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast.success('File loaded!');
    }
  };

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

    setLoading(true);
    try {
      // Create the test record
      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert({
          user_id: user!.id,
          title: title.trim(),
          source_content: content.trim(),
          num_questions: numQuestions,
          duration_minutes: duration,
          question_format: format,
          status: 'generating',
        })
        .select()
        .single();

      if (testError) throw testError;

      // Call AI edge function to generate questions
      const { data: fnData, error: fnError } = await supabase.functions.invoke('generate-questions', {
        body: {
          testId: test.id,
          content: content.trim(),
          numQuestions,
        },
      });

      if (fnError) throw fnError;

      toast.success('Questions generated! Your test is ready.');
      navigate(`/test/${test.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
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
            <span className="font-bold text-foreground">Create Test</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">Test Title</Label>
            <Input
              id="title"
              placeholder="e.g., Biology Chapter 5 Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Upload Method Toggle */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Content Source</Label>
            <div className="flex gap-2">
              <Button
                variant={uploadMethod === 'text' ? 'default' : 'outline'}
                onClick={() => setUploadMethod('text')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" /> Paste Text
              </Button>
              <Button
                variant={uploadMethod === 'file' ? 'default' : 'outline'}
                onClick={() => setUploadMethod('file')}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" /> Upload File
              </Button>
            </div>
          </div>

          {/* Content Input */}
          {uploadMethod === 'text' ? (
            <div className="space-y-2">
              <Label htmlFor="content">Study Material</Label>
              <Textarea
                id="content"
                placeholder="Paste your study material, notes, or textbook content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-y"
              />
              <p className="text-xs text-muted-foreground">{content.length} characters</p>
            </div>
          ) : (
            <Card className="p-8 border-dashed border-2 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload PDF, Word, or text files
              </p>
              <Input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
              {content && (
                <p className="text-sm text-success mt-3">✓ Content loaded ({content.length} characters)</p>
              )}
            </Card>
          )}

          {/* Settings */}
          <Card className="p-6 space-y-6">
            <h3 className="font-semibold text-foreground">Test Settings</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of Questions</Label>
                <span className="text-sm font-medium text-primary">{numQuestions}</span>
              </div>
              <Slider
                value={[numQuestions]}
                onValueChange={(v) => setNumQuestions(v[0])}
                min={5}
                max={50}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Duration (minutes)</Label>
                <span className="text-sm font-medium text-primary">{duration} min</span>
              </div>
              <Slider
                value={[duration]}
                onValueChange={(v) => setDuration(v[0])}
                min={5}
                max={120}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Question Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cbt">Multiple Choice (A, B, C, D)</SelectItem>
                  <SelectItem value="input">Input Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !content.trim() || !title.trim()}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating Questions...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" /> Generate AI Questions
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
