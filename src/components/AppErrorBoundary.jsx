import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="setup app-recovery"><h1>This screen couldn’t load</h1><p>Your saved account data is still in your account. Reload to try again.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Reload app</button><a className="btn btn-outline" href="/user/home">Customer home</a></main>;
  }
}
