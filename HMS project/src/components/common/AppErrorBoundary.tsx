import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
export default class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Do not log hospital records or session tokens. */ }
  render() { return this.state.failed ? <main className="min-h-screen bg-[var(--hms-bg)] p-10 text-[var(--hms-text)]"><div role="alert" className="hms-card mx-auto max-w-lg rounded-3xl p-8"><h1 className="text-xl font-semibold">This page could not be opened</h1><p className="mt-4 text-sm text-[var(--hms-text-muted)]">Reload to reconnect and load the latest app version. Saved records are kept.</p><button className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-white" onClick={()=>window.location.reload()}>Reload App</button></div></main> : this.props.children; }
}
