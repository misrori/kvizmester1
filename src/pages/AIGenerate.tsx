import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Brain, Sparkles, Loader2 } from 'lucide-react';

const AIGenerate = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('matematika');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [gradeLevel, setGradeLevel] = useState('');
  const [generating, setGenerating] = useState(false);

  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleGenerate = async () => {
    if (!user) return;
    if (!topic.trim()) {
      toast.error('Add meg a témakört!');
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { subject, topic: topic.trim(), numQuestions, gradeLevel },
      });

      if (error) {
        toast.error('Hiba az AI generálásnál: ' + error.message);
        setGenerating(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setGenerating(false);
        return;
      }

      // Save quiz to database
      const { error: saveError } = await supabase.from('quizzes').insert({
        teacher_id: user.id,
        title: data.title,
        description: data.description,
        subject,
        topic: topic.trim(),
        grade_level: gradeLevel,
        questions: JSON.parse(JSON.stringify(data.questions)),
        is_published: false,
      });

      if (saveError) {
        toast.error('Hiba a mentéskor: ' + saveError.message);
        setGenerating(false);
        return;
      }

      toast.success('Kvíz sikeresen generálva és mentve!');
      navigate('/dashboard');
    } catch (e) {
      toast.error('Váratlan hiba történt');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Vissza
          </Button>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Kvízgenerátor
          </h1>
        </div>

        <div className="mx-auto max-w-xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Kvíz generálása AI-val
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Tantárgy</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="matematika">Matematika</option>
                  <option value="magyar">Magyar nyelv</option>
                  <option value="természettudomány">Természettudomány</option>
                  <option value="történelem">Történelem</option>
                  <option value="földrajz">Földrajz</option>
                  <option value="informatika">Informatika</option>
                  <option value="angol">Angol nyelv</option>
                  <option value="egyéb">Egyéb</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Témakör *</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="pl. Egyjegyű számok összeadása, Törtek, Magyar költészet..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Évfolyam</Label>
                  <Input
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="pl. 5. osztály"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kérdések száma</Label>
                  <Input
                    type="number"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                    min={1}
                    max={20}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generálás folyamatban...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Kvíz generálása
                  </>
                )}
              </Button>

              {generating && (
                <p className="text-center text-sm text-muted-foreground">
                  Az AI éppen generálja a kvízt, ez néhány másodpercig tarthat...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIGenerate;
