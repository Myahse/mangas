import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCreatorContractByToken, signCreatorContract } from '../../services/api';
import './AccountSectionPage.css';

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
  const scaleX = rect.width ? canvas.width / rect.width : 1;
  const scaleY = rect.height ? canvas.height / rect.height : 1;
  return {
    x: ((clientX ?? 0) - rect.left) * scaleX,
    y: ((clientY ?? 0) - rect.top) * scaleY,
  };
}

export default function CreatorContractPage() {
  const [search] = useSearchParams();
  const token = String(search.get('token') || '').trim();

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');
  const [signerName, setSignerName] = useState('');
  const [accept, setAccept] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signedOk, setSignedOk] = useState(false);
  const [savedSignaturePreview, setSavedSignaturePreview] = useState('');
  const [draftSignature, setDraftSignature] = useState('');

  const draftKey = useMemo(() => {
    const t = String(token || '').trim();
    if (!t) return '';
    return `MangAfriq:creator-contract:draft-signature:${t}`;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setContract(null);
    setSignedOk(false);
    setSavedSignaturePreview('');
    setDraftSignature('');
    if (!token) {
      setLoading(false);
      setError('Lien de contrat invalide.');
      return () => {};
    }
    setLoading(true);
    getCreatorContractByToken(token)
      .then((c) => {
        if (cancelled) return;
        setContract(c || null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Impossible de charger le contrat.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const contractStatus = useMemo(() => String(contract?.status || '').trim().toLowerCase(), [contract]);
  const isSignableByCreator = useMemo(() => contractStatus === 'sent', [contractStatus]);
  const isAlreadySigned = useMemo(() => !isSignableByCreator && Boolean(contractStatus), [isSignableByCreator, contractStatus]);
  const storedSignature = useMemo(() => {
    const s = String(contract?.signatureData || '').trim();
    return s;
  }, [contract]);

  const signaturePreview = useMemo(() => {
    const local = String(savedSignaturePreview || '').trim();
    if (local) return local;
    if (storedSignature) return storedSignature;
    return '';
  }, [savedSignaturePreview, storedSignature]);

  const showSignaturePreview = useMemo(() => {
    if (!signaturePreview) return false;
    // Show preview when creator has signed (or later).
    return signedOk || contractStatus === 'creator_signed' || contractStatus === 'fully_signed' || isAlreadySigned;
  }, [signaturePreview, signedOk, contractStatus, isAlreadySigned]);

  const canSign = signerName.trim().length > 0 && accept && hasInk && !saving && isSignableByCreator;

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setDraftSignature('');
    if (draftKey) localStorage.removeItem(draftKey);
  };

  const snapshotDraftSignature = () => {
    if (!isSignableByCreator || signedOk) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const png = canvas.toDataURL('image/png');
      if (!png) return;
      setDraftSignature(png);
      if (draftKey) localStorage.setItem(draftKey, png);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Initialize white background once.
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Restore in-progress signature from localStorage so it doesn't "disappear"
  // when the user moves the cursor away / re-renders / navigates back.
  useEffect(() => {
    if (!draftKey) return;
    if (isAlreadySigned) return;
    if (signedOk) return;
    try {
      const raw = String(localStorage.getItem(draftKey) || '').trim();
      if (raw) setDraftSignature(raw);
    } catch {
      // ignore
    }
  }, [draftKey, isAlreadySigned, signedOk]);

  // If we have a draft signature, render it into the canvas.
  useEffect(() => {
    const png = String(draftSignature || '').trim();
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!png) return;
    if (isAlreadySigned || signedOk) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasInk(true);
    };
    img.src = png;
  }, [draftSignature, isAlreadySigned, signedOk]);

  // If we have a stored signature PNG (local or from backend), render it into the canvas
  // so the signature never "disappears" after refresh.
  useEffect(() => {
    const png = String(signaturePreview || '').trim();
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!png) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasInk(true);
    };
    img.src = png;
  }, [signaturePreview]);

  const startDraw = (e) => {
    if (!isSignableByCreator) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const pos = getPos(e, canvas);
    lastPosRef.current = pos;
    // If user just taps/clicks, still record a visible mark so the PNG isn't blank.
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
      setHasInk(true);
    }
    if ('preventDefault' in e) e.preventDefault();
  };

  const moveDraw = (e) => {
    if (!isSignableByCreator) return;
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const next = getPos(e, canvas);
    const last = lastPosRef.current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPosRef.current = next;
    setHasInk(true);
    if ('preventDefault' in e) e.preventDefault();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    snapshotDraftSignature();
  };

  const onSign = async () => {
    if (!canSign) return;
    setSaving(true);
    setError('');
    try {
      const signaturePng = (() => {
        const canvas = canvasRef.current;
        if (!canvas) return '';
        try {
          return canvas.toDataURL('image/png');
        } catch {
          return '';
        }
      })();
      await signCreatorContract(token, {
        signerName: signerName.trim(),
        accept: true,
        signatureData: signaturePng,
      });
      if (signaturePng) setSavedSignaturePreview(signaturePng);
      if (draftKey) localStorage.removeItem(draftKey);
      setDraftSignature('');
      setSignedOk(true);
      const refreshed = await getCreatorContractByToken(token);
      setContract(refreshed || null);
    } catch (e) {
      setError(e?.message || 'Signature échouée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-section container" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <Link to="/compte">Mon espace</Link>
        <span aria-hidden="true"> / </span>
        <span>Contrat créateur</span>
      </nav>

      <h1 className="account-section__title">Contrat créateur</h1>
      <p className="account-section__lead">
        Lisez le contrat, puis signez-le pour finaliser votre demande.
      </p>

      {error ? (
        <div className="register__hint" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="register__hint" style={{ marginTop: 12 }}>
          Chargement…
        </div>
      ) : contract ? (
        <>
          <div className="register__hint" style={{ marginTop: 12 }}>
            Statut: <strong>{contract.status}</strong>
            {signedOk ? <div style={{ marginTop: 6 }}>Signature enregistrée.</div> : null}
          </div>

          <div className="contract-surface">
            <div className="contract-surface__inner">
              <div dangerouslySetInnerHTML={{ __html: contract.contractHtml }} />

              <div className="contract-surface__sign" style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontWeight: 900 }}>Signature</div>
                <label className="register__field">
                  <span>Nom complet (signature)</span>
                  <input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    disabled={!isSignableByCreator}
                    placeholder="Votre nom"
                  />
                </label>

                <label className="register__field">
                  <span>Signature (dessin)</span>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {showSignaturePreview ? (
                      <div style={{ overflow: 'hidden', background: '#fff' }}>
                        <img
                          src={signaturePreview}
                          alt="Signature"
                          style={{ display: 'block', width: '100%', height: 'auto' }}
                        />
                      </div>
                    ) : null}
                    {showSignaturePreview ? (
                      <div className="admin-muted" style={{ fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>Signature sauvegardée ({Math.round(signaturePreview.length / 1024)} KB)</span>
                        <a href={signaturePreview} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 900 }}>
                          Ouvrir la signature
                        </a>
                      </div>
                    ) : null}
                    <div
                      style={{
                        overflow: 'hidden',
                        background: '#fff',
                        touchAction: 'none',
                        opacity: isAlreadySigned ? 0.95 : 1,
                        display: showSignaturePreview ? 'none' : 'block',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        width={520}
                        height={180}
                        onMouseDown={startDraw}
                        onMouseMove={moveDraw}
                        onMouseUp={endDraw}
                        onMouseLeave={endDraw}
                        onTouchStart={startDraw}
                        onTouchMove={moveDraw}
                        onTouchEnd={endDraw}
                        aria-label="Zone de signature"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 'auto',
                          pointerEvents: isSignableByCreator ? 'auto' : 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {!isSignableByCreator
                          ? 'Signature enregistrée.'
                          : hasInk
                            ? 'Signature prête.'
                            : 'Optionnel: vous pouvez signer au doigt / souris.'}
                      </div>
                      <button type="button" className="register__btn register__btn--ghost" onClick={clearSignature} disabled={!isSignableByCreator}>
                        Effacer
                      </button>
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={accept}
                    onChange={(e) => setAccept(e.target.checked)}
                    disabled={!isSignableByCreator}
                    style={{ marginTop: 4 }}
                  />
                  <span style={{ color: 'var(--text)', lineHeight: 1.4 }}>
                    J’ai lu et j’accepte le contrat.
                  </span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="register__btn register__btn--primary"
                    onClick={onSign}
                    disabled={!canSign}
                  >
                    {saving ? 'Signature…' : !isSignableByCreator ? 'Déjà signé' : 'Signer le contrat'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

