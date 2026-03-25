import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "system-ui", color: "#e5e5e5", background: "#0a0a0f", minHeight: "100vh" }}>
          <h1 style={{ color: "#06b6d4" }}>AlphaArena</h1>
          <p>Something went wrong.</p>
          <pre style={{ color: "#888", fontSize: 13, whiteSpace: "pre-wrap", marginTop: 12 }}>{this.state.error.message}</pre>
          <button onClick={() => location.reload()} style={{ marginTop: 16, color: "#06b6d4", background: "none", border: "1px solid #06b6d4", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
