'use client';

import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ChevronLeft, ChevronRight, Clock, DollarSign } from 'lucide-react';
import { getAllVehicles } from '@shared/vehicles';

const vehicles = getAllVehicles();

const calculateWithTVA = (price: number) => Math.round(price * 1.06 * 100) / 100;

function VehicleCarousel({ images, vehicleName }: { images: string[]; vehicleName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () => setCurrentIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrentIndex(i => (i + 1) % images.length);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '0.5rem', overflow: 'hidden', background: '#000' }}>
      <img
        src={images[currentIndex]}
        alt={`${vehicleName} - photo ${currentIndex + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s' }}
        onError={(e) => { (e.target as HTMLImageElement).src = images[0]; }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            style={{
              position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.6)', border: 'none', color: '#ffffff',
              borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            style={{
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.6)', border: 'none', color: '#ffffff',
              borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronRight size={14} />
          </button>
          <div style={{ position: 'absolute', bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.375rem' }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: i === currentIndex ? '1.5rem' : '0.5rem',
                  height: '0.5rem',
                  borderRadius: '0.25rem',
                  background: i === currentIndex ? '#d4af37' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'width 0.2s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DisposalPage() {
  const [, navigate] = useLocation();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || 'classe-e');
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

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const priceHTVA = hours * (vehicle?.pricePerHour || 0);
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

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const estimatedPrice = calculatePrice();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: '#1a1a1a',
    border: '1px solid #333333',
    color: '#ffffff',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: '#ffffff',
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: '5rem', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '0.875rem', padding: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          <ChevronLeft size={18} /> Retour à l'accueil
        </button>

        {/* Page title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Mise à <span style={{ color: '#d4af37' }}>Disposition</span>
          </h1>
          <p style={{ color: '#888888', marginTop: '0.5rem', fontSize: '1rem' }}>Réservez votre véhicule avec chauffeur à l'heure</p>
        </div>

        {/* Vehicle Selection */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#d4af37', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontWeight: 700 }}>
            1. Choisissez votre véhicule
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {vehicles.map(vehicle => (
              <div
                key={vehicle.id}
                onClick={() => setVehicleId(vehicle.id)}
                style={{
                  background: vehicleId === vehicle.id ? '#1a1a0a' : '#111111',
                  border: `2px solid ${vehicleId === vehicle.id ? '#d4af37' : '#222222'}`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {vehicleId === vehicle.id && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: '#d4af37', borderRadius: '50%', width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.75rem', fontWeight: 900, zIndex: 1 }}>✓</div>
                )}
                <VehicleCarousel images={[...vehicle.images] as string[]} vehicleName={vehicle.name} />
                <div style={{ marginTop: '1rem' }}>
                  <h3 style={{ color: '#ffffff', fontWeight: 700, margin: '0 0 0.25rem', fontSize: '1rem' }}>{vehicle.name}</h3>
                  <p style={{ color: '#888888', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>{vehicle.category}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#d4af37', fontWeight: 700, fontSize: '0.875rem' }}>{vehicle.pricePerHour}€/h</span>
                    <span style={{ color: '#666666', fontSize: '0.75rem' }}>TVA 6% incluse</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form + Summary grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
          {/* Form */}
          <div style={{ background: '#111111', borderRadius: '1rem', padding: '2rem', border: '1px solid #1e1e1e' }}>
            <h2 style={{ color: '#d4af37', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', fontWeight: 700 }}>
              2. Dates et horaires
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Start date/time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Date de début</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Heure de début</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* End date/time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Date de fin</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Heure de fin</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '1.5rem' }}>
                <h2 style={{ color: '#d4af37', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', fontWeight: 700 }}>
                  3. Vos coordonnées
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Nom complet</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" style={inputStyle} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.com" style={inputStyle} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Téléphone</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32 4 XX XX XX XX" style={inputStyle} required />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Notes (optionnel)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Informations supplémentaires, description de l'événement..."
                      style={{ ...inputStyle, minHeight: '100px', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={createDisposalMutation.isPending || !startDate || !endDate}
                style={{
                  background: !startDate || !endDate ? '#1e1e1e' : 'linear-gradient(135deg, #d4af37 0%, #e8c547 100%)',
                  color: !startDate || !endDate ? '#555555' : '#000000',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  cursor: !startDate || !endDate ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: '0.5rem',
                }}
              >
                {createDisposalMutation.isPending ? 'Envoi en cours...' : 'Envoyer ma demande →'}
              </button>
            </form>
          </div>

          {/* Summary sidebar */}
          <div style={{ position: 'sticky', top: '6rem' }}>
            <div style={{ background: '#111111', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #1e1e1e' }}>
              <h2 style={{ color: '#d4af37', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', fontWeight: 700 }}>
                Récapitulatif
              </h2>

              <div style={{ marginBottom: '1.25rem' }}>
                <img
                  src={selectedVehicle?.images?.[0] as string || selectedVehicle?.image}
                  alt={selectedVehicle?.name}
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '0.75rem' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h3 style={{ color: '#ffffff', fontWeight: 700, margin: '0 0 0.25rem', fontSize: '1rem' }}>{selectedVehicle?.name}</h3>
                <p style={{ color: '#888888', fontSize: '0.8rem', margin: 0 }}>{selectedVehicle?.category}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #1e1e1e', paddingTop: '1rem' }}>
                {startDate && startTime && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ background: '#1a3a1a', borderRadius: '50%', width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.125rem' }}>
                      <Clock size={12} style={{ color: '#4caf50' }} />
                    </div>
                    <div>
                      <p style={{ color: '#666666', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Début</p>
                      <p style={{ color: '#cccccc', fontSize: '0.8rem', margin: '0.125rem 0 0' }}>{startDate} {startTime}</p>
                    </div>
                  </div>
                )}
                {endDate && endTime && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ background: '#3a1a1a', borderRadius: '50%', width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.125rem' }}>
                      <Clock size={12} style={{ color: '#f44336' }} />
                    </div>
                    <div>
                      <p style={{ color: '#666666', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fin</p>
                      <p style={{ color: '#cccccc', fontSize: '0.8rem', margin: '0.125rem 0 0' }}>{endDate} {endTime}</p>
                    </div>
                  </div>
                )}
              </div>

              {estimatedPrice && (
                <div style={{ marginTop: '1rem', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <DollarSign size={16} style={{ color: '#d4af37' }} />
                    <span style={{ color: '#888888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prix estimé</span>
                  </div>
                  <p style={{ color: '#d4af37', fontWeight: 900, fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>{estimatedPrice}€</p>
                  <p style={{ color: '#666666', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>TVA 6% incluse • Devis non contractuel</p>
                </div>
              )}

              <div style={{ marginTop: '1rem', background: '#0d1a0d', borderRadius: '0.5rem', padding: '0.75rem' }}>
                <p style={{ color: '#4caf50', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>✓ Réservation confirmée dans les 2h</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
