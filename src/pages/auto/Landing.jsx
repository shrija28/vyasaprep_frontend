import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicFooter from '../../components/PublicFooter';
import LearningIllustration from '../../components/LearningIllustration';
import {
  Button,
  AIIcon,
  BooksIcon,
  ChartIcon,
  TrophyIcon,
  BiologyIcon,
  PhysicsIcon,
  ChemistryIcon,
  MathematicsIcon,
} from '../../components';

const subjectCards = [
  { name: 'Biology', detail: 'Botany & Zoology', accent: '#9acb86', Icon: BiologyIcon },
  { name: 'Physics', detail: 'Mechanics, Optics & more', accent: '#9fd0f0', Icon: PhysicsIcon },
  { name: 'Chemistry', detail: 'Organic, Inorganic & Physical', accent: '#9dc7e6', Icon: ChemistryIcon },
  { name: 'Mathematics', detail: 'Algebra, Calculus & Geometry', accent: '#f2d78c', Icon: MathematicsIcon },
];

const featureCards = [
  { title: 'AI Question Generation', description: 'Get high-quality questions from curated study materials using advanced AI.', accent: '#f4d0aa', Icon: AIIcon },
  { title: 'All 4 KCET Subjects', description: 'Biology, Physics, Chemistry and Mathematics — complete coverage with dedicated question banks.', accent: '#f2d4b0', Icon: BooksIcon },
  { title: 'Performance Analytics', description: 'Track your scores, identify weak areas, and get personalized recommendations to improve.', accent: '#dfe9f8', Icon: ChartIcon },
  { title: 'Leaderboard', description: 'Compete with peers and see your rank based on composite performance scores.', accent: '#f4d4ae', Icon: TrophyIcon },
];

