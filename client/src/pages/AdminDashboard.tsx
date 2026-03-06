'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2, BarChart3, Users, FileText, Calendar, Edit2, Check, X, ImagePlus, LogIn } from 'lucide-react';
import { getAllVehicles } from '@shared/vehicles';
import { getLoginUrl } from '@/const';
import { ADMIN_EMAIL } from '@shared/const';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'fleet' | 'quotes' | 'disposals'>('overview');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    name: '',
    model: '',
    pricePerKm: 0,
    pricePerHour: 0,
  });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editPricePerKm, setEditPricePerKm] = useState<number>(0);
  const [editPricePerHour, setEditPricePerHour] = useState<number>(0);
  const [addingImageVehicleId, setAddingImageVehicleId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const staticVehicles = getAllVehicles();

  // Admin check: by role OR by email
  const isOwner = user && (user.role === 'admin' || user.email === ADMIN_EMAIL);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '1rem' }}>Connexion Requise</h1>
          <p style={{ color: '#888888', marginBottom: '2rem' }}>Veuillez vous connecter pour accéder au dashboard admin.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a
              href={getLoginUrl()}
              style={{ background: '#d4af37', color: '#000000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LogIn size={18} /> Se connecter
            </a>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'transparent', color: '#888888', border: '1px solid #333', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '1rem' }}>Accès Refusé</h1>
          <p style={{ color: '#888888', marginBottom: '2rem' }}>Vous n'avez pas les permissions pour accéder au dashboard admin.</p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#d4af37',
              color: '#000000',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Fetch data
  const { data: quotes = [] } = trpc.quotes.list.useQuery();
  const { data: disposals = [] } = trpc.disposalRequests.list.useQuery();
  const { data: vehicles = [], refetch: refetchVehicles } = trpc.vehicles.list.useQuery();

  // Mutations
  const createVehicleMutation = trpc.vehicles.create.useMutation();
  const deleteVehicleMutation = trpc.vehicles.delete.useMutation({ onSuccess: () => refetchVehicles() });
  const upsertVehicleMutation = trpc.vehicles.upsert.useMutation({ onSuccess: () => refetchVehicles() });
  const addImageMutation = trpc.vehicles.addImage.useMutation({ onSuccess: () => { refetchVehicles(); setAddingImageVehicleId(null); setNewImageUrl(''); } });
  const removeImageMutation = trpc.vehicles.removeImage.useMutation({ onSuccess: () => refetchVehicles() });
  const uploadImageMutation = trpc.vehicles.uploadImage.useMutation({ onSuccess: async (data) => {
    if (data.url && addingImageVehicleId) {
      try {
        await addImageMutation.mutateAsync({ vehicleId: addingImageVehicleId, imageUrl: data.url });
      } catch {
        toast.error('Image téléchargée mais impossible de l\'associer au véhicule');
      }
    }
  }});

  const startEditing = (vehicle: { id: string; pricePerKm: number; pricePerHour: number }) => {
    setEditingVehicleId(vehicle.id);
    setEditPricePerKm(vehicle.pricePerKm);
    setEditPricePerHour(vehicle.pricePerHour);
  };

  const cancelEditing = () => {
    setEditingVehicleId(null);
  };

  const saveEditing = async (vehicle: any) => {
    try {
      await upsertVehicleMutation.mutateAsync({
        vehicleId: vehicle.id,
        name: vehicle.name,
        category: vehicle.category || '',
        description: vehicle.description || '',
        features: vehicle.features || [],
        pricePerKm: editPricePerKm,
        pricePerHour: editPricePerHour,
        minDistance: vehicle.minDistance || 10,
        images: vehicle.images || [],
      });
      toast.success('Prix mis à jour!');
      setEditingVehicleId(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.model || newVehicle.pricePerKm <= 0 || newVehicle.pricePerHour <= 0) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      await createVehicleMutation.mutateAsync({
        name: newVehicle.name,
        model: newVehicle.model,
        pricePerKm: newVehicle.pricePerKm,
        pricePerHour: newVehicle.pricePerHour,
      });

      toast.success('Véhicule ajouté!');
      setNewVehicle({ name: '', model: '', pricePerKm: 0, pricePerHour: 0 });
      setShowAddVehicle(false);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du véhicule');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Êtes-vous sûr?')) return;

    try {
      await deleteVehicleMutation.mutateAsync({ vehicleId });
      toast.success('Véhicule supprimé!');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddImageUrl = async (vehicleId: string) => {
    if (!newImageUrl.trim()) return;
    try {
      await addImageMutation.mutateAsync({ vehicleId, imageUrl: newImageUrl.trim() });
      toast.success('Image ajoutée!');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de l\'image');
    }
  };

  const handleUploadImage = async (vehicleId: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        await uploadImageMutation.mutateAsync({
          vehicleId,
          base64Data,
          fileName: file.name,
          contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        });
        toast.success('Image téléchargée!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleRemoveImage = async (vehicleId: string, imageUrl: string) => {
    if (!confirm('Supprimer cette image?')) return;
    try {
      await removeImageMutation.mutateAsync({ vehicleId, imageUrl });
      toast.success('Image supprimée!');
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'image');
    }
  };

  // KPI calculations
  const totalQuotes = quotes.length;
  const totalDisposals = disposals.length;
  const totalRevenue = (quotes.reduce((sum: number, q: any) => sum + (q.estimatedPrice || 0), 0) + disposals.reduce((sum: number, d: any) => sum + (d.totalPrice || 0) / 100, 0)).toFixed(2);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', paddingTop: '5rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#d4af37', marginBottom: '0.5rem' }}>
            TABLEAU DE BORD ADMIN
          </h1>
          <p style={{ color: '#888888' }}>Bienvenue {user.name}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333333', paddingBottom: '1rem' }}>
          {(['overview', 'fleet', 'quotes', 'disposals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? '#d4af37' : 'transparent',
                color: activeTab === tab ? '#000000' : '#888888',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {tab === 'overview' && '📊 Aperçu'}
              {tab === 'fleet' && '🚗 Flotte'}
              {tab === 'quotes' && '📄 Devis'}
              {tab === 'disposals' && '📅 Mises à Disposition'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <FileText size={24} style={{ color: '#d4af37' }} />
                <h3 style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Total Devis</h3>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 900, color: '#d4af37', margin: 0 }}>{totalQuotes}</p>
            </div>

            <div style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Calendar size={24} style={{ color: '#d4af37' }} />
                <h3 style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Mises à Disposition</h3>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 900, color: '#d4af37', margin: 0 }}>{totalDisposals}</p>
            </div>

            <div style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <BarChart3 size={24} style={{ color: '#d4af37' }} />
                <h3 style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Revenu Total</h3>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 900, color: '#d4af37', margin: 0 }}>{totalRevenue}€</p>
            </div>

            <div style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Users size={24} style={{ color: '#d4af37' }} />
                <h3 style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Véhicules</h3>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 900, color: '#d4af37', margin: 0 }}>{vehicles.length}</p>
            </div>
          </div>
        )}

        {/* Fleet Tab */}
        {activeTab === 'fleet' && (
          <div>
            <button
              onClick={() => setShowAddVehicle(!showAddVehicle)}
              style={{
                background: '#d4af37',
                color: '#000000',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plus size={20} /> Ajouter un Véhicule
            </button>

            {showAddVehicle && (
              <div style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#d4af37', marginBottom: '1rem' }}>Nouveau Véhicule</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Nom du véhicule</label>
                    <input
                      type="text"
                      placeholder="ex: Mercedes Classe E"
                      value={newVehicle.name}
                      onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Modèle</label>
                    <input
                      type="text"
                      placeholder="ex: W213"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Prix par km (€/km)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="ex: 3.50"
                      value={newVehicle.pricePerKm || ''}
                      onChange={(e) => setNewVehicle({ ...newVehicle, pricePerKm: parseFloat(e.target.value) })}
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Prix par heure (€/heure)</label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      placeholder="ex: 85"
                      value={newVehicle.pricePerHour || ''}
                      onChange={(e) => setNewVehicle({ ...newVehicle, pricePerHour: parseFloat(e.target.value) })}
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddVehicle}
                  disabled={createVehicleMutation.isPending}
                  style={{ background: '#d4af37', color: '#000000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  {createVehicleMutation.isPending ? 'Ajout en cours...' : 'Ajouter'}
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {staticVehicles.map((vehicle) => {
                const isEditing = editingVehicleId === vehicle.id;
                const isAddingImage = addingImageVehicleId === vehicle.id;
                return (
                  <div key={vehicle.id} style={{ background: '#111111', border: '1px solid #333333', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    {/* Vehicle Images Gallery */}
                    <div style={{ padding: '1rem', borderBottom: '1px solid #222' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Photos ({vehicle.images.length})
                        </span>
                        <button
                          onClick={() => setAddingImageVehicleId(isAddingImage ? null : vehicle.id)}
                          style={{ background: '#1a2a1a', border: '1px solid #4caf50', color: '#4caf50', padding: '0.3rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <ImagePlus size={12} /> Ajouter photo
                        </button>
                      </div>

                      {/* Images grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        {vehicle.images.map((img, i) => (
                          <div key={i} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '0.25rem', overflow: 'hidden' }}>
                            <img
                              src={img}
                              alt={`${vehicle.name} ${i + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%23222"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">Image</text></svg>'; }}
                            />
                            <button
                              onClick={() => handleRemoveImage(vehicle.id, img)}
                              style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(200,0,0,0.8)', border: 'none', color: '#fff', width: '1.25rem', height: '1.25rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}
                              title="Supprimer cette image"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add image panel */}
                      {isAddingImage && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0d1a0d', borderRadius: '0.5rem', border: '1px solid #2a4a2a' }}>
                          <p style={{ color: '#4caf50', fontSize: '0.75rem', margin: '0 0 0.5rem' }}>Ajouter une image</p>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                              type="url"
                              placeholder="URL de l'image (https://...)"
                              value={newImageUrl}
                              onChange={(e) => setNewImageUrl(e.target.value)}
                              style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}
                            />
                            <button
                              onClick={() => handleAddImageUrl(vehicle.id)}
                              disabled={addImageMutation.isPending}
                              style={{ background: '#d4af37', color: '#000', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              {addImageMutation.isPending ? '...' : 'Ajouter'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(vehicle.id, file);
                              }}
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadImageMutation.isPending}
                              style={{ background: '#1a1a2a', border: '1px solid #4444aa', color: '#8888ff', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <ImagePlus size={12} /> {uploadImageMutation.isPending ? 'Upload...' : 'Télécharger depuis mon PC'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                        <div>
                          <h3 style={{ color: '#d4af37', margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{vehicle.name}</h3>
                          <p style={{ color: '#888888', margin: 0, fontSize: '0.8rem' }}>{vehicle.category}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!isEditing ? (
                            <button
                              onClick={() => startEditing({ id: vehicle.id, pricePerKm: vehicle.pricePerKm, pricePerHour: vehicle.pricePerHour })}
                              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#d4af37', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                              title="Modifier les prix"
                            >
                              <Edit2 size={14} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => saveEditing(vehicle)}
                                disabled={upsertVehicleMutation.isPending}
                                style={{ background: '#1a3a1a', border: '1px solid #4caf50', color: '#4caf50', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                                title="Sauvegarder"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                style={{ background: '#3a1a1a', border: '1px solid #f44336', color: '#f44336', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                                title="Annuler"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            style={{ background: '#3a1a1a', border: '1px solid #f44336', color: '#f44336', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                            title="Supprimer le véhicule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Prix par km (€/km)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editPricePerKm}
                              onChange={(e) => setEditPricePerKm(parseFloat(e.target.value))}
                              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #d4af37', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Prix par heure (€/heure)</label>
                            <input
                              type="number"
                              step="5"
                              value={editPricePerHour}
                              onChange={(e) => setEditPricePerHour(parseFloat(e.target.value))}
                              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #d4af37', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#888888', fontSize: '0.875rem' }}>
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

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {quotes.length === 0 ? (
              <p style={{ color: '#888888' }}>Aucun devis</p>
            ) : (
              quotes.map((quote: any) => (
                <div key={quote.id} style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ color: '#888888', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</p>
                      <p style={{ color: '#ffffff', fontWeight: 600, margin: '0.25rem 0' }}>
                        {quote.clientFirstName && quote.clientLastName
                          ? `${quote.clientFirstName} ${quote.clientLastName}`
                          : quote.clientName}
                      </p>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>{quote.clientEmail}</p>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>{quote.clientPhone}</p>
                      {quote.clientCompany && <p style={{ color: '#aaaaaa', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>🏢 {quote.clientCompany}</p>}
                      {quote.clientVatNumber && <p style={{ color: '#aaaaaa', fontSize: '0.8rem', margin: 0 }}>TVA: {quote.clientVatNumber}</p>}
                    </div>
                    <div>
                      <p style={{ color: '#888888', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trajet</p>
                      <p style={{ color: '#cccccc', fontSize: '0.8rem', margin: '0.25rem 0' }}>📍 {quote.departureAddress}</p>
                      <p style={{ color: '#cccccc', fontSize: '0.8rem', margin: '0 0 0.25rem' }}>🏁 {quote.destinationAddress}</p>
                      <p style={{ color: '#ffffff', fontWeight: 600, margin: 0 }}>{quote.distanceKm} km • {quote.vehicleId}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#888888', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prix estimé</p>
                      <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '1.5rem', margin: '0.25rem 0' }}>{quote.estimatedPrice}€</p>
                      <p style={{ color: '#555', fontSize: '0.75rem', margin: 0 }}>{new Date(quote.createdAt).toLocaleDateString('fr-BE')}</p>
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, background: quote.status === 'pending' ? '#2a2000' : '#1a3a1a', color: quote.status === 'pending' ? '#d4af37' : '#4caf50', textTransform: 'uppercase' }}>
                        {quote.status}
                      </span>
                    </div>
                  </div>
                  {quote.notes && (
                    <p style={{ color: '#888888', fontSize: '0.8rem', margin: '1rem 0 0', padding: '0.75rem', background: '#1a1a1a', borderRadius: '0.25rem' }}>
                      📝 {quote.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Disposals Tab */}
        {activeTab === 'disposals' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {disposals.length === 0 ? (
              <p style={{ color: '#888888' }}>Aucune mise à disposition</p>
            ) : (
              disposals.map((disposal: any) => (
                <div key={disposal.id} style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Client</p>
                      <p style={{ color: '#ffffff', fontWeight: 600, margin: '0.25rem 0' }}>{disposal.clientName}</p>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>{disposal.clientEmail}</p>
                    </div>
                    <div>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Détails</p>
                      <p style={{ color: '#ffffff', fontWeight: 600, margin: '0.25rem 0' }}>{disposal.durationHours}h</p>
                      <p style={{ color: '#d4af37', fontWeight: 900, margin: 0 }}>{(disposal.totalPrice / 100).toFixed(2)}€</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
