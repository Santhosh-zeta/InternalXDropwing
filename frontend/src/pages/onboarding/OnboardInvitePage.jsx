import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getPublicInvite, submitPublicInvite } from '../../api';

export default function OnboardInvitePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', notes: '' });

  const title = useMemo(() => {
    const ventureName = invite?.venture?.name;
    if (!ventureName) return 'Onboarding';
    return `Onboarding • ${ventureName}`;
  }, [invite]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getPublicInvite(token);
        if (!alive) return;
        setInvite(res.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Invalid or expired invite link');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitPublicInvite(token, form);
      setSubmitted(true);
      toast.success('Submitted. You can close this tab.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

  return (
    <div className="login-page" style={{ padding: '32px 16px' }}>
      <div className="login-card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{title}</h1>
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
              {invite?.email ? `For ${invite.email}` : 'Secure onboarding form'}
            </p>
          </div>
          <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Login
          </Link>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 180 }}>
            <div className="spinner" />
          </div>
        ) : !invite ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-state-icon">🔒</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Invite not available</div>
            <div className="text-muted text-sm">The link may be invalid, expired, or already onboarded.</div>
          </div>
        ) : submitted || invite.status === 'submitted' ? (
          <div className="onboarding-step" style={{ padding: 28 }}>
            <div className="onboarding-step-icon" style={{ color: 'var(--color-success)' }}>
              <CheckCircle2 size={44} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Details received</h3>
            <p style={{ marginBottom: 0 }}>
              Thanks — the team will review and complete your onboarding.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={invite.email} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 …"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any context you want to share…"
              />
            </div>

            <button className="btn btn-primary w-full" type="submit">
              <Loader2 size={16} style={{ display: 'none' }} />
              Submit
            </button>

            <div className="text-muted text-xs" style={{ marginTop: 10 }}>
              This link is unique to you. If you didn’t request it, you can close this page.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

