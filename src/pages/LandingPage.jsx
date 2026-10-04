import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components';

const LandingPage = () => {
  const styles = {
    container: {
      width: '100%',
      backgroundColor: 'var(--color-background)',
      minHeight: '100vh',
    },
    heroSection: {
      padding: 'clamp(3rem, 10vw, 5rem) clamp(1rem, 3vw, 2rem)',
      maxWidth: '1200px',
      margin: '0 auto',
      textAlign: 'center',
    },
    heroContent: {
      maxWidth: '700px',
      margin: '0 auto',
    },
    heroTitle: {
      fontFamily: 'Fraunces, serif',
      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
      fontWeight: '700',
      color: 'var(--color-navy)',
      marginBottom: '1rem',
      lineHeight: '1.2',
      letterSpacing: '-0.5px',
    },
    heroHighlight: {
      color: 'var(--color-primary)',
    },
    heroSubtitle: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 'clamp(1rem, 2vw, 1.25rem)',
      color: 'var(--color-text-secondary)',
      marginBottom: '2rem',
      lineHeight: '1.6',
      maxWidth: '600px',
      margin: '0 auto 2rem',
    },
    heroActions: {
      display: 'flex',
      gap: 'clamp(0.75rem, 2vw, 1rem)',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    featureSection: {
      padding: 'clamp(3rem, 10vw, 5rem) clamp(1rem, 3vw, 2rem)',
      backgroundColor: 'var(--color-surface)',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
    },
    sectionTitle: {
      fontFamily: 'Fraunces, serif',
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      fontWeight: '700',
      color: 'var(--color-navy)',
      textAlign: 'center',
      marginBottom: '3rem',
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 'clamp(1.5rem, 3vw, 2rem)',
    },
    featureCard: {
      padding: 'clamp(1.5rem, 3vw, 2rem)',
      textAlign: 'center',
      backgroundColor: '#FFFFFF',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      transition: 'all 0.3s ease',
    },
    featureCardHover: {
      boxShadow: '0 4px 12px rgba(230, 95, 0, 0.08)',
      transform: 'translateY(-2px)',
    },
    featureIcon: {
      fontSize: 'clamp(2rem, 5vw, 3rem)',
      marginBottom: '1rem',
    },
    featureTitle: {
      fontFamily: 'Fraunces, serif',
      fontSize: 'clamp(1rem, 2vw, 1.25rem)',
      fontWeight: '700',
      color: 'var(--color-navy)',
      marginBottom: '0.5rem',
    },
    featureDescription: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '0.95rem',
      color: 'var(--color-text-secondary)',
      lineHeight: '1.6',
    },
    subjectsSection: {
      padding: 'clamp(3rem, 10vw, 5rem) clamp(1rem, 3vw, 2rem)',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
    },
    subjectsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'clamp(1rem, 3vw, 1.5rem)',
    },
    subjectCard: {
      padding: 'clamp(1.5rem, 3vw, 2rem)',
      textAlign: 'center',
      backgroundColor: 'var(--color-soft-orange)',
      border: '1px solid var(--color-light-orange)',
      borderRadius: '12px',
      transition: 'all 0.3s ease',
    },
    subjectCardHover: {
      backgroundColor: 'var(--color-light-orange)',
      borderColor: 'var(--color-primary)',
    },
    subjectIcon: {
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      marginBottom: '1rem',
    },
    subjectName: {
      fontFamily: 'Fraunces, serif',
      fontSize: 'clamp(1rem, 2vw, 1.25rem)',
      fontWeight: '700',
      color: 'var(--color-navy)',
      marginBottom: '0.5rem',
    },
    subjectDesc: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '0.9rem',
      color: 'var(--color-text-secondary)',
    },
    ctaSection: {
      padding: 'clamp(3rem, 10vw, 5rem) clamp(1rem, 3vw, 2rem)',
      backgroundColor: 'var(--color-soft-orange)',
      textAlign: 'center',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      borderTop: '1px solid var(--color-light-orange)',
    },
    ctaTitle: {
      fontFamily: 'Fraunces, serif',
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      fontWeight: '700',
      color: 'var(--color-navy)',
      marginBottom: '1rem',
    },
    ctaSubtitle: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
      color: 'var(--color-text-secondary)',
      marginBottom: '2rem',
      maxWidth: '600px',
      margin: '0 auto 2rem',
    },
    ctaActions: {
      display: 'flex',
      gap: 'clamp(0.75rem, 2vw, 1rem)',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    footer: {
      padding: '2rem clamp(1rem, 3vw, 2rem)',
      backgroundColor: 'var(--color-navy)',
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: '3rem',
      borderTop: '1px solid var(--color-surface-secondary)',
    },
    footerText: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '0.9rem',
      lineHeight: '1.6',
    },
  };

  const features = [
    {
      title: 'AI Question Generation',
      description: 'Questions generated from study materials using advanced RAG pipeline and Groq LLM technology.',
      icon: '🤖',
    },
    {
      title: '4 KCET Subjects',
      description: 'Biology, Physics, Chemistry, and Mathematics — all covered with dedicated question banks.',
      icon: '📚',
    },
    {
      title: 'Performance Analytics',
      description: 'Track your scores, identify weak areas, and get AI-powered study recommendations.',
      icon: '📊',
    },
    {
      title: 'Live Leaderboard',
      description: 'Compete with peers and see your rank based on composite performance scores.',
      icon: '🏆',
    },
  ];

  const subjects = [
    { name: 'Biology', desc: 'Botany & Zoology', icon: '🧬' },
    { name: 'Physics', desc: 'Mechanics, Optics & more', icon: '⚛️' },
    { name: 'Chemistry', desc: 'Organic, Inorganic & Physical', icon: '🧪' },
    { name: 'Mathematics', desc: 'Algebra, Calculus & Geometry', icon: '📐' },
  ];

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Master KCET with <span style={styles.heroHighlight}>VyasaPrep</span>
          </h1>
          <p style={styles.heroSubtitle}>
            AI-powered exam preparation platform designed for success. Practice with curated questions, track your progress, and compete on the leaderboard.
          </p>
          <div style={styles.heroActions}>
            <Button as={Link} to="/register" variant="primary" size="lg" style={{ textDecoration: 'none' }}>
              Get Started
            </Button>
            <Button as={Link} to="/login" variant="outline" size="lg" style={{ textDecoration: 'none' }}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.featureSection}>
        <h2 style={styles.sectionTitle}>Why Choose VyasaPrep?</h2>
        <div style={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = styles.featureCardHover.boxShadow;
                e.currentTarget.style.transform = styles.featureCardHover.transform;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={styles.featureIcon}>{feature.icon}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects Section */}
      <section style={styles.subjectsSection}>
        <h2 style={styles.sectionTitle}>KCET Subjects</h2>
        <div style={styles.subjectsGrid}>
          {subjects.map((subject, idx) => (
            <div
              key={idx}
              style={styles.subjectCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = styles.subjectCardHover.backgroundColor;
                e.currentTarget.style.borderColor = styles.subjectCardHover.borderColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-soft-orange)';
                e.currentTarget.style.borderColor = 'var(--color-light-orange)';
              }}
            >
              <div style={styles.subjectIcon}>{subject.icon}</div>
              <h3 style={styles.subjectName}>{subject.name}</h3>
              <p style={styles.subjectDesc}>{subject.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to Start Preparing?</h2>
        <p style={styles.ctaSubtitle}>
          Join thousands of students on VyasaPrep and begin your KCET journey today.
        </p>
        <div style={styles.ctaActions}>
          <Button as={Link} to="/register" variant="primary" size="lg" style={{ textDecoration: 'none' }}>
            Create Free Account
          </Button>
          <Button as={Link} to="/login" variant="secondary" size="lg" style={{ textDecoration: 'none' }}>
            Already Have Account? Sign In
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} VyasaPrep. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
