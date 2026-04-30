'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function DatabaseView() {
  const [activeTab, setActiveTab] = useState<'tables' | 'query'>('tables');
  
  // Tables state
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{ columns: any[], rows: any[], totalCount: number } | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingTableData, setLoadingTableData] = useState(false);

  // Query state
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<{ results: any[], fields: string[] } | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch('http://localhost:5000/api/database/tables', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTables(data.tables);
        if (data.tables.length > 0 && !selectedTable) {
          setSelectedTable(data.tables[0]);
        }
      } else {
        toast.error(data.message || 'Failed to fetch tables');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setLoadingTableData(true);
    setTableData(null);
    try {
      const res = await fetch(`http://localhost:5000/api/database/table/${tableName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTableData({ columns: data.columns, rows: data.rows, totalCount: data.totalCount });
      } else {
        toast.error(data.message || 'Failed to fetch table data');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoadingTableData(false);
    }
  };

  const runQuery = async () => {
    if (!query.trim()) return;
    setLoadingQuery(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('internalx_token')}`
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult({ results: data.results, fields: data.fields });
        toast.success('Query executed successfully');
      } else {
        setQueryError(data.message || 'Failed to execute query');
        toast.error(data.message || 'Query failed');
      }
    } catch (err: any) {
      setQueryError(err.message || 'Network error');
      toast.error('Network error');
    } finally {
      setLoadingQuery(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
        <button
          onClick={() => setActiveTab('tables')}
          style={{
            padding: '8px 24px', borderRadius: 8,
            background: activeTab === 'tables' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            color: activeTab === 'tables' ? '#8b5cf6' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'tables' ? 700 : 500,
            border: activeTab === 'tables' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          🗄️ Tables Explorer
        </button>
        <button
          onClick={() => setActiveTab('query')}
          style={{
            padding: '8px 24px', borderRadius: 8,
            background: activeTab === 'query' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            color: activeTab === 'query' ? '#8b5cf6' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'query' ? 700 : 500,
            border: activeTab === 'query' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          ⚡ SQL Console
        </button>
      </div>

      {activeTab === 'tables' && (
        <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
          {/* Tables Sidebar */}
          <div className="glass" style={{ width: 250, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Database Tables</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingTables ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading tables...</p>
              ) : tables.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTable(t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    marginBottom: 4, fontSize: 13,
                    background: selectedTable === t ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    color: selectedTable === t ? '#8b5cf6' : 'var(--color-text-secondary)',
                    fontWeight: selectedTable === t ? 600 : 400,
                  }}
                >
                  📄 {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table Data Viewer */}
          <div className="glass" style={{ flex: 1, borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {selectedTable ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Table: {selectedTable}
                  </h3>
                  {tableData && (
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', padding: '4px 12px', borderRadius: 20 }}>
                      {tableData.totalCount} total rows
                    </span>
                  )}
                </div>

                {loadingTableData ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                    Loading data...
                  </div>
                ) : tableData ? (
                  <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                          {tableData.columns.map(c => (
                            <th key={c.Field} style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {c.Field} <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 400 }}>({c.Type})</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.length === 0 ? (
                          <tr>
                            <td colSpan={tableData.columns.length} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                              No rows found.
                            </td>
                          </tr>
                        ) : (
                          tableData.rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              {tableData.columns.map(c => (
                                <td key={c.Field} style={{ padding: '10px 16px', color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {row[c.Field] === null ? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>NULL</span> : String(row[c.Field])}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)' }}>Failed to load data.</p>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                Select a table from the sidebar.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'query' && (
        <div className="glass" style={{ flex: 1, borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Run SQL Query</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Execute raw MySQL queries directly against the connected database.</p>
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="SELECT * FROM users WHERE accessLevel = 1;"
              style={{
                width: '100%', height: 150, padding: 16, borderRadius: 8,
                background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: 14,
                resize: 'vertical'
              }}
              spellCheck={false}
            />
            <button
              onClick={runQuery}
              disabled={loadingQuery || !query.trim()}
              style={{
                position: 'absolute', bottom: 16, right: 16,
                padding: '8px 24px', borderRadius: 6,
                background: loadingQuery ? 'var(--color-text-muted)' : '#8b5cf6',
                color: '#fff', fontWeight: 600, border: 'none',
                cursor: loadingQuery || !query.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loadingQuery ? 'Executing...' : '▶ Run Query'}
            </button>
          </div>

          {queryError && (
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: 16, fontSize: 13 }}>
              <strong>Error:</strong> {queryError}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>Results</h4>
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-primary)' }}>
              {!queryResult ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  No results yet. Run a query to see output here.
                </div>
              ) : Array.isArray(queryResult.results) ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                      {queryResult.fields && queryResult.fields.length > 0 ? queryResult.fields.map((f, i) => (
                        <th key={i} style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {f}
                        </th>
                      )) : queryResult.results.length > 0 ? Object.keys(queryResult.results[0]).map((f, i) => (
                        <th key={i} style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {f}
                        </th>
                      )) : (
                        <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontWeight: 600 }}>Result</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.results.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(1, queryResult.fields?.length || 0)} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          Query returned 0 rows.
                        </td>
                      </tr>
                    ) : (
                      queryResult.results.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          {queryResult.fields && queryResult.fields.length > 0 ? queryResult.fields.map((f, j) => (
                            <td key={j} style={{ padding: '10px 16px', color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[f] === null ? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>NULL</span> : String(row[f])}
                            </td>
                          )) : Object.keys(row).map((f, j) => (
                            <td key={j} style={{ padding: '10px 16px', color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[f] === null ? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>NULL</span> : String(row[f])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  <p><strong>Query executed successfully.</strong></p>
                  <pre style={{ marginTop: 12, padding: 12, background: 'var(--color-bg-tertiary)', borderRadius: 6, overflowX: 'auto' }}>
                    {JSON.stringify(queryResult.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
