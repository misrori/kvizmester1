import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { Zap, Users, Brain, BarChart3 } from 'lucide-react';

const Index = () => {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomCode.length === 6) {
      navigate(`/join/${roomCode}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-display text-5xl font-black tracking-tight text-foreground md:text-7xl">
                Tanulj{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  játékosan
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Interaktív kvízek tanároknak és diákoknak. Hozz létre kvízeket, indíts szobákat, és tedd szórakoztatóvá a tanulást!
              </p>
            </motion.div>

            {/* Join Room */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mt-12 max-w-md"
            >
              <div className="rounded-2xl border bg-card p-6 shadow-lg">
                <h2 className="mb-4 font-display text-xl font-bold text-card-foreground">
                  Csatlakozz egy kvízhez!
                </h2>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Szobakód (6 számjegy)"
                    value={roomCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setRoomCode(v);
                    }}
                    onKeyDown={handleKeyDown}
                    className="text-center text-2xl font-bold tracking-[0.3em] font-display"
                    maxLength={6}
                  />
                  <Button
                    size="lg"
                    onClick={handleJoin}
                    disabled={roomCode.length !== 6}
                    className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Belépés
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-foreground">
            Tanároknak készült
          </h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                icon: Brain,
                title: 'Kvízkészítő',
                desc: 'Hozz létre statikus vagy dinamikus kvízeket egyszerűen.',
                color: 'bg-primary',
              },
              {
                icon: Users,
                title: 'Élő szobák',
                desc: 'Indíts szobákat, ahová diákok kóddal csatlakozhatnak.',
                color: 'bg-secondary',
              },
              {
                icon: BarChart3,
                title: 'Eredmények',
                desc: 'Kövesd nyomon a diákok teljesítményét valós időben.',
                color: 'bg-accent',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="rounded-xl border bg-card p-6 text-center shadow-sm"
              >
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-card-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <a href="/auth">Regisztrálj tanárként</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 KvízMester – Oktatási kvízplatform</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
