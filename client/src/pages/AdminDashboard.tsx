'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2, BarChart3, Users, FileText, Calendar, Edit2, Check, X, ImagePlus, LogIn, ChevronLeft, ChevronRight, Euro, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getLoginUrl } from '@/const';
import { ADMIN_EMAIL } from '@shared/const';

function VehicleImagesCarousel({ images, vehicleName }: { images: string[]; vehicleName: string }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#222', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#555', fontSize: '0.75rem' }}>Aucune image</span>
      </div>
    );
  }
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '0.25rem', overflow: 'hidden', background: '#000' }}>
      <img
        src={images[idx]}
        alt={`${vehicleName} ${idx + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22120%22><rect fill=%22%23222%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23555%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2212%22>Image</text></svg>'; }}
      />
      {images.length > 1 && (
        <>
          <button onClick={prev} style={{ position: 'absolute', left: '0.25rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={12} />
          </button>
          <button onClick={next} style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={12} />
          </button>
          <div style={{ position: 'absolute', bottom: '0.25rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.25rem' }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? '1rem' : '0.375rem', height: '0.375rem', borderRadius: '0.25rem', background: i === idx ? '#d4af37' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.2s' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const statusLabel: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  rejected: 'Rejeté',
  completed: 'Validée',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
};
const statusColor: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#2a2000', color: '#d4af37' },
  accepted: { bg: '#1a2a3a', color: '#4fc3f7' },
  rejected: { bg: '#3a1a1a', color: '#f44336' },
  completed: { bg: '#1a3a1a', color: '#4caf50' },
  confirmed: { bg: '#1a2a3a', color: '#4fc3f7' },
  cancelled: { bg: '#3a1a1a', color: '#f44336' },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'fleet' | 'quotes'>('overview');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', model: '', pricePerKm: 0, pricePerHour: 0 });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editPricePerKm, setEditPricePerKm] = useState<number>(0);
  const [editPricePerHour, setEditPricePerHour] = useState<number>(0);
  const [addingImageVehicleId, setAddingImageVehicleId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [quotesFilter, setQuotesFilter] = useState<'all' | 'transfers' | 'disposals'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = user && (user.role === 'admin' || user.email === ADMIN_EMAIL);
  const isDevelopment = import.meta.env.DEV;

  if (!isDevelopment && !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '1rem' }}>Connexion Requise</h1>
          <p style={{ color: '#888888', marginBottom: '2rem' }}>Veuillez vous connecter pour accéder au dashboard admin.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href={getLoginUrl()} style={{ background: '#d4af37', color: '#000000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={18} /> Se connecter
            </a>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#888888', border: '1px solid #333', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isDevelopment && !isOwner) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '1rem' }}>Accès Refusé</h1>
          <p style={{ color: '#888888', marginBottom: '2rem' }}>Permissions insuffisantes.</p>
          <button onClick={() => navigate('/')} style={{ background: '#d4af37', color: '#000000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  const { data: quotes = [], refetch: refetchQuotes } = trpc.quotes.list.useQuery();
  const { data: disposals = [], refetch: refetchDisposals } = trpc.disposalRequests.list.useQuery();
  const { data: vehicles = [], refetch: refetchVehicles } = trpc.vehicles.list.useQuery();

  const acceptQuoteMutation = trpc.quotes.accept.useMutation({ onSuccess: () => refetchQuotes() });
  const rejectQuoteMutation = trpc.quotes.reject.useMutation({ onSuccess: () => refetchQuotes() });
  const markQuoteCompletedMutation = trpc.quotes.markCompleted.useMutation({ onSuccess: () => refetchQuotes() });
  const acceptDisposalMutation = trpc.disposalRequests.accept.useMutation({ onSuccess: () => refetchDisposals() });
  const rejectDisposalMutation = trpc.disposalRequests.reject.useMutation({ onSuccess: () => refetchDisposals() });
  const markDisposalCompletedMutation = trpc.disposalRequests.markCompleted.useMutation({ onSuccess: () => refetchDisposals() });
  const createVehicleMutation = trpc.vehicles.create.useMutation();
  const deleteVehicleMutation = trpc.vehicles.delete.useMutation({ onSuccess: () => refetchVehicles() });
  const upsertVehicleMutation = trpc.vehicles.upsert.useMutation({ onSuccess: () => refetchVehicles() });
  const addImageMutation = trpc.vehicles.addImage.useMutation({ onSuccess: () => { refetchVehicles(); setAddingImageVehicleId(null); setNewImageUrl(''); } });
  const removeImageMutation = trpc.vehicles.removeImage.useMutation({ onSuccess: () => refetchVehicles() });
  const uploadImageMutation = trpc.vehicles.uploadImage.useMutation({
    onSuccess: async (data) => {
      if (data.url && addingImageVehicleId) {
        try { await addImageMutation.mutateAsync({ vehicleId: addingImageVehicleId, imageUrl: data.url }); }
        catch { toast.error("Image telechargee mais impossible de l'associer au vehicule"); }
      }
    },
  });

  const startEditing = (v: { id: string; pricePerKm: number; pricePerHour: number }) => { setEditingVehicleId(v.id); setEditPricePerKm(v.pricePerKm); setEditPricePerHour(v.pricePerHour); };
  const cancelEditing = () => setEditingVehicleId(null);
  const saveEditing = async (vehicle: any) => {
    try {
      await upsertVehicleMutation.mutateAsync({ vehicleId: vehicle.id, name: vehicle.name, category: vehicle.category || '', description: vehicle.description || '', features: vehicle.features || [], pricePerKm: editPricePerKm, pricePerHour: editPricePerHour, minDistance: vehicle.minDistance || 10, images: vehicle.images || [] });
      toast.success('Prix mis a jour!'); setEditingVehicleId(null);
    } catch { toast.error('Erreur mise a jour'); }
  };
  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.model || newVehicle.pricePerKm <= 0 || newVehicle.pricePerHour <= 0) { toast.error('Remplissez tous les champs'); return; }
    try { await createVehicleMutation.mutateAsync({ name: newVehicle.name, model: newVehicle.model, pricePerKm: newVehicle.pricePerKm, pricePerHour: newVehicle.pricePerHour }); toast.success('Vehicule ajoute!'); setNewVehicle({ name: '', model: '', pricePerKm: 0, pricePerHour: 0 }); setShowAddVehicle(false); }
    catch { toast.error('Erreur ajout vehicule'); }
  };
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Supprimer ce vehicule?')) return;
    try { await deleteVehicleMutation.mutateAsync({ vehicleId }); toast.success('Vehicule supprime!'); }
    catch { toast.error('Erreur suppression'); }
  };
  const handleAddImageUrl = async (vehicleId: string) => {
    if (!newImageUrl.trim()) return;
    try { await addImageMutation.mutateAsync({ vehicleId, imageUrl: newImageUrl.trim() }); toast.success('Image ajoutee!'); }
    catch { toast.error('Erreur ajout image'); }
  };
  const handleUploadImage = async (vehicleId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = (e.target?.result as string).split(',')[1];
      try { await uploadImageMutation.mutateAsync({ vehicleId, base64Data, fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }); toast.success('Image telechargee!'); }
      catch { toast.error('Erreur telechargement'); }
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveImage = async (vehicleId: string, imageUrl: string) => {
    if (!confirm('Supprimer cette image?')) return;
    try { await removeImageMutation.mutateAsync({ vehicleId, imageUrl }); toast.success('Image supprimee!'); }
    catch { toast.error('Erreur suppression image'); }
  };
  const handleAcceptQuote = async (id: number) => {
    try { await acceptQuoteMutation.mutateAsync({ id }); toast.success('Devis accepte! Contactez le client pour le paiement.'); }
    catch { toast.error("Erreur acceptation"); }
  };
  const handleRejectQuote = async (id: number) => {
    if (!confirm('Rejeter et supprimer ce devis?')) return;
    try { await rejectQuoteMutation.mutateAsync({ id }); toast.success('Devis rejete et supprime.'); }
    catch { toast.error('Erreur rejet'); }
  };
  const handleMarkQuoteCompleted = async (id: number) => {
    try { await markQuoteCompletedMutation.mutateAsync({ id }); toast.success('Course marquee comme validee!'); }
    catch { toast.error('Erreur'); }
  };
  const handleAcceptDisposal = async (id: number) => {
    try { await acceptDisposalMutation.mutateAsync({ id }); toast.success('Mise a disposition confirmee! Contactez le client pour le paiement.'); }
    catch { toast.error("Erreur acceptation"); }
  };
  const handleRejectDisposal = async (id: number) => {
    if (!confirm('Rejeter et supprimer cette mise a disposition?')) return;
    try { await rejectDisposalMutation.mutateAsync({ id }); toast.success('Mise a disposition rejetee et supprimee.'); }
    catch { toast.error('Erreur rejet'); }
  };
  const handleMarkDisposalCompleted = async (id: number) => {
    try { await markDisposalCompletedMutation.mutateAsync({ id }); toast.success('Mise a disposition marquee comme validee!'); }
    catch { toast.error('Erreur'); }
  };

  const completedQuotes = (quotes as any[]).filter((q: any) => q.status === 'completed');
  const completedDisposals = (disposals as any[]).filter((d: any) => d.status === 'completed');
  const pendingQuotes = (quotes as any[]).filter((q: any) => q.status === 'pending');
  const pendingDisposals = (disposals as any[]).filter((d: any) => d.status === 'pending');
  const chiffreAffaires = (
    completedQuotes.reduce((sum: number, q: any) => sum + (q.estimatedPrice || 0), 0) +
    completedDisposals.reduce((sum: number, d: any) => sum + (d.totalPrice || 0) / 100, 0)
  ).toFixed(2);

  const btnStyle = (color: string): React.CSSProperties => ({
    background: 'transparent', border: `1px solid ${color}`, color, padding: '0.35rem 0.75rem',
    borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap',
  });

  const renderQuoteCard = (quote: any) => {
    const sc = statusColor[quote.status] || statusColor.pending;
    return (
      <div key={quote.id} style={{ background: '#111111', border: '1px solid #333333', padding: '1.25rem', borderRadius: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'start' }}>
          <div>
            <p style={{ color: '#888', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</p>
            <p style={{ color: '#fff', fontWeight: 600, margin: '0.25rem 0 0' }}>
              {quote.clientFirstName && quote.clientLastName ? `${quote.clientFirstName} ${quote.clientLastName}` : quote.clientName}
            </p>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>{quote.clientEmail}</p>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>{quote.clientPhone}</p>
            {quote.clientCompany && <p style={{ color: '#aaa', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>🏢 {quote.clientCompany}</p>}
          </div>
          <div>
            <p style={{ color: '#888', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trajet</p>
            <p style={{ color: '#ccc', fontSize: '0.8rem', margin: '0.25rem 0 0.1rem' }}>📍 {quote.departureAddress}</p>
            <p style={{ color: '#ccc', fontSize: '0.8rem', margin: '0 0 0.25rem' }}>🏁 {quote.destinationAddress}</p>
            <p style={{ color: '#aaa', fontWeight: 600, margin: 0, fontSize: '0.85rem' }}>{quote.distanceKm} km • {quote.vehicleId}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>{quote.estimatedPrice}€</p>
            <p style={{ color: '#555', fontSize: '0.7rem', margin: '0.2rem 0 0.5rem' }}>{new Date(quote.createdAt).toLocaleDateString('fr-BE')}</p>
            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, background: sc.bg, color: sc.color, textTransform: 'uppercase' }}>
              {statusLabel[quote.status] || quote.status}
            </span>
            {quote.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => handleAcceptQuote(quote.id)} disabled={acceptQuoteMutation.isPending} style={btnStyle('#4caf50')}>
                  <CheckCircle2 size={13} /> Accepter
                </button>
                <button onClick={() => handleRejectQuote(quote.id)} disabled={rejectQuoteMutation.isPending} style={btnStyle('#f44336')}>
                  <XCircle size={13} /> Rejeter
                </button>
              </div>
            )}
            {quote.status === 'accepted' && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => handleMarkQuoteCompleted(quote.id)} disabled={markQuoteCompletedMutation.isPending} style={btnStyle('#4caf50')}>
                  <CheckCircle2 size={13} /> Marquer validee
                </button>
                <button onClick={() => handleRejectQuote(quote.id)} disabled={rejectQuoteMutation.isPending} style={btnStyle('#f44336')}>
                  <XCircle size={13} /> Annuler
                </button>
              </div>
            )}
          </div>
        </div>
        {quote.notes && <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.75rem 0 0', padding: '0.6rem', background: '#1a1a1a', borderRadius: '0.25rem' }}>📝 {quote.notes}</p>}
      </div>
    );
  };

  const renderDisposalCard = (disposal: any) => {
    const sc = statusColor[disposal.status] || statusColor.pending;
    return (
      <div key={disposal.id} style={{ background: '#111111', border: '1px solid #2a3a2a', padding: '1.25rem', borderRadius: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'start' }}>
          <div>
            <p style={{ color: '#888', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</p>
            <p style={{ color: '#fff', fontWeight: 600, margin: '0.25rem 0 0' }}>{disposal.clientName}</p>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>{disposal.clientEmail}</p>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>{disposal.clientPhone}</p>
            {disposal.eventDescription && <p style={{ color: '#aaa', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>📋 {disposal.eventDescription}</p>}
          </div>
          <div>
            <p style={{ color: '#888', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</p>
            <p style={{ color: '#ccc', fontSize: '0.8rem', margin: '0.25rem 0 0.1rem' }}>🚗 {disposal.vehicleId}</p>
            <p style={{ color: '#ccc', fontSize: '0.8rem', margin: '0 0 0.1rem' }}>⏱ {disposal.durationHours}h</p>
            {disposal.startDate && <p style={{ color: '#aaa', fontSize: '0.75rem', margin: '0.1rem 0 0' }}>📅 {new Date(disposal.startDate).toLocaleDateString('fr-BE')}</p>}
            {disposal.specialRequests && <p style={{ color: '#888', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>💬 {disposal.specialRequests}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>{(disposal.totalPrice / 100).toFixed(2)}€</p>
            <p style={{ color: '#555', fontSize: '0.7rem', margin: '0.2rem 0 0.5rem' }}>{new Date(disposal.createdAt).toLocaleDateString('fr-BE')}</p>
            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, background: sc.bg, color: sc.color, textTransform: 'uppercase' }}>
              {statusLabel[disposal.status] || disposal.status}
            </span>
            {disposal.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => handleAcceptDisposal(disposal.id)} disabled={acceptDisposalMutation.isPending} style={btnStyle('#4caf50')}>
                  <CheckCircle2 size={13} /> Accepter
                </button>
                <button onClick={() => handleRejectDisposal(disposal.id)} disabled={rejectDisposalMutation.isPending} style={btnStyle('#f44336')}>
                  <XCircle size={13} /> Rejeter
                </button>
              </div>
            )}
            {disposal.status === 'confirmed' && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => handleMarkDisposalCompleted(disposal.id)} disabled={markDisposalCompletedMutation.isPending} style={btnStyle('#4caf50')}>
                  <CheckCircle2 size={13} /> Marquer validee
                </button>
                <button onClick={() => handleRejectDisposal(disposal.id)} disabled={rejectDisposalMutation.isPending} style={btnStyle('#f44336')}>
                  <XCircle size={13} /> Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const allPendingItems = [
    ...(quotes as any[]).filter((q: any) => q.status === 'pending').map((q: any) => ({ ...q, _type: 'transfer' })),
    ...(disposals as any[]).filter((d: any) => d.status === 'pending').map((d: any) => ({ ...d, _type: 'disposal' })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const allAcceptedItems = [
    ...(quotes as any[]).filter((q: any) => q.status === 'accepted').map((q: any) => ({ ...q, _type: 'transfer' })),
    ...(disposals as any[]).filter((d: any) => d.status === 'confirmed').map((d: any) => ({ ...d, _type: 'disposal' })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const allCompletedItems = [
    ...(quotes as any[]).filter((q: any) => q.status === 'completed').map((q: any) => ({ ...q, _type: 'transfer' })),
    ...(disposals as any[]).filter((d: any) => d.status === 'completed').map((d: any) => ({ ...d, _type: 'disposal' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filterItem = (item: any) =>
    quotesFilter === 'all' ||
    (quotesFilter === 'transfers' && item._type === 'transfer') ||
    (quotesFilter === 'disposals' && item._type === 'disposal');

  const renderItem = (item: any, colorAccent?: string) => {
    if (item._type === 'transfer') return renderQuoteCard(item);
    return (
      <div key={`d-${item.id}`} style={{ borderLeft: `3px solid ${colorAccent || '#4fc3f7'}` }}>
        <div style={{ background: colorAccent === '#4caf50' ? '#0a1a0a' : '#0a1a2a', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={12} style={{ color: colorAccent || '#4fc3f7' }} />
          <span style={{ color: colorAccent || '#4fc3f7', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Mise a Disposition{colorAccent === '#4caf50' ? ' – Validee' : ''}</span>
        </div>
        {renderDisposalCard(item)}
      </div>
    );
  };

  const inputStyle: React.CSSProperties = { width: '100%', background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', paddingTop: '5rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#d4af37', marginBottom: '0.5rem' }}>TABLEAU DE BORD ADMIN</h1>
          <p style={{ color: '#888888' }}>Bienvenue {user?.name || 'Admin'}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid #222222', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          {(['overview', 'fleet', 'quotes'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? '#d4af37' : 'transparent', color: activeTab === tab ? '#000000' : '#888888', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', position: 'relative' }}>
              {tab === 'overview' && '📊 Apercu'}
              {tab === 'fleet' && '🚗 Flotte'}
              {tab === 'quotes' && (
                <>📄 Devis & Reservations{pendingQuotes.length + pendingDisposals.length > 0 && <span style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', background: '#f44336', color: '#fff', borderRadius: '50%', width: '1.1rem', height: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>{pendingQuotes.length + pendingDisposals.length}</span>}</>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {[
              { icon: <Clock size={22} style={{ color: '#d4af37' }} />, label: 'En attente', value: pendingQuotes.length + pendingDisposals.length, sub: `${pendingQuotes.length} transferts · ${pendingDisposals.length} mises a dispo`, border: '#333' },
              { icon: <FileText size={22} style={{ color: '#d4af37' }} />, label: 'Total Devis', value: (quotes as any[]).length, sub: 'Transferts recus', border: '#333' },
              { icon: <Calendar size={22} style={{ color: '#d4af37' }} />, label: 'Mises a Disposition', value: (disposals as any[]).length, sub: 'Demandes recues', border: '#333' },
              { icon: <Euro size={22} style={{ color: '#4caf50' }} />, label: "Chiffre d'Affaires", value: `${chiffreAffaires}€`, sub: 'Courses validees uniquement', border: '#2a4a2a', valueColor: '#4caf50' },
              { icon: <Users size={22} style={{ color: '#d4af37' }} />, label: 'Vehicules', value: vehicles.length, sub: 'Dans la flotte', border: '#333' },
              { icon: <BarChart3 size={22} style={{ color: '#4caf50' }} />, label: 'Courses Validees', value: completedQuotes.length + completedDisposals.length, sub: `${completedQuotes.length} transferts · ${completedDisposals.length} mises a dispo`, border: '#2a3a1a', valueColor: '#4caf50' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: '#111111', border: `1px solid ${kpi.border}`, padding: '1.5rem', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {kpi.icon}
                  <h3 style={{ color: '#888888', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: (kpi as any).valueColor || '#d4af37', margin: 0 }}>{kpi.value}</p>
                <p style={{ color: '#555', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'fleet' && (
          <div>
            <button onClick={() => setShowAddVehicle(!showAddVehicle)} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Ajouter un Vehicule
            </button>
            {showAddVehicle && (
              <div style={{ background: '#111111', border: '1px solid #333', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#d4af37', marginBottom: '1rem' }}>Nouveau Vehicule</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div><label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Nom</label><input type="text" placeholder="Mercedes Classe E" value={newVehicle.name} onChange={e => setNewVehicle({ ...newVehicle, name: e.target.value })} style={inputStyle} /></div>
                  <div><label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Modele</label><input type="text" placeholder="W213" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} style={inputStyle} /></div>
                  <div><label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Prix/km (€/km)</label><input type="number" step="0.5" min="0" value={newVehicle.pricePerKm || ''} onChange={e => setNewVehicle({ ...newVehicle, pricePerKm: parseFloat(e.target.value) })} style={inputStyle} /></div>
                  <div><label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Prix/heure (€/h)</label><input type="number" step="5" min="0" value={newVehicle.pricePerHour || ''} onChange={e => setNewVehicle({ ...newVehicle, pricePerHour: parseFloat(e.target.value) })} style={inputStyle} /></div>
                </div>
                <button onClick={handleAddVehicle} disabled={createVehicleMutation.isPending} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                  {createVehicleMutation.isPending ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {(vehicles as any[]).map((vehicle: any) => {
                const isEditing = editingVehicleId === vehicle.id;
                const isAddingImage = addingImageVehicleId === vehicle.id;
                const vehicleImages: string[] = Array.isArray(vehicle.images) ? vehicle.images : [];
                return (
                  <div key={vehicle.id} style={{ background: '#111111', border: '1px solid #333', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #222' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Photos ({vehicleImages.length})</span>
                        <button onClick={() => setAddingImageVehicleId(isAddingImage ? null : vehicle.id)} style={{ background: '#1a2a1a', border: '1px solid #4caf50', color: '#4caf50', padding: '0.3rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <ImagePlus size={12} /> Ajouter photo
                        </button>
                      </div>
                      <VehicleImagesCarousel images={vehicleImages} vehicleName={vehicle.name} />
                      {vehicleImages.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem', marginTop: '0.5rem' }}>
                          {vehicleImages.map((img: string, i: number) => (
                            <div key={i} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '0.2rem', overflow: 'hidden' }}>
                              <img src={img} alt={`${vehicle.name} ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <button onClick={() => handleRemoveImage(vehicle.id, img)} style={{ position: 'absolute', top: '0.1rem', right: '0.1rem', background: 'rgba(200,0,0,0.8)', border: 'none', color: '#fff', width: '1rem', height: '1rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={8} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {isAddingImage && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0d1a0d', borderRadius: '0.5rem', border: '1px solid #2a4a2a' }}>
                          <p style={{ color: '#4caf50', fontSize: '0.75rem', margin: '0 0 0.5rem' }}>Ajouter une image</p>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input type="url" placeholder="URL image (https://...)" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }} />
                            <button onClick={() => handleAddImageUrl(vehicle.id)} disabled={addImageMutation.isPending} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                              {addImageMutation.isPending ? '...' : 'OK'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(vehicle.id, f); }} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadImageMutation.isPending} style={{ background: '#1a1a2a', border: '1px solid #4444aa', color: '#8888ff', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <ImagePlus size={12} /> {uploadImageMutation.isPending ? 'Upload...' : 'Depuis PC'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                        <div>
                          <h3 style={{ color: '#d4af37', margin: '0 0 0.25rem', fontSize: '1rem' }}>{vehicle.name}</h3>
                          <p style={{ color: '#888', margin: 0, fontSize: '0.8rem' }}>{vehicle.category}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!isEditing ? (
                            <button onClick={() => startEditing({ id: vehicle.id, pricePerKm: vehicle.pricePerKm, pricePerHour: vehicle.pricePerHour })} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#d4af37', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }} title="Modifier">
                              <Edit2 size={14} />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => saveEditing(vehicle)} disabled={upsertVehicleMutation.isPending} style={{ background: '#1a3a1a', border: '1px solid #4caf50', color: '#4caf50', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}><Check size={14} /></button>
                              <button onClick={cancelEditing} style={{ background: '#3a1a1a', border: '1px solid #f44336', color: '#f44336', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}><X size={14} /></button>
                            </>
                          )}
                          <button onClick={() => handleDeleteVehicle(vehicle.id)} style={{ background: '#3a1a1a', border: '1px solid #f44336', color: '#f44336', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {isEditing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div><label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>€/km</label><input type="number" step="0.1" value={editPricePerKm} onChange={e => setEditPricePerKm(parseFloat(e.target.value))} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #d4af37', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', boxSizing: 'border-box' }} /></div>
                          <div><label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>€/heure</label><input type="number" step="5" value={editPricePerHour} onChange={e => setEditPricePerHour(parseFloat(e.target.value))} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #d4af37', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', boxSizing: 'border-box' }} /></div>
                        </div>
                      ) : (
                        <div style={{ color: '#888', fontSize: '0.875rem' }}>
                          <p style={{ margin: '0.25rem 0' }}>Prix par km: <span style={{ color: '#d4af37', fontWeight: 700 }}>{vehicle.pricePerKm}€/km</span></p>
                          <p style={{ margin: '0.25rem 0' }}>Prix par heure: <span style={{ color: '#d4af37', fontWeight: 700 }}>{vehicle.pricePerHour}€/h</span></p>
                          <p style={{ margin: '0.25rem 0' }}>Distance min: <span style={{ color: '#d4af37', fontWeight: 700 }}>{vehicle.minDistance} km</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {(['all', 'transfers', 'disposals'] as const).map(f => (
                <button key={f} onClick={() => setQuotesFilter(f)} style={{ background: quotesFilter === f ? '#333' : 'transparent', color: quotesFilter === f ? '#d4af37' : '#666', border: '1px solid #333', padding: '0.4rem 1rem', borderRadius: '1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  {f === 'all' && '🔀 Tous'}{f === 'transfers' && '🚗 Transferts'}{f === 'disposals' && '📅 Mises a Dispo'}
                </button>
              ))}
            </div>

            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ color: '#d4af37', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} /> En attente de traitement
                {allPendingItems.filter(filterItem).length > 0 && <span style={{ background: '#f44336', color: '#fff', borderRadius: '1rem', padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>{allPendingItems.filter(filterItem).length}</span>}
              </h2>
              {allPendingItems.filter(filterItem).length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.875rem' }}>Aucune demande en attente ✓</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>{allPendingItems.filter(filterItem).map(item => renderItem(item, '#4fc3f7'))}</div>
              )}
            </section>

            {allAcceptedItems.filter(filterItem).length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ color: '#4fc3f7', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} /> Acceptes – en attente de paiement
                </h2>
                <div style={{ display: 'grid', gap: '0.75rem' }}>{allAcceptedItems.filter(filterItem).map(item => renderItem(item, '#4fc3f7'))}</div>
              </section>
            )}

            <section>
              <h2 style={{ color: '#4caf50', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={16} /> Courses Validees
                {allCompletedItems.filter(filterItem).length > 0 && <span style={{ background: '#1a3a1a', color: '#4caf50', borderRadius: '1rem', padding: '0.1rem 0.5rem', fontSize: '0.7rem', border: '1px solid #4caf50' }}>{allCompletedItems.filter(filterItem).length}</span>}
              </h2>
              {allCompletedItems.filter(filterItem).length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.875rem' }}>Aucune course validee pour l'instant</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>{allCompletedItems.filter(filterItem).map(item => renderItem(item, '#4caf50'))}</div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
