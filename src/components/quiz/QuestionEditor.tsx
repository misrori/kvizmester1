import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import type { QuizQuestion } from '@/types/quiz';
import { ANSWER_COLORS } from '@/types/quiz';

interface QuestionEditorProps {
  question: QuizQuestion;
  index: number;
  onChange: (question: QuizQuestion) => void;
  onDelete: () => void;
}

export function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
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
