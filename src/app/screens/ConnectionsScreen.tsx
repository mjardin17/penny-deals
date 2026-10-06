import React, { useCallback, useEffect, useState } from "react";
import { getJson, messageOf } from "../api";

interface Status {
  id: string;
  name: string;
  state: "working" | "failing" | "not_configured" | "not_built";
  detail: string;
  checkedLive: boolean;
  checkedAt: string;
}

const LABEL: Record<Status["state"], { text: string; cls: string }> = {
  working: { text: "Working", cls: "pd-chip--working" },
  failing: { text: "Failing", cls: "pd-chip--failing" },
  not_configured: { text: "Needs setup", cls: "pd-chip--setup" },
  not_built: { text: "Not built yet", cls: "pd-chip--off" },
};

export function ConnectionsScreen() {
  const [list, setList] = useState<Status[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async (fresh: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setList(await getJson<Status[]>(`/api/integrations/status${fresh ? "?fresh=1" : ""}`));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const working = list?.filter((s) => s.state === "working").length ?? 0;

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">Connections</h1>
        <p className="pd-lede">A saved key is not proof. Each service below was tested with a real call, and anything that isn't working says why.</p>
      </div>

      <div className="pd-row">
        <button className="pd-btn" onClick={() => load(true)} disabled={busy}>
          {busy ? "Testing…" : "Test everything now"}
        </button>
        {list && <span className="pd-small pd-muted">{working} of {list.length} working</span>}
      </div>

      {error && <div className="pd-banner pd-banner--bad" role="alert">{error}</div>}
      {busy && !list && (
        <>
          <div className="pd-skeleton" />
          <div className="pd-skeleton" />
        </>
      )}

      {list?.map((s) => (
        <div key={s.id} className="pd-card">
          <div className="pd-spread">
            <strong>{s.name}</strong>
            <span className={`pd-chip ${LABEL[s.state].cls}`}>
              <span className="pd-dot" /> {LABEL[s.state].text}
            </span>
          </div>
          <p className="pd-small pd-muted" style={{ margin: "6px 0 0" }}>{s.detail}</p>
          <p className="pd-small pd-muted" style={{ margin: "4px 0 0" }}>
            {s.checkedLive ? "Tested with a real call" : "Not a live test"} · {new Date(s.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
}
