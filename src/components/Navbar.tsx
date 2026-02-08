import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Hiba a kijelentkezésnél');
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            KvízMester
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Vezérlőpult
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Kijelentkezés
              </Button>
            </>
          ) : !loading ? (
            <Button size="sm" asChild>
              <Link to="/auth">Bejelentkezés</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
