import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 Uncaught error in React render boundary:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans antialiased">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 flex items-center justify-center mx-auto shadow-md">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">เกิดข้อผิดพลาดในการแสดงผลระบบ</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ระบบตรวจพบข้อผิดพลาดชั่วคราวขณะประมวลผลข้อมูล ได้ทำการป้องกันเพื่อความปลอดภัยของข้อมูลเรียบร้อยแล้ว
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-slate-950/60 rounded-xl text-[11px] font-mono text-rose-300 text-left overflow-auto max-h-24 border border-rose-950">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>รีเฟรชและโหลดระบบใหม่</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