const Landing = () => {
  const [pricingPlans, setPricingPlans] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/payments/plans/student', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Plans unavailable'))))
      .then((result) => {
        if (active) setPricingPlans(Array.isArray(result.plans) ? result.plans : []);
      })
      .catch(() => {
        if (active) setPricingPlans([]);
      })
      .finally(() => {
        if (active) setPricingLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="landing-page" style={styles.page}>
      <main style={styles.main}>
        <section className="landing-hero" style={styles.heroSection}>
          <div style={styles.heroText}>
            <div style={styles.eyebrow}>PRACTICE • ANALYZE • IMPROVE</div>
            <h1 className="landing-hero-title" style={styles.heroTitle}>
              Smarter Practice<br />
              for Higher Scores
            </h1>
            <p style={styles.heroCopy}>
              Vyasa Prep is an AI-powered KCET exam preparation platform.
              Practice with curated question sets across all four subjects and
              track your progress on the leaderboard.
            </p>

            <div style={styles.heroActions}>
              <Button as={Link} to="/register" variant="primary" size="lg">
                Get Started Free →
              </Button>
              <Button as={Link} to="/login" variant="outline" size="lg">
                Login
              </Button>
            </div>

            <div style={styles.benefitRow}>
              {['Curated Question Sets', 'Track Your Progress', 'Compete with Peers'].map((label) => (
                <div key={label} style={styles.benefitItem}>
                  <span style={styles.benefitIcon}></span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-hero-visual" style={styles.heroVisual}>
            <div className="landing-hero-note">Discipline today,<br />results tomorrow.</div>
            <div className="landing-illustration-stage">
              <LearningIllustration />
            </div>
          </div>
        </section>

        <section id="features" style={{ ...styles.sectionBlock, scrollMarginTop: '100px' }}>
          <div style={styles.sectionHeader}>EVERYTHING YOU NEED</div>
          <h2 style={styles.titleCenter}>Designed for KCET Aspirants</h2>
          <p style={styles.subtitleCenter}>All the tools you need to practice, learn and grow — in one place.</p>

          <div className="landing-feature-grid" style={styles.featureGrid}>
            {featureCards.map((feature) => (
              <article key={feature.title} style={styles.featureCard}>
                <div style={{ ...styles.featureIcon, background: feature.accent }}>
                  <feature.Icon size={30} color="#E65F00" />
                </div>
                <h3 style={styles.cardTitle}>{feature.title}</h3>
                <p style={styles.cardText}>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ ...styles.sectionBlock, ...styles.subjectSection, scrollMarginTop: '100px' }} id="subjects">
          <div style={styles.subjectHeaderRow}>
            <div>
              <div style={styles.sectionHeader}>PRACTICE BY SUBJECT</div>
              <h2 style={styles.titleLeft}>Choose a Subject<br />to Get Started</h2>
            </div>
          </div>

          <div className="landing-subject-grid" style={styles.subjectGrid}>
            {subjectCards.map((subject) => (
              <button key={subject.name} type="button" style={styles.subjectCard}>
                <div style={{ ...styles.subjectIcon, background: subject.accent }}>
                  <subject.Icon size={32} color="#E65F00" />
                </div>
                <div style={styles.subjectLabel}>{subject.name}</div>
                <div style={styles.subjectDetail}>{subject.detail}</div>
              </button>
            ))}
          </div>

          <div style={styles.subjectActionWrap}>
            <Link to="/register" style={styles.inlineCta}>Explore All Subjects →</Link>
          </div>
        </section>

        <section id="how-it-works" style={{ ...styles.sectionBlock, scrollMarginTop: '100px' }}>
          <div style={styles.sectionHeader}>A SIMPLE STUDY LOOP</div>
          <h2 style={styles.titleCenter}>How it Works</h2>
          <div className="landing-step-grid" style={styles.stepGrid}>
            <article style={styles.stepItem}>
              <span style={styles.stepNumber}>01</span>
              <h3 style={styles.cardTitle}>Create your account</h3>
              <p style={styles.cardText}>Register as a student, then sign in to your student dashboard.</p>
            </article>
            <article style={styles.stepItem}>
              <span style={styles.stepNumber}>02</span>
              <h3 style={styles.cardTitle}>Choose an available exam</h3>
              <p style={styles.cardText}>Open a published practice exam and complete its questions.</p>
            </article>
            <article style={styles.stepItem}>
              <span style={styles.stepNumber}>03</span>
              <h3 style={styles.cardTitle}>Review your results</h3>
              <p style={styles.cardText}>Return to your dashboard to review recorded scores and exam history.</p>
            </article>
          </div>
        </section>

        <section id="pricing" style={{ ...styles.sectionBlock, scrollMarginTop: '100px' }}>
          <div style={styles.sectionHeader}>PLANS</div>
          <h2 style={styles.titleCenter}>Pricing</h2>
          {pricingLoading ? (
            <p style={styles.pricingMessage} role="status">Loading current plans...</p>
          ) : pricingPlans.length > 0 ? (
            <div className="landing-pricing-grid" style={styles.pricingGrid}>
              {pricingPlans.map((plan) => (
                <article key={plan.id || plan.name} style={styles.pricingItem}>
                  <h3 style={styles.cardTitle}>{plan.name}</h3>
                  <p style={styles.pricingValue}>
                    {Number.isFinite(Number(plan.price))
                      ? `₹${new Intl.NumberFormat('en-IN').format(Number(plan.price))}`
                      : 'Price unavailable'}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p style={styles.pricingMessage}>Pricing details are unavailable right now.</p>
          )}
        </section>

        <section className="landing-cta-band" style={styles.ctaBand}>
          <div>
            <h2 style={styles.ctaTitle}>Ready to start preparing?</h2>
            <p style={styles.ctaText}>Join thousands of KCET aspirants who are learning smarter with Vyasa Prep.</p>
            <div style={styles.ctaButtonRow}>
              <Button as={Link} to="/register" variant="primary" size="lg">Create Your Free Account →</Button>
              <Button as={Link} to="/login" variant="secondary" size="lg">Login</Button>
            </div>
          </div>
          <div className="landing-cta-decor" style={styles.ctaDecor}>Better<br />Preparation<br />Brighter<br />Futures</div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};

const styles = {
  page: {
    background: '#F7F5F1',
    color: '#1A365D',
    minHeight: '100vh',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  main: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '1.25rem 1.5rem 4rem',
  },
  heroSection: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '2rem',
    padding: '4rem 0 2rem',
    alignItems: 'center',
  },
  heroText: {
    padding: '1rem 0',
  },
  eyebrow: {
    display: 'inline-block',
    color: '#E65F00',
    fontSize: '0.78rem',
    letterSpacing: '0.18rem',
    fontWeight: 700,
    marginBottom: '1.2rem',
  },
  heroTitle: {
    margin: '0 0 1.5rem',
    fontFamily: 'Fraunces, serif',
    fontSize: 'clamp(3rem, 5vw, 6rem)',
    lineHeight: 0.95,
    letterSpacing: '-0.06em',
    color: '#1A365D',
    fontWeight: 700,
  },
  heroCopy: {
    maxWidth: '650px',
    color: '#475569',
    fontSize: '1.2rem',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  heroActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '2rem',
  },
  benefitRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.25rem',
    color: '#334155',
    fontSize: '0.96rem',
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingRight: '0.5rem',
  },
  benefitIcon: {
    width: '1.2rem',
    height: '1.2rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#FFF0E3',
    color: '#E65F00',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  heroVisual: {
    position: 'relative',
    minHeight: '420px',
    background: '#FCFBF8',
    borderRadius: '2rem',
    border: '1px solid rgba(26,54,93,0.12)',
    overflow: 'visible',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  sectionBlock: {
    background: '#F7F5F1',
    padding: '2.5rem 0',
  },
  stepGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '1.2rem',
  },
  stepItem: {
    padding: '1.4rem 1.2rem',
    background: '#F9F8F4',
    borderTop: '2px solid #E65F00',
  },
  stepNumber: {
    display: 'block',
    color: '#B34A00',
    fontSize: '0.8rem',
    fontWeight: 700,
    marginBottom: '1rem',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  pricingItem: {
    padding: '1.25rem',
    background: '#F9F8F4',
    border: '1px solid rgba(26,54,93,0.1)',
    borderRadius: '0.8rem',
  },
  pricingValue: {
    margin: 0,
    color: '#1A365D',
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  pricingMessage: {
    margin: '1.5rem auto 0',
    color: '#475569',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: '0.78rem',
    letterSpacing: '0.18rem',
    color: '#E65F00',
    fontWeight: 700,
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
  },
  titleCenter: {
    textAlign: 'center',
    margin: '0 auto 0.8rem',
    color: '#1A365D',
    fontFamily: 'Fraunces, serif',
    fontWeight: 700,
    fontSize: 'clamp(2.2rem, 3vw, 3.25rem)',
    lineHeight: 1.1,
    letterSpacing: '-0.05em',
    maxWidth: '900px',
  },
  subtitleCenter: {
    textAlign: 'center',
    color: '#475569',
    fontSize: '1.1rem',
    margin: '0 auto 2rem',
    maxWidth: '700px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '1.2rem',
  },
  featureCard: {
    background: '#F9F8F4',
    border: '1px solid rgba(26,54,93,0.1)',
    borderRadius: '1.2rem',
    padding: '1.5rem 1.2rem',
    minHeight: '200px',
  },
  featureIcon: {
    width: '3rem',
    height: '3rem',
    borderRadius: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  cardTitle: {
    color: '#1A365D',
    fontSize: '1.2rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
    fontFamily: 'Fraunces, serif',
  },
  cardText: {
    color: '#475569',
    lineHeight: 1.6,
    fontSize: '0.96rem',
  },
  subjectSection: {
    paddingTop: '3.5rem',
  },
  subjectHeaderRow: {
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'space-between',
    marginBottom: '2rem',
  },
  titleLeft: {
    margin: 0,
    color: '#1A365D',
    fontFamily: 'Fraunces, serif',
    fontWeight: 700,
    fontSize: 'clamp(2.3rem, 3vw, 3.5rem)',
    lineHeight: 1.05,
    letterSpacing: '-0.05em',
  },
  subjectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  subjectCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.2rem 0.8rem',
    background: '#F9F8F4',
    border: '1px solid rgba(26,54,93,0.12)',
    borderRadius: '1rem',
    cursor: 'pointer',
    textAlign: 'center',
    color: '#1A365D',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  subjectIcon: {
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.25rem',
  },
  subjectLabel: {
    fontSize: '1.2rem',
    fontWeight: 700,
    fontFamily: 'Fraunces, serif',
  },
  subjectDetail: {
    color: '#475569',
    fontSize: '0.76rem',
    lineHeight: 1.5,
  },
  subjectActionWrap: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: '0.5rem',
  },
  inlineCta: {
    color: '#E65F00',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '1.05rem',
  },
  ctaBand: {
    background: '#F9E8D8',
    border: '1px solid rgba(26,54,93,0.08)',
    borderRadius: '1.8rem',
    padding: '2rem 2rem 1.5rem',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.4fr',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  ctaTitle: {
    fontSize: 'clamp(2rem, 3vw, 3rem)',
    lineHeight: 1.1,
    margin: '0 0 0.8rem',
    fontFamily: 'Fraunces, serif',
    color: '#1A365D',
  },
  ctaText: {
    color: '#475569',
    fontSize: '1.05rem',
    margin: 0,
  },
  ctaButtonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginTop: '1.4rem',
  },
  ctaDecor: {
    fontFamily: 'Fraunces, serif',
    fontSize: '1.45rem',
    lineHeight: 1.2,
    color: '#1A365D',
    textAlign: 'right',
    paddingRight: '0.5rem',
  },
};

export default Landing;
