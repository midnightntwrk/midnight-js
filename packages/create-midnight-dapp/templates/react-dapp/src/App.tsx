import './polyfills';
import { useEffect, useState } from 'react';
import './styles.css';

declare global {
  interface Window {
    midnight?: Record<string, MidnightWalletAPI>;
  }
}

interface MidnightWalletAPI {
  name: string;
  icon: string;
  apiVersion: string;
  connect: (networkId: string) => Promise<ConnectedWallet>;
}

interface ConnectedWallet {
  getConfiguration: () => Promise<{ networkId: string }>;
  getUnshieldedAddress: () => Promise<{ unshieldedAddress: string }>;
  getShieldedBalances: () => Promise<Record<string, bigint>>;
  getUnshieldedBalances: () => Promise<Record<string, bigint>>;
  getDustBalance: () => Promise<{ balance: bigint }>;
}

function findWalletAPIs(): MidnightWalletAPI[] {
  const midnight = window.midnight;
  if (!midnight) return [];

  return Object.values(midnight).filter(
    (api): api is MidnightWalletAPI =>
      api !== null &&
      typeof api === 'object' &&
      typeof api.name === 'string' &&
      typeof api.connect === 'function'
  );
}

export default function App() {
  const [wallets, setWallets] = useState<MidnightWalletAPI[]>([]);
  const [connected, setConnected] = useState<ConnectedWallet | null>(null);
  const [networkId, setNetworkId] = useState('undeployed');
  const [address, setAddress] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const appendLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLog((prev) => [`${time}: ${msg}`, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      const found = findWalletAPIs();
      if (found.length > 0) {
        setWallets(found);
        appendLog(`Found wallet: ${found.map((w) => w.name).join(', ')}`);
        clearInterval(interval);
      } else if (++attempts > 20) {
        appendLog('No Midnight wallet detected. Install Lace wallet.');
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (wallets.length === 0) return;

    setIsConnecting(true);
    try {
      const wallet = wallets[0];
      appendLog(`Connecting to ${wallet.name}...`);

      const connection = await wallet.connect(networkId);
      setConnected(connection);

      const config = await connection.getConfiguration();
      setNetworkId(config.networkId);
      appendLog(`Connected to ${config.networkId}`);

      const addr = await connection.getUnshieldedAddress();
      setAddress(addr.unshieldedAddress);
      appendLog(`Address: ${addr.unshieldedAddress.slice(0, 30)}...`);

      const shielded = await connection.getShieldedBalances();
      const unshielded = await connection.getUnshieldedBalances();
      const dust = await connection.getDustBalance();

      const shieldedTotal = Object.values(shielded).reduce((a, b) => a + b, 0n);
      const unshieldedTotal = Object.values(unshielded).reduce((a, b) => a + b, 0n);
      appendLog(`Balance - Shielded: ${shieldedTotal}, Unshielded: ${unshieldedTotal}, Dust: ${dust.balance}`);
    } catch (err) {
      appendLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(null);
    setAddress(null);
    appendLog('Disconnected');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Midnight dApp</h1>
        <p className="subtitle">Privacy-preserving decentralized application</p>
      </header>

      <main className="container">
        <section className="card">
          <h2>Wallet Connection</h2>

          <div className="wallet-status">
            <span className={`status-dot ${connected ? 'connected' : wallets.length > 0 ? 'detected' : ''}`} />
            <span>
              {connected ? 'Connected' : wallets.length > 0 ? 'Wallet Detected' : 'No Wallet'}
            </span>
          </div>

          {!connected ? (
            <div className="form-group">
              <label>Network</label>
              <select value={networkId} onChange={(e) => setNetworkId(e.target.value)} className="input">
                <option value="undeployed">Undeployed</option>
                <option value="preview">Preview</option>
                <option value="qanet">QANet</option>
              </select>
              <button
                onClick={handleConnect}
                disabled={wallets.length === 0 || isConnecting}
                className="btn btn-primary"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <div className="form-group">
              <div className="info-box">
                <strong>Network:</strong> {networkId}
              </div>
              <div className="info-box">
                <strong>Address:</strong>
                <code>{address?.slice(0, 40)}...</code>
              </div>
              <button onClick={handleDisconnect} className="btn btn-secondary">
                Disconnect
              </button>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Next Steps</h2>
          <div className="info-box">
            <p><strong>1.</strong> Run <code>yarn compact</code> to compile the smart contract</p>
            <p><strong>2.</strong> Edit <code>src/contract/contracts/unshielded-demo.compact</code> for your logic</p>
            <p><strong>3.</strong> Import contract types from <code>src/contract/index.ts</code></p>
            <p><strong>4.</strong> Use <code>@midnight-ntwrk/midnight-js-contracts</code> to deploy and call</p>
          </div>
        </section>

        <section className="card">
          <h2>Activity Log</h2>
          <div className="activity-log">
            {log.length === 0 ? (
              <p className="empty-state">No activity yet</p>
            ) : (
              <ul className="log-list">
                {log.map((entry, i) => (
                  <li key={i}>{entry}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
