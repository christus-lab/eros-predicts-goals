import { Link } from "@tanstack/react-router";
import logo from "@/assets/eros-logo.png";

const links = [
  { to: "/", label: "Analyse" },
  { to: "/live", label: "Live" },
  { to: "/historique", label: "Historique" },
] as const;


export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src={logo} alt="Eros-V1" width={816} height={816} className="h-6 w-6 shrink-0" />
          <span className="truncate font-display text-sm font-semibold tracking-tight">EROS-V1</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface p-0.5">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
