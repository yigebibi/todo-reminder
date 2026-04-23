import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] uncaught render error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" strokeWidth={2.2} />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">哎呀，畫面崩了</h1>
          <p className="text-sm text-muted-foreground">
            按「重試」讓 UI 重新渲染；如果問題持續，請重新載入視窗。
          </p>
        </div>
        <pre className="max-h-60 max-w-2xl overflow-auto rounded border border-border/60 bg-muted/50 p-3 text-left text-xs text-muted-foreground">
          {error.message}
          {error.stack ? '\n\n' + error.stack.split('\n').slice(0, 6).join('\n') : ''}
        </pre>
        <div className="flex gap-2">
          <Button onClick={this.reset}>重試</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            重新載入
          </Button>
        </div>
      </div>
    );
  }
}
