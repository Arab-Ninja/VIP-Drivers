'use client';

import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ChevronLeft, Clock, DollarSign } from 'lucide-react';

const VEHICLES = [
  { id: 'classe-e', name: 'Mercedes Classe E', hourlyPrice: 85 },
  { id: 'classe-s', name: 'Mercedes Classe S', hourlyPrice: 120 },
  { id: 'classe-v', name: 'Mercedes Classe V', hourlyPrice: 95 },
];

const calculateWithTVA = (price: number) => Math.round(price * 1.06 * 100) / 100;

export default function DisposalPage() {
  const [, navigate] = useLocation();
  const [vehicleId, setVehicleId] = useState('classe-e');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const createDisposalMutation = trpc.disposalRequests.create.useMutation();

  const calculatePrice = () => {
    if (!startDate || !startTime || !endDate || !endTime) return null;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (hours <= 0) return null;

    const vehicle = VEHICLES.find(v => v.id === vehicleId);
    const priceHTVA = hours * (vehicle?.hourlyPrice || 0);
    return calculateWithTVA(priceHTVA);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !startTime || !endDate || !endTime || !name || !email || !phone) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const price = calculatePrice();
    if (!price || price <= 0) {
      toast.error('Dates invalides');
      return;
    }

    try {
      const durationHours = Math.ceil((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 60 * 60));
      
      await createDisposalMutation.mutateAsync({
        vehicleId,
        startDate: new Date(`${startDate}T${startTime}`),
        endDate: new Date(`${endDate}T${endTime}`),
        durationHours,
        totalPrice: Math.round(price * 100),
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        eventDescription: notes,
      });

      toast.success('Demande de mise à disposition créée!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const vehicle = VEHICLES.find(v => v.id === vehicleId);
  const estimatedPrice = calculatePrice();

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
              MISE À DISPOSITION
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
                      {v.name} - {v.hourlyPrice}€/h
                    </option>
                  ))}
                </select>
              </div>

              {/* Date et heure de début */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
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

              {/* Date et heure de fin */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
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
                      marginBottom: '1rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informations supplémentaires..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#ffffff',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      minHeight: '100px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Bouton soumettre */}
              <button
                type="submit"
                disabled={createDisposalMutation.isPending || !startDate || !endDate}
                style={{
                  width: '100%',
                  background: !startDate || !endDate ? '#666666' : 'linear-gradient(135deg, #d4af37 0%, #e8c547 100%)',
                  color: '#000000',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: !startDate || !endDate ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  marginTop: '1rem',
                }}
              >
                {createDisposalMutation.isPending ? 'Création en cours...' : 'CRÉER LA DEMANDE'}
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

              {startDate && startTime && endDate && endTime && (
                <>
                  <div>
                    <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} /> Début
                    </p>
                    <p style={{ color: '#ffffff', fontWeight: 600 }}>{startDate} {startTime}</p>
                  </div>
                  <div>
                    <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} /> Fin
                    </p>
                    <p style={{ color: '#ffffff', fontWeight: 600 }}>{endDate} {endTime}</p>
                  </div>
                </>
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
