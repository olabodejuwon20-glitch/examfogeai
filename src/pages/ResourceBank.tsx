import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Upload, Camera, FileText, Search, Plus, Trash2, Flag,
  Sparkles, ArrowLeft, Loader2, X, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { extractTextFromFile } from '@/lib/fileParser';

interface Resource {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  country: string | null;
  exam: string | null;
  subject: string | null;
  topic: string | null;
  ai_summary: string | null;
  test_gen_count: number;
  is_flagged: boolean;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

export default function ResourceBank() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');
  const [resources, setResources] = useState<Resource[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'camera' | 'paste' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadResources(); }, [tab]);

  const loadResources = async () => {
    setLoading(true);
    let query = supabase.from('resource_bank').select('*').eq('is_flagged', false).order('created_at', { ascending: false });
    if (tab === 'mine') query = query.eq('user_id', user!.id);
    const { data } = await query.limit(50);
    if (data) {
      setResources(data as Resource[]);
      // Load profiles for display names
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.user_id] = p.display_name || 'Anonymous'; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  const filteredResources = resources.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.subject?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCountry && r.country !== filterCountry) return false;
    if (filterSubject && r.subject !== filterSubject) return false;
    return true;
  });

  const countries = [...new Set(resources.map(r => r.country).filter(Boolean))] as string[];
  const subjects = [...new Set(resources.map(r => r.subject).filter(Boolean))] as string[];

  const handleFileUpload = async (file: File, isCamera: boolean) => {
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large. Max 20MB.'); return; }

    const isImage = file.type.startsWith('image/');
    
    // Validate image if it's an image file
    if (isImage) {
      toast.info('Validating image quality...');
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      try {
        const { data: validation, error } = await supabase.functions.invoke('validate-image', {
          body: { image_base64: base64, mime_type: file.type },
        });
        if (error) throw error;
        if (!validation.valid) {
          toast.error(`Image rejected: ${validation.reason}. Please take a clearer photo or upload a file instead.`);
          return;
        }
        toast.success(`Image validated! ~${validation.word_count_estimate} words detected.`);
      } catch (err) {
        console.error('Image validation error:', err);
        toast.error('Could not validate image. Try uploading a different file.');
        return;
      }
    }

    setUploading(true);
    try {
      // Extract text
      let textContent = '';
      if (isImage) {
        textContent = `[Image file: ${file.name}]`; // AI will categorise from image
      } else {
        textContent = await extractTextFromFile(file);
      }

      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));

      // Upload to storage
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('resources').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
      const fileType = isImage ? 'image' : file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : 'text';

      // Insert resource
      const { data: resource, error: insertErr } = await supabase.from('resource_bank').insert({
        user_id: user!.id,
        title: uploadTitle || file.name,
        description: uploadDescription || null,
        file_url: urlData.publicUrl,
        file_type: fileType,
      }).select().single();

      if (insertErr) throw insertErr;

      // Categorise in background
      supabase.functions.invoke('categorise-resource', {
        body: { resource_id: resource.id, content: textContent.substring(0, 5000) },
      }).catch(console.error);

      // Reward credits
      await supabase.rpc('add_reward_credits', { p_user_id: user!.id, p_credits: 3, p_type: 'bonus' });
      toast.success('+3 reward credits for contributing to the resource bank!');

      setShowUpload(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadMode(null);
      loadResources();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim() || pasteContent.trim().length < 50) {
      toast.error('Please enter at least 50 characters of content.');
      return;
    }
    setUploading(true);
    try {
      const { data: resource, error: insertErr } = await supabase.from('resource_bank').insert({
        user_id: user!.id,
        title: uploadTitle || 'Pasted content',
        description: uploadDescription || null,
        file_type: 'text',
      }).select().single();

      if (insertErr) throw insertErr;

      supabase.functions.invoke('categorise-resource', {
        body: { resource_id: resource.id, content: pasteContent.substring(0, 5000) },
      }).catch(console.error);

      await supabase.rpc('add_reward_credits', { p_user_id: user!.id, p_credits: 3, p_type: 'bonus' });
      toast.success('+3 reward credits for contributing to the resource bank!');

      setShowUpload(false);
      setUploadTitle('');
      setUploadDescription('');
      setPasteContent('');
      setUploadMode(null);
      loadResources();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('resource_bank').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Resource deleted'); loadResources(); }
  };

  const handleReport = async (id: string) => {
    await supabase.from('resource_bank').update({ is_flagged: true }).eq('id', id);
    toast.success('Resource reported. Thank you.');
    loadResources();
  };

  const handleGenerateTest = (resource: Resource) => {
    navigate('/create-test', { state: { resourceId: resource.id, resourceTitle: resource.title, resourceContent: resource.ai_summary || resource.title } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Resource Bank</span>
          </div>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border">
          {(['browse', 'mine'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              {t === 'browse' ? 'Browse' : 'My Uploads'}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        {tab === 'browse' && (
          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {countries.map(c => (
                <Badge key={c} variant={filterCountry === c ? 'default' : 'outline'} className="cursor-pointer"
                  onClick={() => setFilterCountry(filterCountry === c ? '' : c)}>{c}</Badge>
              ))}
              {subjects.map(s => (
                <Badge key={s} variant={filterSubject === s ? 'default' : 'outline'} className="cursor-pointer"
                  onClick={() => setFilterSubject(filterSubject === s ? '' : s)}>{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Resources Grid */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredResources.length === 0 ? (
          <Card className="p-10 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{tab === 'mine' ? 'You haven\'t uploaded any resources yet.' : 'No resources found.'}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredResources.map(r => (
              <Card key={r.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {r.subject && <Badge variant="secondary" className="text-xs mb-1">{r.subject}</Badge>}
                    <h3 className="font-semibold text-foreground text-sm truncate">{r.title}</h3>
                    <p className="text-xs text-muted-foreground">{profiles[r.user_id] || 'Anonymous'}</p>
                  </div>
                  {r.file_type && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{r.file_type.toUpperCase()}</Badge>
                  )}
                </div>
                {r.ai_summary && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{r.ai_summary}</p>}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="text-xs text-muted-foreground">
                    <Sparkles className="inline h-3 w-3 mr-1" />Generated {r.test_gen_count} times
                  </span>
                  <div className="flex gap-1">
                    {tab === 'mine' ? (
                      <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-muted-foreground h-7 px-2" onClick={() => handleReport(r.id)}>
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleGenerateTest(r)}>
                      <Sparkles className="h-3 w-3 mr-1" /> Generate Test
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Title" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} />

            {!uploadMode ? (
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { setUploadMode('file'); fileInputRef.current?.click(); }}
                  className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary text-center transition-colors">
                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs font-medium">Upload File</span>
                </button>
                <button onClick={() => { setUploadMode('camera'); cameraInputRef.current?.click(); }}
                  className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary text-center transition-colors">
                  <Camera className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs font-medium">Take Photo</span>
                </button>
                <button onClick={() => setUploadMode('paste')}
                  className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary text-center transition-colors">
                  <FileText className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs font-medium">Paste Text</span>
                </button>
              </div>
            ) : uploadMode === 'paste' ? (
              <div className="space-y-3">
                <Textarea placeholder="Paste your study material here..." value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)} className="min-h-[150px]" />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setUploadMode(null)}>Back</Button>
                  <Button className="flex-1" onClick={handlePasteSubmit} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Upload
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                {uploading ? (
                  <><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p className="text-sm text-muted-foreground">Processing...</p></>
                ) : (
                  <Button variant="outline" onClick={() => setUploadMode(null)}>Choose different method</Button>
                )}
              </div>
            )}
          </div>

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], false); }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], true); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
