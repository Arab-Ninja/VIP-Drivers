'use client';

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2, BarChart3, Users, FileText, Calendar, Edit2, Check, X } from 'lucide-react';
import { getAllVehicles } from '@shared/vehicles';

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

  const staticVehicles = getAllVehicles();

  // Vérifier que l'utilisateur est le propriétaire
  const ownerOpenId = import.meta.env.VITE_OWNER_OPEN_ID;
  const isOwner = user && user.openId === ownerOpenId;

  // TODO: Restaurer les vérifications d'authentification pour la production
  // En développement, on ignore temporairement l'authentification pour les tests
  const isDevelopment = import.meta.env.DEV;

  if (!isDevelopment && !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '1rem' }}>Connexion Requise</h1>
          <p style={{ color: '#888888', marginBottom: '2rem' }}>Veuillez vous connecter pour accéder au dashboard.</p>
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

  if (!isDevelopment && !isOwner) {
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
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();

  // Mutations
  const createVehicleMutation = trpc.vehicles.create.useMutation();
  const deleteVehicleMutation = trpc.vehicles.delete.useMutation();
  const upsertVehicleMutation = trpc.vehicles.upsert.useMutation();

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
          <p style={{ color: '#888888' }}>Bienvenue {user?.name || 'Admin'}</p>
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
                  <input
                    type="text"
                    placeholder="Nom (ex: Mercedes Classe E)"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                    style={{ background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Modèle"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    style={{ background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Prix/km"
                    value={newVehicle.pricePerKm}
                    onChange={(e) => setNewVehicle({ ...newVehicle, pricePerKm: parseFloat(e.target.value) })}
                    style={{ background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Prix/heure"
                    value={newVehicle.pricePerHour}
                    onChange={(e) => setNewVehicle({ ...newVehicle, pricePerHour: parseFloat(e.target.value) })}
                    style={{ background: '#1a1a1a', border: '1px solid #333333', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {staticVehicles.map((vehicle) => {
                const isEditing = editingVehicleId === vehicle.id;
                return (
                  <div key={vehicle.id} style={{ background: '#111111', border: '1px solid #333333', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    {/* Vehicle Images */}
                    <div style={{ position: 'relative' }}>
                      <img
                        src={vehicle.images[0]}
                        alt={vehicle.name}
                        style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                        {vehicle.images.slice(1).map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`${vehicle.name} ${i + 2}`}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.25rem', border: '1px solid #444' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ))}
                      </div>
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
                            >
                              <Edit2 size={14} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => saveEditing(vehicle)}
                                disabled={upsertVehicleMutation.isPending}
                                style={{ background: '#1a3a1a', border: '1px solid #4caf50', color: '#4caf50', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                style={{ background: '#3a1a1a', border: '1px solid #f44336', color: '#f44336', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            style={{ background: '#3a1a1a', border: '1px solid #f44336', color: '#f44336', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Prix/km (€)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editPricePerKm}
                              onChange={(e) => setEditPricePerKm(parseFloat(e.target.value))}
                              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #d4af37', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Prix/h (€)</label>
                            <input
                              type="number"
                              value={editPricePerHour}
                              onChange={(e) => setEditPricePerHour(parseFloat(e.target.value))}
                              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #d4af37', color: '#fff', padding: '0.5rem', borderRadius: '0.25rem', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#888888', fontSize: '0.875rem' }}>
                          <p style={{ margin: '0.25rem 0' }}>Prix/km: <span style={{ color: '#d4af37' }}>{vehicle.pricePerKm}€</span></p>
                          <p style={{ margin: '0.25rem 0' }}>Prix/h: <span style={{ color: '#d4af37' }}>{vehicle.pricePerHour}€</span></p>
                          <p style={{ margin: '0.25rem 0' }}>Distance min: <span style={{ color: '#d4af37' }}>{vehicle.minDistance} km</span></p>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Client</p>
                      <p style={{ color: '#ffffff', fontWeight: 600, margin: '0.25rem 0' }}>{quote.clientName}</p>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>{quote.clientEmail}</p>
                    </div>
                    <div>
                      <p style={{ color: '#888888', fontSize: '0.875rem', margin: 0 }}>Détails</p>
                      <p style={{ color: '#ffffff', fontWeight: 600, margin: '0.25rem 0' }}>{quote.distanceKm}km</p>
                      <p style={{ color: '#d4af37', fontWeight: 900, margin: 0 }}>{quote.estimatedPrice}€</p>
                    </div>
                  </div>
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
