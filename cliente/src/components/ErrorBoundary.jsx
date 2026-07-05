import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import i18n from "../lib/i18n.js";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-4 bg-muted">
          <div className="text-center space-y-4 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto" />
            <h1 className="font-heading uppercase tracking-wide text-xl">{i18n.t("common.somethingWrong")}</h1>
            <p className="text-ink/60 text-sm">{i18n.t("common.unexpectedError")}</p>
            <button
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 border-ink bg-white flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> {i18n.t("common.reload")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
