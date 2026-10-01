import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, PageHeader } from '../../components';

const Landing = () => {
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
            <Button as={Link} to="/register" variant="primary" size="large">
              Get Started →
            </Button>
            <Button as={Link} to="/login" variant="outline" size="large">
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection}>
        <h2 style={styles.sectionTitle}>Why Choose VyasaPrep?</h2>
        <div style={styles.featuresGrid}>
          {[
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
          ].map((feature, idx) => (
            <Card key={idx} variant="elevated" style={styles.featureCard}>
              <div style={styles.featureIcon}>{feature.icon}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Subjects Section */}
      <section style={styles.subjectsSection}>
        <h2 style={styles.sectionTitle}>KCET Subjects</h2>
        <div style={styles.subjectsGrid}>
          {[
            { name: 'Biology', desc: 'Botany & Zoology', icon: '🧬' },
            { name: 'Physics', desc: 'Mechanics, Optics & more', icon: '⚛️' },
            { name: 'Chemistry', desc: 'Organic, Inorganic & Physical', icon: '🧪' },
            { name: 'Mathematics', desc: 'Algebra, Calculus & Geometry', icon: '📐' },
          ].map((subject, idx) => (
            <Card key={idx} variant="outlined" style={styles.subjectCard}>
              <div style={styles.subjectIcon}>{subject.icon}</div>
              <h3 style={styles.subjectName}>{subject.name}</h3>
              <p style={styles.subjectDesc}>{subject.desc}</p>
            </Card>
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
          <Button as={Link} to="/register" variant="primary" size="large">
            Create Free Account
          </Button>
          <Button as={Link} to="/login" variant="secondary" size="large">
            Already Have Account? Sign In
          </Button>
        </div>
      </section>

      {/* Auth bootstrap redirect */}
      <script src="../js/auth.js"></script>
      <script>
        {`
          (function () {
            if (typeof Auth !== 'undefined' && Auth.redirectIfAuthenticated) {
              Auth.redirectIfAuthenticated();
            }
          })();
        `}
      </script>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    backgroundColor: 'var(--color-background)',
  },
  heroSection: {
    padding: 'clamp(3rem, 10vw, 5rem) var(--spacing-lg)',
    textAlign: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  heroContent: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: 'var(--font-size-h1)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-lg)',
    lineHeight: 1.2,
  },
  heroHighlight: {
    color: 'var(--color-primary)',
  },
  heroSubtitle: {
    fontSize: 'var(--font-size-h4)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--spacing-2xl)',
    lineHeight: 1.6,
  },
  heroActions: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  featuresSection: {
    padding: 'clamp(3rem, 10vw, 5rem) var(--spacing-lg)',
    backgroundColor: 'var(--color-surface)',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-h2)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    textAlign: 'center',
    marginBottom: 'var(--spacing-3xl)',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'var(--spacing-xl)',
  },
  featureCard: {
    padding: 'var(--spacing-xl)',
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: 'var(--spacing-md)',
  },
  featureTitle: {
    fontSize: 'var(--font-size-h4)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-sm)',
  },
  featureDescription: {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  subjectsSection: {
    padding: 'clamp(3rem, 10vw, 5rem) var(--spacing-lg)',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--spacing-lg)',
  },
  subjectCard: {
    padding: 'var(--spacing-xl)',
    textAlign: 'center',
    backgroundColor: 'var(--color-soft-orange)',
    borderColor: 'var(--color-light-orange)',
  },
  subjectIcon: {
    fontSize: '2rem',
    marginBottom: 'var(--spacing-md)',
  },
  subjectName: {
    fontSize: 'var(--font-size-h4)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-sm)',
  },
  subjectDesc: {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-text-secondary)',
  },
  ctaSection: {
    padding: 'clamp(3rem, 10vw, 5rem) var(--spacing-lg)',
    backgroundColor: 'var(--color-surface)',
    textAlign: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  ctaTitle: {
    fontSize: 'var(--font-size-h2)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-md)',
  },
  ctaSubtitle: {
    fontSize: 'var(--font-size-h4)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--spacing-2xl)',
    maxWidth: '600px',
    margin: '0 auto var(--spacing-2xl)',
  },
  ctaActions: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
};

export default Landing;
