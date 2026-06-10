'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Database, Zap, Table, Loader2, AlertCircle } from 'lucide-react';

export default function DatabaseView() {
  const [activeTab, setActiveTab] = useState<'tables' | 'query'>('tables');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{ columns: any[]; rows: any[]; totalCount: number } | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingTableData, setLoadingTableData] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<{ results: any[]; fields: string[] } | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => { fetchTables(); }, []);
  useEffect(() => { if (selectedTable) fetchTableData(selectedTable); }, [selectedTable]);

  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('internalx_token')}` });

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/api/database/tables`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) { setTables(data.tables); if (data.tables.length > 0 && !selectedTable) setSelectedTable(data.tables[0]); }
      else toast.error(data.message || 'Failed to fetch tables');
    } catch { toast.error('Network error'); }
    finally { setLoadingTables(false); }
  };

  const fetchTableData = async (name: string) => {
    setLoadingTableData(true); setTableData(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/api/database/table/${name}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setTableData({ columns: data.columns, rows: data.rows, totalCount: data.totalCount });
      else toast.error(data.message || 'Failed to fetch table data');
    } catch { toast.error('Network error'); }
    finally { setLoadingTableData(false); }
  };

  const runQuery = async () => {
    if (!query.trim()) return;
    setLoadingQuery(true); setQueryError(null); setQueryResult(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/api/database/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success) { setQueryResult({ results: data.results, fields: data.fields }); toast.success('Query executed'); }
      else { setQueryError(data.message || 'Query failed'); toast.error(data.message || 'Query failed'); }
    } catch (err: any) { setQueryError(err.message || 'Network error'); toast.error('Network error'); }
    finally { setLoadingQuery(false); }
  };

  const TABS = [
    { id: 'tables' as const, label: 'Tables Explorer', icon: <Database size={15} /> },
    { id: 'query' as const, label: 'SQL Console', icon: <Zap size={15} /> },
  ];

  const TableGrid = ({ columns, rows }: { columns: any[]; rows: any[] }) => (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
            {columns.map(c => (
              <th key={c.Field || c} className="px-4 py-3 font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                {c.Field || c}
                {c.Type && <span className="text-[11px] font-normal text-[var(--color-text-muted)] ml-1.5">({c.Type})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--color-text-muted)] font-medium">No rows found.</td></tr>
            : rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                {columns.map(c => {
                  const key = c.Field || c;
                  return (
                    <td key={key} className="px-4 py-3 text-[var(--color-text-secondary)] max-w-[260px] truncate">
                      {row[key] === null ? <span className="italic text-[var(--color-text-muted)]">NULL</span> : String(row[key])}
                    </td>
                  );
                })}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tabs */}
      <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1.5 rounded-xl border border-[var(--color-border)] self-start">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-all border ${activeTab === t.id ? 'bg-[var(--color-bg-card)] text-[var(--color-purple-glow)] border-[var(--color-border)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'}`}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Tables Explorer */}
      {activeTab === 'tables' && (
        <div className="flex gap-5 items-start h-[calc(100vh-220px)] min-h-[400px]">
          {/* Sidebar */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 w-56 shrink-0 flex flex-col shadow-sm h-full">
            <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
              <Database size={12} /> Database Tables
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1">
              {loadingTables
                ? <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[var(--color-purple-glow)]" size={20} /></div>
                : tables.map(t => (
                  <button key={t} onClick={() => setSelectedTable(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all border flex items-center gap-2 ${selectedTable === t ? 'bg-[var(--color-purple-glow)]/15 text-[var(--color-purple-glow)] border-[var(--color-purple-glow)]/30 font-bold' : 'text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-secondary)]'}`}
                  >
                    <Table size={13} className="shrink-0" /> {t}
                  </button>
                ))
              }
            </div>
          </div>

          {/* Table Data */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl flex-1 flex flex-col shadow-sm h-full overflow-hidden">
            {!selectedTable
              ? <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] font-medium text-sm"><Database size={36} className="mr-3 opacity-40" /> Select a table from the sidebar</div>
              : <>
                <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
                  <h3 className="font-bold text-[15px] text-[var(--color-text-primary)] flex items-center gap-2"><Table size={15} className="text-[var(--color-purple-glow)]" /> {selectedTable}</h3>
                  {tableData && <span className="text-[11px] font-bold text-[var(--color-text-muted)] px-3 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-full">{tableData.totalCount.toLocaleString()} rows</span>}
                </div>
                <div className="flex-1 overflow-auto">
                  {loadingTableData
                    ? <div className="flex-1 flex items-center justify-center py-16"><Loader2 className="animate-spin text-[var(--color-purple-glow)]" size={28} /></div>
                    : tableData
                      ? <TableGrid columns={tableData.columns} rows={tableData.rows} />
                      : <p className="p-6 text-[var(--color-text-muted)] font-medium">Failed to load data.</p>
                  }
                </div>
              </>
            }
          </div>
        </div>
      )}

      {/* SQL Console */}
      {activeTab === 'query' && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2"><Zap size={18} className="text-[var(--color-purple-glow)]" /> SQL Console</h3>
            <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Execute raw MySQL queries directly against the connected database.</p>
          </div>

          <div className="relative">
            <textarea
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="SELECT * FROM users WHERE access_level = 1;"
              className="w-full h-[150px] px-4 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-mono text-[13px] resize-vertical outline-none focus:border-[var(--color-purple-glow)] transition-colors"
              spellCheck={false}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runQuery(); }}
            />
            <button onClick={runQuery} disabled={loadingQuery || !query.trim()}
              className="absolute bottom-3 right-3 px-4 py-1.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white text-[12px] font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {loadingQuery ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {loadingQuery ? 'Running...' : 'Run  ⌘↵'}
            </button>
          </div>

          {queryError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[13px] font-medium text-rose-500">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span><strong>Error:</strong> {queryError}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Results</div>
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl overflow-auto max-h-[400px]">
              {!queryResult
                ? <div className="p-10 text-center text-[var(--color-text-muted)] text-[13px] font-medium">Run a query to see output here.</div>
                : Array.isArray(queryResult.results)
                  ? (() => {
                    const cols = queryResult.fields?.length ? queryResult.fields : queryResult.results.length > 0 ? Object.keys(queryResult.results[0]) : [];
                    return <TableGrid columns={cols.map(f => ({ Field: f }))} rows={queryResult.results} />;
                  })()
                  : <div className="p-5 text-[13px] text-[var(--color-text-secondary)]"><strong className="text-[var(--color-text-primary)]">Query executed.</strong><pre className="mt-3 p-3 bg-[var(--color-bg-primary)] rounded-lg text-[12px] overflow-x-auto">{JSON.stringify(queryResult.results, null, 2)}</pre></div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
