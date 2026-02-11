import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, GripVertical, Image, Link, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { QuizQuestion } from '@/types/quiz';
import { ANSWER_COLORS } from '@/types/quiz';

interface QuestionEditorProps {
  question: QuizQuestion;
  index: number;
  onChange: (question: QuizQuestion) => void;
  onDelete: () => void;
}

export function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const [imageMode, setImageMode] = useState<'none' | 'url' | 'upload'>(question.imageUrl ? 'url' : 'none');
  const [uploading, setUploading] = useState(false);

  const updateQuestion = (updates: Partial<QuizQuestion>) => {
    onChange({ ...question, ...updates });
  };

  const updateOption = (optionIndex: number, text: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], text };
    updateQuestion({ options: newOptions });
  };

  const setCorrectOption = (optionId: string) => {
    const newOptions = question.options.map((opt) => ({
      ...opt,
      isCorrect: opt.id === optionId,
    }));
    updateQuestion({ options: newOptions });
  };

  const addOption = () => {
    if (question.options.length >= 6) return;
    updateQuestion({
      options: [
        ...question.options,
        { id: crypto.randomUUID(), text: '', isCorrect: false },
      ],
    });
  };

  const removeOption = (optionIndex: number) => {
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    if (!newOptions.some((o) => o.isCorrect)) {
      newOptions[0].isCorrect = true;
    }
    updateQuestion({ options: newOptions });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Csak képfájlok tölthetők fel!');
      return;
    }

    setUploading(true);
    const fileName = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(fileName, file);

    if (error) {
      toast.error('Hiba a feltöltéskor: ' + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(data.path);

    updateQuestion({ imageUrl: urlData.publicUrl });
    setUploading(false);
    toast.success('Kép feltöltve!');
  };

  const removeImage = () => {
    updateQuestion({ imageUrl: undefined });
    setImageMode('none');
  };

  const correctOptionId = question.options.find((o) => o.isCorrect)?.id || '';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="font-display">{index + 1}. kérdés</span>
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question text */}
        <div className="space-y-2">
          <Label>Kérdés szövege</Label>
          <Textarea
            value={question.text}
            onChange={(e) => updateQuestion({ text: e.target.value })}
            placeholder="Írd be a kérdést..."
            rows={2}
          />
        </div>

        {/* Image support */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Kép (opcionális)
          </Label>

          {question.imageUrl ? (
            <div className="relative inline-block">
              <img
                src={question.imageUrl}
                alt="Kérdés kép"
                className="max-h-48 rounded-lg border object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {imageMode === 'none' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setImageMode('url')}>
                    <Link className="mr-1 h-3 w-3" />
                    URL megadása
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setImageMode('upload')}>
                    <Upload className="mr-1 h-3 w-3" />
                    Feltöltés
                  </Button>
                </>
              )}
              {imageMode === 'url' && (
                <div className="flex w-full gap-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    onChange={(e) => {
                      if (e.target.value.trim()) updateQuestion({ imageUrl: e.target.value.trim() });
                    }}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) setImageMode('none');
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={() => setImageMode('none')}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {imageMode === 'upload' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Feltöltés...</span>}
                  <Button size="sm" variant="ghost" onClick={() => setImageMode('none')}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question type */}
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label>Típus</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={question.type}
              onChange={(e) => updateQuestion({ type: e.target.value as QuizQuestion['type'] })}
            >
              <option value="multiple-choice">Feleletválasztós</option>
              <option value="text-input">Szabad szöveges</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Időlimit (mp)</Label>
            <Input
              type="number"
              value={question.timeLimit || 15}
              onChange={(e) => updateQuestion({ timeLimit: parseInt(e.target.value) || 15 })}
              min={5}
              max={120}
              className="w-24"
            />
          </div>
        </div>

        {/* Answer options */}
        {question.type === 'multiple-choice' ? (
          <div className="space-y-3">
            <Label>Válaszlehetőségek (jelöld meg a helyeset)</Label>
            <RadioGroup value={correctOptionId} onValueChange={setCorrectOption}>
              {question.options.map((option, i) => {
                const color = ANSWER_COLORS[i % ANSWER_COLORS.length];
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <div className={`h-6 w-6 rounded ${color.bg} flex items-center justify-center text-xs text-primary-foreground`}>
                      {color.icon}
                    </div>
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`${i + 1}. válasz`}
                      className="flex-1"
                    />
                    {question.options.length > 2 && (
                      <Button size="sm" variant="ghost" onClick={() => removeOption(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
            {question.options.length < 6 && (
              <Button size="sm" variant="outline" onClick={addOption}>
                <Plus className="mr-1 h-3 w-3" />
                Válasz hozzáadása
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Helyes válasz</Label>
            <Input
              value={question.correctAnswer || ''}
              onChange={(e) => updateQuestion({ correctAnswer: e.target.value })}
              placeholder="Írd be a helyes választ..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
