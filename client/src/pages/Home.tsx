import { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X, LogIn, LogOut, LayoutDashboard, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { ADMIN_EMAIL } from '@shared/const';
import { trpc } from '@/lib/trpc';

function FleetCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) return null;
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  return (
    <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '0.5rem', overflow: 'hidden', background: '#000', marginBottom: '1rem' }}>
      <img
        src={images[idx]}
        alt={`${name} ${idx + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s' }}
        onError={(e) => { (e.target as HTMLImageElement).src = images[0]; }}
      />
      {images.length > 1 && (
        <>
          <button onClick={prev} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={next} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={14} />
          </button>
          <div style={{ position: 'absolute', bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.375rem' }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? '1.5rem' : '0.5rem', height: '0.5rem', borderRadius: '0.25rem', background: i === idx ? '#d4af37' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.2s' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header>
        <div className="header-container">
          <a href="/" className="logo">
            <div className="logo-icon">V</div>
            <div className="logo-text">VIP DRIVERS</div>
          </a>

          <nav>
            <button
              className="menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <ul className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
              <li>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('services');
                  }}
                >
                  Services
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('fleet');
                  }}
                >
                  Flotte
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('supplements');
                  }}
                >
                  Suppléments
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('contact');
                  }}
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user ? (
              <>
                {(user.role === 'admin' || user.email === ADMIN_EMAIL) && (
                  <button
                    className="btn-cta"
                    onClick={() => setLocation('/admin')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    <LayoutDashboard size={16} /> Admin
                  </button>
                )}
                <button
                  onClick={() => setLocation('/history')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #444',
                    color: '#d4af37',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <History size={16} /> Historique
                </button>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent',
                    border: '1px solid #444',
                    color: '#888888',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <LogOut size={16} /> Déconnexion
                </button>
              </>
            ) : (
              <a
                href={getLoginUrl()}
                style={{
                  background: 'transparent',
                  border: '1px solid #d4af37',
                  color: '#d4af37',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <LogIn size={16} /> Connexion
              </a>
            )}
            <button className="btn-cta" onClick={() => setLocation('/quote')}>
              Réserver
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Chauffeur Privé à Bruxelles</h1>
          <p className="hero-subtitle">
            Réservez rapidement votre chauffeur à Bruxelles et dans toute la Belgique
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => setLocation('/quote')}>
              Obtenir un Devis
            </button>
            <button className="btn-secondary" onClick={() => setLocation('/disposal')}>
              Mise à Disposition
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="dark">
        <div className="section-container">
          <h2 className="section-title">Nos Services</h2>
          <div className="grid grid-cols-3">
            <div className="card">
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="card-title">Devis de Trajet</h3>
              <p className="card-text">
                Obtenez un devis instantané basé sur la distance et le véhicule choisi.
              </p>
              <button
                className="btn-primary mt-6"
                onClick={() => setLocation('/quote')}
                style={{ width: '100%' }}
              >
                Demander un Devis
              </button>
            </div>

            <div className="card">
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="card-title">Mise à Disposition</h3>
              <p className="card-text">
                Louez un véhicule avec chauffeur à l'heure pour plus de flexibilité.
              </p>
              <button
                className="btn-primary mt-6"
                onClick={() => setLocation('/disposal')}
                style={{ width: '100%' }}
              >
                Réserver à l'Heure
              </button>
            </div>

            <div className="card">
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="card-title">Navettes Aéroport</h3>
              <p className="card-text">
                Service de navette vers l'aéroport avec ponctualité garantie.
              </p>
              <button
                className="btn-primary mt-6"
                onClick={() => setLocation('/quote?destination=A%C3%A9roport+de+Bruxelles-National%2C+Zaventem')}
                style={{ width: '100%' }}
              >
                Réserver Navette
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Supplements Section */}
      <section id="supplements" className="darker">
        <div className="section-container">
          <h2 className="section-title">Nos Suppléments Inclus à Bord</h2>
          <p style={{ textAlign: 'center', marginBottom: '3rem', color: '#999999' }}>
            L'ensemble de nos suppléments sont gratuit lors de nos prestations
          </p>
          <div className="grid grid-cols-5">
            <div style={{ textAlign: 'center' }}>
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.251a.375.375 0 01-.469.469l-2.08-2.08a.375.375 0 11.53-.53l2.019 2.02.469-.469zm6.555-6.555a.375.375 0 01-.469.469l-2.08-2.08a.375.375 0 11.53-.53l2.019 2.02.469-.469z"
                  />
                </svg>
              </div>
              <p style={{ marginTop: '1rem', fontWeight: 500 }}>WiFi à bord</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p style={{ marginTop: '1rem', fontWeight: 500 }}>Chargeur téléphone</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p style={{ marginTop: '1rem', fontWeight: 500 }}>Accueil personnalisé</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p style={{ marginTop: '1rem', fontWeight: 500 }}>Siège enfant</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className="icon-circle">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p style={{ marginTop: '1rem', fontWeight: 500 }}>Service Premium</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section id="fleet" className="dark">
        <div className="section-container">
          <h2 className="section-title">Notre Flotte Mercedes</h2>
          <div className="grid grid-cols-3">
            {vehicles.map((vehicle: any) => (
              <div key={vehicle.id} className="card">
                <FleetCarousel images={vehicle.images} name={vehicle.name} />
                <h3 className="card-title">{vehicle.name}</h3>
                <p className="card-text">{vehicle.description}</p>
                <p style={{ marginTop: '1rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                  À partir de {vehicle.pricePerKm}€/km
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="darker">
        <div className="section-container">
          <h2 className="section-title">Nous Contacter</h2>
          <div className="grid grid-cols-2">
            <div>
              <h3 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>
                Coordonnées
              </h3>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Téléphone :</strong> +32 (0)2 XXX XX XX
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Email :</strong> info@vip-drivers.be
              </p>
              <p>
                <strong>Adresse :</strong> Bruxelles, Belgique
              </p>
            </div>
            <div>
              <h3 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>
                Horaires
              </h3>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Lundi - Vendredi :</strong> 7h - 22h
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Samedi :</strong> 8h - 23h
              </p>
              <p>
                <strong>Dimanche :</strong> 8h - 22h
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="section-container">
          <div className="grid grid-cols-3">
            <div>
              <h4>VIP Drivers</h4>
              <p style={{ color: '#999999', fontSize: '0.9rem' }}>
                Service de chauffeurs privés haut de gamme à Bruxelles
              </p>
            </div>
            <div>
              <h4>Services</h4>
              <ul style={{ listStyle: 'none' }}>
                <li>
                  <a href="#" onClick={() => setLocation('/quote')}>
                    Devis de Trajet
                  </a>
                </li>
                <li>
                  <a href="#" onClick={() => setLocation('/disposal')}>
                    Mise à Disposition
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Légal</h4>
              <ul style={{ listStyle: 'none' }}>
                <li>
                  <a href="#">Conditions d'utilisation</a>
                </li>
                <li>
                  <a href="#">Politique de confidentialité</a>
                </li>
              </ul>
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--color-gray-700)',
              marginTop: '2rem',
              paddingTop: '2rem',
              textAlign: 'center',
              color: '#666666',
              fontSize: '0.9rem',
            }}
          >
            <p>&copy; 2026 VIP Drivers. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
