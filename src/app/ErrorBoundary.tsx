import React from "react";

interface Props {
  children: React.ReactNode;
}

/** A screen that throws shows a message and a retry instead of leaving the whole app blank. */
export class ErrorBoundary extends React.Component<Props, { failed: boolean }> {
  // @types/react is not installed in this project, so React.Component is untyped; these two lines tell TypeScript what it provides.
  declare props: Props;
  declare setState: (next: { failed: boolean }) => void;
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[screen crashed]", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="pd-banner pd-banner--bad" role="alert">
        <strong>This screen hit a problem.</strong> Nothing was lost.{" "}
        <button className="pd-btn pd-btn--small pd-btn--ghost" onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </div>
    );
  }
}
