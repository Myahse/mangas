import { useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { useFetch, fetchComments, postComment, likeComment, deleteComment } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../services/notify';

const MAX = 500;

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

/** Readers' comments at the end of a chapter: write, like, delete mine; the creator can hide any. */
export default function CommentsSection({ slug, chapterNumber }) {
  const { isAuthenticated } = useAuth();
  const [key, setKey] = useState(0);
  const { data } = useFetch(fetchComments, slug, chapterNumber, `${isAuthenticated}:${key}`);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [likes, setLikes] = useState({}); // id -> { liked, likes } after a click

  if (!data) return null;
  const items = Array.isArray(data.items) ? data.items : [];

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await postComment(slug, chapterNumber, text.trim());
      setText('');
      setKey((k) => k + 1);
    } catch (err) {
      const msg = String(err?.message || '');
      notify.error(msg.includes('too many') ? 'Doucement : attendez une minute avant de recommenter.' : (msg || 'Envoi impossible.'));
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async (c) => {
    if (!isAuthenticated) { notify.info('Connectez-vous pour aimer un commentaire.'); return; }
    try {
      const res = await likeComment(c.id);
      setLikes((m) => ({ ...m, [c.id]: res }));
    } catch (err) {
      notify.error(err?.message || 'Action impossible.');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(c.mine ? 'Supprimer votre commentaire ?' : 'Masquer ce commentaire ?')) return;
    try {
      await deleteComment(c.id);
      setKey((k) => k + 1);
    } catch (err) {
      notify.error(err?.message || 'Action impossible.');
    }
  };

  return (
    <section className="reader__comments" aria-label="Commentaires">
      <p className="reader__poll-kicker">Commentaires · {items.length}</p>
      {!data.enabled ? (
        <p className="reader__chapter-end-note">Le créateur a désactivé les commentaires pour ce chapitre.</p>
      ) : isAuthenticated ? (
        <form className="reader__comment-form" onSubmit={send}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="Qu’avez-vous pensé de ce chapitre ?"
            rows={2}
            aria-label="Votre commentaire"
          />
          <div className="reader__comment-form-row">
            <span className="reader__chapter-end-note">{MAX - text.length}</span>
            <button type="submit" className="reader__chapter-nav-btn" disabled={sending || !text.trim()}>
              {sending ? 'Envoi…' : 'Publier'}
            </button>
          </div>
        </form>
      ) : (
        <p className="reader__chapter-end-note">Connectez-vous pour commenter.</p>
      )}
      {items.length === 0 && data.enabled ? (
        <p className="reader__chapter-end-note">Soyez le premier à donner votre avis.</p>
      ) : null}
      <ul className="reader__comment-list">
        {items.map((c) => {
          const like = likes[c.id] || { liked: c.liked, likes: c.likes };
          return (
            <li key={c.id} className="reader__comment">
              <div className="reader__comment-head">
                <strong>{c.author}</strong>
                <span>{timeAgo(c.createdAt)}</span>
              </div>
              <p className="reader__comment-text">{c.text}</p>
              <div className="reader__comment-actions">
                <button
                  type="button"
                  className={`reader__comment-like${like.liked ? ' reader__comment-like--on' : ''}`}
                  onClick={() => toggleLike(c)}
                  aria-pressed={like.liked}
                  aria-label={like.liked ? 'Je n’aime plus' : 'J’aime'}
                >
                  <Heart size={13} fill={like.liked ? 'currentColor' : 'none'} /> {like.likes || ''}
                </button>
                {c.mine || data.canModerate ? (
                  <button type="button" className="reader__comment-like" onClick={() => remove(c)}
                    aria-label={c.mine ? 'Supprimer mon commentaire' : 'Masquer ce commentaire'}>
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
