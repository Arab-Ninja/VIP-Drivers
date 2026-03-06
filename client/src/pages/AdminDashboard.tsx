'use client';

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2, BarChart3, Users, FileText, Calendar } from 'lucide-react';

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

  // Vérifier que l'utilisateur est le propriétaire
  const ownerOpenId = import.meta.env.VITE_OWNER_OPEN_ID;
  const isOwner = user && user.openId === ownerOpenId;

  if (!user) {
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
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();

  // Mutations
  const createVehicleMutation = trpc.vehicles.create.useMutation();
  const deleteVehicleMutation = trpc.vehicles.delete.useMutation();

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
                  <input
                    type="text"
                    placeholder="Nom (ex: Mercedes Classe E)"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Modèle"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Prix/km"
                    value={newVehicle.pricePerKm}
                    onChange={(e) => setNewVehicle({ ...newVehicle, pricePerKm: parseFloat(e.target.value) })}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Prix/heure"
                    value={newVehicle.pricePerHour}
                    onChange={(e) => setNewVehicle({ ...newVehicle, pricePerHour: parseFloat(e.target.value) })}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                    }}
                  />
                </div>
                <button
                  onClick={handleAddVehicle}
                  disabled={createVehicleMutation.isPending}
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
                  {createVehicleMutation.isPending ? 'Ajout en cours...' : 'Ajouter'}
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {vehicles.map((vehicle: any) => (
                <div key={vehicle.id} style={{ background: '#111111', border: '1px solid #333333', padding: '1.5rem', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ color: '#d4af37', margin: '0 0 0.5rem 0' }}>{vehicle.name}</h3>
                      <p style={{ color: '#888888', margin: 0, fontSize: '0.875rem' }}>{vehicle.model}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      style={{
                        background: '#ff4444',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ color: '#888888', fontSize: '0.875rem' }}>
                    <p style={{ margin: '0.25rem 0' }}>Prix/km: <span style={{ color: '#d4af37' }}>{vehicle.pricePerKm}€</span></p>
                    <p style={{ margin: '0.25rem 0' }}>Prix/h: <span style={{ color: '#d4af37' }}>{vehicle.pricePerHour}€</span></p>
                  </div>
                </div>
              ))}
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
