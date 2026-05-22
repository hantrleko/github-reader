import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, LogOut, User as UserIcon, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const UserMenu = () => {
  const { user, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return <div className="w-7 h-7" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className={cn(
          "hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-foreground/70 hover:text-gold transition-colors"
        )}
      >
        <LogIn className="w-3 h-3" /> Sign in
      </Link>
    );
  }

  const initial = (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-7 h-7 rounded-full bg-gold/15 text-gold border border-gold/40 flex items-center justify-center text-[11px] font-mono font-semibold hover:bg-gold/25 transition-colors"
        aria-label="Account"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[200px] rounded-md border border-border bg-popover/95 backdrop-blur-lg shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Signed in
            </p>
            <p className="text-xs text-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="w-full text-left px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
          <Link
            to="/account"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(false)}
            className="w-full block px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2 border-t border-border/40"
          >
            <UserIcon className="w-3 h-3" /> Account & Profile
          </Link>
          <Link
            to="/notebook"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(false)}
            className="w-full block px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2"
          >
            <BookOpen className="w-3 h-3" /> My Notebooks
          </Link>
        </div>
      )}
    </div>
  );
};

export default UserMenu;