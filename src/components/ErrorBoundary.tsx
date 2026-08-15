import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#05060a] text-white flex items-center justify-center p-4 font-sans">
          <div className="max-w-xl w-full bg-[#0a0c14] border border-rose-900/50 rounded-xl p-6 shadow-[0_0_30px_rgba(225,29,72,0.2)] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-700/60 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="text-base font-bold font-mono uppercase tracking-wider text-rose-400">
                // SYSTEM_RUNTIME_EXCEPTION
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Se detectó una excepción en la interfaz. Puedes reiniciar el búfer o recargar la bitácora.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-[#05060a] border border-slate-800 rounded-lg p-3 text-xs font-mono text-rose-300 overflow-x-auto max-h-40">
                <p className="font-bold text-white mb-1">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">{this.state.error.stack.split('\n').slice(0, 5).join('\n')}</pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>RECARGAR_BITACORA</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

