import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapterPoll, votePoll } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../services/notify';

/**
 * "Les lecteurs votent la suite": the creator's question at the end of the chapter. One free vote;
 * results show once the reader voted; extra votes cost coins and go to the reader's choice.
 */
export default function PollCard({ slug, chapterNumber, onCoinsSpent }) {
  const { isAuthenticated } = useAuth();
  const [poll, setPoll] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPoll(null);
    fetchChapterPoll(slug, chapterNumber)
      .then((p) => { if (!cancelled) setPoll(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, chapterNumber, isAuthenticated]);

  if (!poll) return null;

  const open = poll.status === 'open';
  const voted = (poll.myVotes || 0) > 0;
  const showResults = poll.totalVotes != null;

  const vote = async (optionId, extraVotes = 0) => {
    setBusy(true);
    try {
      const next = await votePoll(poll.id, optionId, extraVotes);
      setPoll(next);
      if (extraVotes > 0) {
        onCoinsSpent?.();
        notify.success(`+${extraVotes} voix pour votre choix.`);
      }
    } catch (e) {
      notify.error(String(e?.message || '').includes('insufficient')
        ? 'Pas assez de coins pour voter encore.'
        : (e?.message || 'Vote impossible.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reader__poll">
      <p className="reader__poll-kicker">{open ? 'À vous de choisir la suite' : 'Les lecteurs ont choisi'}</p>
      <p className="reader__poll-question">{poll.question}</p>
      <div className="reader__poll-options">
        {poll.options.map((o) => {
          const pct = showResults && poll.totalVotes ? Math.round(((o.votes || 0) / poll.totalVotes) * 100) : 0;
          const mine = poll.myOptionId === o.id;
          const winner = poll.winnerOptionId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              className={`reader__poll-option${mine ? ' reader__poll-option--mine' : ''}${winner ? ' reader__poll-option--winner' : ''}`}
              disabled={!open || voted || busy || !isAuthenticated}
              onClick={() => vote(o.id)}
            >
              {showResults ? <span className="reader__poll-bar" style={{ transform: `scaleX(${pct / 100})` }} /> : null}
              <span className="reader__poll-label">{o.label}</span>
              {showResults ? <span className="reader__poll-pct">{pct}%</span> : null}
            </button>
          );
        })}
      </div>
      {!isAuthenticated && open ? (
        <p className="reader__chapter-end-note">
          <Link to={`/manga/${slug}`}>Connectez-vous</Link> pour voter.
        </p>
      ) : null}
      {showResults ? (
        <p className="reader__chapter-end-note">
          {poll.totalVotes} vote{poll.totalVotes > 1 ? 's' : ''}
          {voted ? ` · dont ${poll.myVotes} de vous` : ''}
        </p>
      ) : null}
      {open && voted ? (
        <button type="button" className="reader__chapter-index-btn" disabled={busy} onClick={() => vote(poll.myOptionId, 1)}>
          +1 voix pour mon choix ({poll.boostCost} coins)
        </button>
      ) : null}
    </div>
  );
}
