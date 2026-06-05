import React from 'react';
import { STORE_KEY } from '../utils/storage';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', stack: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'CashNest X could not load.',
      stack: error?.stack || ''
    };
  }

  componentDidCatch(error, info) {
    console.error('CashNest X render crash:', error, info);
  }

  resetApp = () => {
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem('cashnest_x_currency_v1');
      localStorage.removeItem('cashnest_x_number_format_compact_v1');
      localStorage.removeItem('cashnest_x_manual_currency_rates_v1');
      localStorage.removeItem('cashnest_x_currency_rates_v1');
    } catch (error) {
      console.warn('CashNest X reset failed:', error);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="phone crash-screen" id="phone">
        <div className="crash-card">
          <div className="crash-icon"><i className="ti ti-bug" /></div>
          <h1>CashNest X could not load</h1>
          <p>
            A saved old/corrupted app state blocked startup. Reset local app data to open CashNest X again.
            Cloudflare KV backup is not deleted.
          </p>
          <button className="crash-action-btn crash-retry-btn" type="button" onClick={() => window.location.reload()}>
            <i className="ti ti-refresh" />
            <span>Try again</span>
          </button>
          <button className="crash-action-btn crash-reset-btn" type="button" onClick={this.resetApp}>
            <i className="ti ti-trash" />
            <span>Reset local data</span>
          </button>
          <details>
            <summary>Show error</summary>
            <pre>{this.state.message}</pre>
          </details>
        </div>
      </div>
    );
  }
}
