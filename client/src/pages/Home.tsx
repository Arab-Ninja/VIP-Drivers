import { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X, LogIn, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { ADMIN_EMAIL } from '@shared/const';

export default function Home() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

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
                onClick={() => setLocation('/quote')}
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
            <div className="card">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-classe-e_b46d5dc9.jpg"
                alt="Mercedes Classe E"
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}
              />
              <h3 className="card-title">Mercedes Classe E</h3>
              <p className="card-text">
                Confortable et élégante pour vos trajets professionnels.
              </p>
              <p style={{ marginTop: '1rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                À partir de 3€/km
              </p>
            </div>

            <div className="card">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-classe-s_23596992.jpg"
                alt="Mercedes Classe S"
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}
              />
              <h3 className="card-title">Mercedes Classe S</h3>
              <p className="card-text">
                Le summum du luxe et du confort pour vos trajets VIP.
              </p>
              <p style={{ marginTop: '1rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                À partir de 4€/km
              </p>
            </div>

            <div className="card">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/98337968/3Y2Z5bQ2ihvi2iTuitLeub/mercedes-classe-v_1ead2414.jpg"
                alt="Mercedes Classe V"
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}
              />
              <h3 className="card-title">Mercedes Classe V</h3>
              <p className="card-text">
                Spacieuse et pratique pour les groupes et familles.
              </p>
              <p style={{ marginTop: '1rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                À partir de 3,50€/km
              </p>
            </div>
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
