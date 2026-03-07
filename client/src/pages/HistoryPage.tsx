'use client';

import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getLoginUrl } from '@/const';
import { ChevronLeft, LogIn, FileText, MapPin, Clock, CheckCircle2, XCircle, Printer } from 'lucide-react';

const statusLabel: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  rejected: 'Rejeté',
  completed: 'Validée',
};

const statusColor: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#2a2000', color: '#d4af37' },
  accepted: { bg: '#1a2a3a', color: '#4fc3f7' },
  rejected: { bg: '#3a1a1a', color: '#f44336' },
  completed: { bg: '#1a3a1a', color: '#4caf50' },
};

function printInvoice(quote: any) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture VIP Drivers - #${quote.id}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #111; }
    h1 { color: #b8952e; border-bottom: 2px solid #b8952e; padding-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th { background: #f5f5f5; text-align: left; padding: 0.5rem 0.75rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee; }
    .total { font-size: 1.5rem; font-weight: 900; color: #b8952e; }
    .label { color: #666; font-size: 0.8rem; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>🚗 VIP Drivers – Facture</h1>
  <p><strong>Facture N°:</strong> VIP-${String(quote.id).padStart(5, '0')}</p>
  <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

  <h2 style="font-size:1rem;margin-top:1.5rem;border-bottom:1px solid #ddd;padding-bottom:0.5rem;">Informations Client</h2>
  <p><strong>Nom:</strong> ${quote.clientFirstName || ''} ${quote.clientLastName || quote.clientName}</p>
  <p><strong>Email:</strong> ${quote.clientEmail}</p>
  <p><strong>Téléphone:</strong> ${quote.clientPhone}</p>
  ${quote.clientCompany ? `<p><strong>Société:</strong> ${quote.clientCompany}</p>` : ''}
  ${quote.clientVatNumber ? `<p><strong>N° TVA:</strong> ${quote.clientVatNumber}</p>` : ''}

  <h2 style="font-size:1rem;margin-top:1.5rem;border-bottom:1px solid #ddd;padding-bottom:0.5rem;">Détails de la Course</h2>
  <table>
    <tr><th>Description</th><th>Détail</th></tr>
    <tr><td>Véhicule</td><td>${quote.vehicleId}</td></tr>
    <tr><td>Départ</td><td>${quote.departureAddress}</td></tr>
    <tr><td>Destination</td><td>${quote.destinationAddress}</td></tr>
    <tr><td>Distance</td><td>${quote.distanceKm} km</td></tr>
    ${quote.notes ? `<tr><td>Notes</td><td>${quote.notes}</td></tr>` : ''}
  </table>

  <table>
    <tr><th>Prestation</th><th>Montant</th></tr>
    <tr>
      <td>Transfert – ${quote.vehicleId} (${quote.distanceKm} km)</td>
      <td class="total">${quote.estimatedPrice}€</td>
    </tr>
  </table>

  <p class="label" style="margin-top:2rem;">TVA incluse • VIP Drivers SPRL • Bruxelles, Belgique • info@vip-drivers.be</p>
  <button onclick="window.print()" style="margin-top:1rem;padding:0.5rem 1rem;background:#b8952e;color:#fff;border:none;border-radius:4px;cursor:pointer;">🖨 Imprimer / Télécharger PDF</button>
</body>
</html>`;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function HistoryPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '1rem' }}>Connexion Requise</h1>
          <p style={{ color: '#888888', marginBottom: '2rem' }}>Connectez-vous pour voir votre historique de courses.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href={getLoginUrl()} style={{ background: '#d4af37', color: '#000', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={18} /> Se connecter
            </a>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#888', border: '1px solid #333', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { data: history = [], isLoading } = trpc.quotes.myHistory.useQuery();

  const completedCourses = (history as any[]).filter((q: any) => q.status === 'completed');
  const otherCourses = (history as any[]).filter((q: any) => q.status !== 'completed');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', paddingTop: '5rem', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '0.875rem', padding: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          <ChevronLeft size={18} /> Retour à l'accueil
        </button>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
            Mon <span style={{ color: '#d4af37' }}>Historique</span>
          </h1>
          <p style={{ color: '#888888', marginTop: '0.5rem' }}>
            Bonjour {user.name || user.email} — historique de vos courses VIP Drivers
          </p>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#888' }}>
            <Clock size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Chargement de votre historique...
          </div>
        )}

        {!isLoading && (history as any[]).length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#111', borderRadius: '1rem', border: '1px solid #222' }}>
            <FileText size={48} style={{ color: '#333', marginBottom: '1rem' }} />
            <h2 style={{ color: '#555', margin: '0 0 0.5rem' }}>Aucune course</h2>
            <p style={{ color: '#444', margin: '0 0 1.5rem' }}>Vous n'avez pas encore effectué de demande de devis.</p>
            <button onClick={() => navigate('/quote')} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              Obtenir un devis
            </button>
          </div>
        )}

        {/* Completed courses */}
        {completedCourses.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#4caf50', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} /> Courses Validées
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {completedCourses.map((quote: any) => (
                <div key={quote.id} style={{ background: '#111111', border: '1px solid #2a4a2a', padding: '1.5rem', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ background: '#1a3a1a', color: '#4caf50', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          ✓ Validée
                        </span>
                        <span style={{ color: '#555', fontSize: '0.75rem' }}>
                          {new Date(quote.createdAt).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                        <MapPin size={14} style={{ color: '#4caf50', marginTop: '0.1rem', flexShrink: 0 }} />
                        <div>
                          <p style={{ color: '#cccccc', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{quote.departureAddress}</p>
                          <p style={{ color: '#888888', fontSize: '0.8rem', margin: 0 }}>→ {quote.destinationAddress}</p>
                        </div>
                      </div>
                      <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                        🚗 {quote.vehicleId} · {quote.distanceKm} km
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '1.75rem', margin: '0 0 0.75rem' }}>{quote.estimatedPrice}€</p>
                      <button
                        onClick={() => printInvoice(quote)}
                        style={{ background: '#1a3a1a', border: '1px solid #4caf50', color: '#4caf50', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Printer size={14} /> Facture
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Other courses (pending, accepted) */}
        {otherCourses.length > 0 && (
          <section>
            <h2 style={{ color: '#888', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} /> Demandes en cours
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {otherCourses.map((quote: any) => {
                const sc = statusColor[quote.status] || statusColor.pending;
                return (
                  <div key={quote.id} style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{ background: sc.bg, color: sc.color, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {statusLabel[quote.status] || quote.status}
                          </span>
                          <span style={{ color: '#555', fontSize: '0.75rem' }}>
                            {new Date(quote.createdAt).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                          <MapPin size={14} style={{ color: '#d4af37', marginTop: '0.1rem', flexShrink: 0 }} />
                          <div>
                            <p style={{ color: '#cccccc', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{quote.departureAddress}</p>
                            <p style={{ color: '#888888', fontSize: '0.8rem', margin: 0 }}>→ {quote.destinationAddress}</p>
                          </div>
                        </div>
                        <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                          🚗 {quote.vehicleId} · {quote.distanceKm} km
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '1.75rem', margin: 0 }}>{quote.estimatedPrice}€</p>
                        {quote.status === 'rejected' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <XCircle size={14} style={{ color: '#f44336' }} />
                            <span style={{ color: '#f44336', fontSize: '0.75rem' }}>Non retenu</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
