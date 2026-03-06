'use client';

import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ChevronLeft, MapPin, DollarSign } from 'lucide-react';

const VEHICLES = [
  { id: 'classe-e', name: 'Mercedes Classe E', price: 3 },
  { id: 'classe-s', name: 'Mercedes Classe S', price: 4 },
  { id: 'classe-v', name: 'Mercedes Classe V', price: 3.5 },
];

export default function QuotePage() {
  const [, navigate] = useLocation();
  const [vehicleId, setVehicleId] = useState('classe-e');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const createQuoteMutation = trpc.quotes.create.useMutation();

  const handleCalculateDistance = async () => {
    if (!departure || !destination) {
      toast.error('Veuillez remplir les adresses');
      return;
    }

    setLoading(true);
    try {
      // Simulation: distance aléatoire entre 5 et 50 km
      const dist = Math.floor(Math.random() * 45) + 5;
      setDistance(dist);
      toast.success(`Distance estimée: ${dist}km`);
    } catch (error) {
      toast.error('Erreur lors du calcul');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departure || !destination || !name || !email || !phone || distance === null) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const vehicle = VEHICLES.find(v => v.id === vehicleId);
    const estimatedPrice = distance * (vehicle?.price || 0);

    try {
      await createQuoteMutation.mutateAsync({
        vehicleId,
        departureAddress: departure,
        destinationAddress: destination,
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        distanceKm: distance,
        estimatedPrice,
      });

      toast.success('Devis créé avec succès!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const vehicle = VEHICLES.find(v => v.id === vehicleId);
  const estimatedPrice = distance ? distance * (vehicle?.price || 0) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: '5rem', paddingBottom: '2.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        {/* Bouton retour */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#d4af37',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
            fontSize: '1rem',
            padding: 0,
          }}
        >
          <ChevronLeft size={20} /> Retour
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Formulaire */}
          <div
            style={{
              background: '#111111',
              border: '2px dashed #d4af37',
              borderRadius: '0.5rem',
              padding: '2rem',
            }}
          >
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: '#d4af37',
                marginBottom: '2rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              DEVIS
            </h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Véhicule */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                  Véhicule
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  {VEHICLES.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} - {v.price}€/km
                    </option>
                  ))}
                </select>
              </div>

              {/* Adresse départ */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                  Adresse de départ
                </label>
                <input
                  type="text"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  placeholder="Ex: Rue de la Paix, Bruxelles"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Adresse destination */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                  Adresse de destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: Avenue Louise, Bruxelles"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Bouton calculer */}
              <button
                type="button"
                onClick={handleCalculateDistance}
                disabled={loading || !departure || !destination}
                style={{
                  width: '100%',
                  background: !departure || !destination ? '#666666' : 'linear-gradient(135deg, #d4af37 0%, #e8c547 100%)',
                  color: '#000000',
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: !departure || !destination ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
              >
                {loading ? 'Calcul en cours...' : 'CALCULER LA DISTANCE'}
              </button>

              {/* Informations client */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333333' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      marginBottom: '1rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      marginBottom: '1rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+32 1 23 45 67"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Bouton soumettre */}
              <button
                type="submit"
                disabled={createQuoteMutation.isPending || !distance}
                style={{
                  width: '100%',
                  background: !distance ? '#666666' : 'linear-gradient(135deg, #d4af37 0%, #e8c547 100%)',
                  color: '#000000',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: !distance ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  marginTop: '1rem',
                }}
              >
                {createQuoteMutation.isPending ? 'Création en cours...' : 'CRÉER LE DEVIS'}
              </button>
            </form>
          </div>

          {/* Résumé */}
          <div
            style={{
              background: '#111111',
              border: '2px dashed #d4af37',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              height: 'fit-content',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#d4af37', marginBottom: '1.5rem' }}>
              RÉSUMÉ
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Véhicule</p>
                <p style={{ color: '#ffffff', fontWeight: 600 }}>{vehicle?.name}</p>
              </div>

              {distance && (
                <div>
                  <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} /> Distance
                  </p>
                  <p style={{ color: '#ffffff', fontWeight: 600 }}>{distance} km</p>
                </div>
              )}

              {estimatedPrice && (
                <div style={{ paddingTop: '1rem', borderTop: '1px solid #333333' }}>
                  <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} /> Prix estimé
                  </p>
                  <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '1.75rem' }}>{estimatedPrice}€</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
