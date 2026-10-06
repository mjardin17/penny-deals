import React, { useEffect, useState } from "react";
import { ClipboardList, Ellipsis, Gem, PlugZap, ScanLine, Tags } from "lucide-react";
import { ScanScreen, MineScreen } from "./screens/ScanScreen";
import { DealsScreen } from "./screens/DealsScreen";
import { CardsScreen } from "./screens/CardsScreen";
import { ConnectionsScreen } from "./screens/ConnectionsScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { ErrorBoundary } from "./ErrorBoundary";
import "./theme.css";

const ROUTES = [
  { id: "scan", label: "Scan", icon: ScanLine, title: "Scan" },
  { id: "deals", label: "Deals", icon: Tags, title: "Deals today" },
  { id: "cards", label: "Cards", icon: Gem, title: "Cards" },
  { id: "mine", label: "My scans", icon: ClipboardList, title: "My scans" },
  { id: "connections", label: "Connections", icon: PlugZap, title: "Connections" },
  { id: "more", label: "Tools", icon: Ellipsis, title: "Tools" },
] as const;

type RouteId = (typeof ROUTES)[number]["id"];

function routeFromHash(): RouteId {
  const id = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES.find((r) => r.id === id)?.id ?? "scan") as RouteId;
}

export function AppShell() {
  const [route, setRoute] = useState<RouteId>(routeFromHash);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = `${ROUTES.find((r) => r.id === route)!.title} · Penny Deals`;
  }, [route]);

  return (
    <div className="pd-shell">
      <nav className="pd-nav" aria-label="Main">
        <div className="pd-nav__brand">
          Penny<span>Deals</span>
        </div>
        {ROUTES.map(({ id, label, icon: Icon }) => (
          <button key={id} className="pd-nav__item" aria-current={route === id ? "page" : undefined} onClick={() => (window.location.hash = `#/${id}`)}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <main className="pd-main">
        {/* Screens that use the camera are only mounted while visible, so the camera is released when you leave. */}
        {/* Keyed by route so leaving a crashed screen clears the error. */}
        <ErrorBoundary key={route}>
          {route === "scan" && <ScanScreen />}
          {route === "deals" && <DealsScreen />}
          {route === "cards" && <CardsScreen />}
          {route === "mine" && <MineScreen />}
          {route === "connections" && <ConnectionsScreen />}
          {route === "more" && <MoreScreen />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
