import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Zap, Users } from 'lucide-react';
import { getStudentSessionId } from '@/types/quiz';
import type { Room } from '@/types/quiz';

const JoinRoom = () => {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(urlCode || '');
  const [name, setName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [joining, setJoining] = useState(false);
  const [step, setStep] = useState<'code' | 'name'>(!urlCode ? 'code' : 'name');

  useEffect(() => {
    if (urlCode) {
      findRoom(urlCode);
    }
  }, [urlCode]);

  const findRoom = async (roomCode: string) => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .in('status', ['waiting', 'active'])
      .single();

    if (error || !data) {
      toast.error('Szoba nem található vagy már lezárult.');
      setStep('code');
      return;
    }

    setRoom(data as unknown as Room);
    setStep('name');
  };

  const handleCodeSubmit = () => {
    if (code.length !== 6) {
      toast.error('A szobakód 6 számjegyből áll');
      return;
    }
    findRoom(code);
  };

  const handleJoin = async () => {
    if (!room || !name.trim()) {
      toast.error('Add meg a neved!');
      return;
    }

    setJoining(true);
    const sessionId = getStudentSessionId();

    // Check if already joined
    const { data: existing } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('student_session_id', sessionId)
      .maybeSingle();

    if (existing) {
      // Already joined, go to play
      sessionStorage.setItem('participant_id', existing.id);
      sessionStorage.setItem('student_name', name);
      navigate(`/play/${room.id}`);
      return;
    }

    const { data, error } = await supabase
      .from('room_participants')
      .insert({
        room_id: room.id,
        student_name: name.trim(),
        student_session_id: sessionId,
      })
      .select()
      .single();

    setJoining(false);

    if (error) {
      toast.error('Nem sikerült csatlakozni: ' + error.message);
      return;
    }

    if (data) {
      sessionStorage.setItem('participant_id', data.id);
      sessionStorage.setItem('student_name', name.trim());
      navigate(`/play/${room.id}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">KvízMester</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'code' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-center block">Szobakód megadása</Label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(v);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                  className="text-center text-3xl font-bold tracking-[0.3em] font-display h-16"
                  maxLength={6}
                />
              </div>
              <Button className="w-full" size="lg" onClick={handleCodeSubmit} disabled={code.length !== 6}>
                Tovább
              </Button>
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-4">
              {room && (
                <div className="rounded-lg bg-muted p-3 text-center">
                  <div className="text-sm text-muted-foreground">Szoba</div>
                  <div className="font-display text-lg font-bold tracking-widest text-primary">{room.code}</div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Mi a neved?</Label>
                <Input
                  type="text"
                  placeholder="Írd be a neved..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className="text-lg"
                  maxLength={30}
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                size="lg"
                onClick={handleJoin}
                disabled={joining || !name.trim()}
              >
                <Users className="mr-2 h-5 w-5" />
                {joining ? 'Csatlakozás...' : 'Csatlakozás'}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setStep('code'); setRoom(null); }}>
                Másik szobakód
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinRoom;
