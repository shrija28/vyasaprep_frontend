import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Input, Card, Select } from '../../components';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [openFaqItems, setOpenFaqItems] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Form submission would be handled by backend API
    setResponseMessage({ type: 'success', text: 'Message sent successfully! We will be in touch soon.' });
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setResponseMessage(''), 5000);
  };

  const toggleFaq = (index) => {
    setOpenFaqItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqs = [
    {
      question: 'How do I reset my password?',
      answer: 'To reset your password, click on the "Forgot Password" link on the login page. Enter your email address and follow the instructions sent to your inbox. You\'ll receive a password reset link valid for 24 hours.'
    },
    {
      question: 'How do I report a technical issue?',
      answer: 'Please use the contact form above and select "Technical Issue" as the subject. Include as much detail as possible, such as your browser, device type, and steps to reproduce the issue. Our team will investigate and get back to you within 24 hours.'
    }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <section style={styles.headerSection}>
        <h1 style={styles.header}>Get in Touch</h1>
        <p style={styles.headerSubtitle}>
          Have a question or need assistance? We're here to help. Reach out to us through any of the channels below.
        </p>
      </section>

      {/* Contact Info Grid */}
      <section style={styles.gridSection}>
        <Card variant="outlined" style={styles.infoCard}>
          <div style={styles.infoCardIcon}>📧</div>
          <h2 style={styles.infoCardTitle}>Email Support</h2>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Support Email</span>
            <a href="mailto:support@vyasaprep.com" style={styles.infoLink}>
              support@vyasaprep.com
            </a>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>General Inquiries</span>
            <a href="mailto:info@vyasaprep.com" style={styles.infoLink}>
              info@vyasaprep.com
            </a>
          </div>
        </Card>

        <Card variant="outlined" style={styles.infoCard}>
          <div style={styles.infoCardIcon}>📞</div>
          <h2 style={styles.infoCardTitle}>Support Hours</h2>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Response Time</span>
            <p style={styles.infoText}>Within 24 hours</p>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Available Days</span>
            <p style={styles.infoText}>Monday - Friday, 9 AM - 6 PM IST</p>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Expected Resolution</span>
            <p style={styles.infoText}>2-3 business days</p>
          </div>
        </Card>
      </section>

      {/* Contact Form */}
      <section style={styles.formSection}>
        <Card variant="elevated" style={styles.formCard}>
          <h2 style={styles.formTitle}>Send us a Message</h2>

          {responseMessage && (
            <Alert variant={responseMessage.type} style={styles.formAlert}>
              {responseMessage.text}
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Your name"
              required
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              required
            />

            <Select
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a subject...</option>
              <option value="technical">Technical Issue</option>
              <option value="exam">Exam Problem</option>
              <option value="account">Account Help</option>
              <option value="other">Other</option>
            </Select>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Describe your issue or question..."
                required
                style={styles.textarea}
              />
            </div>

            <div style={styles.formActions}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({ name: '', email: '', subject: '', message: '' })}
              >
                Clear
              </Button>
              <Button type="submit" variant="primary">
                Send Message
              </Button>
            </div>
          </form>
        </Card>
      </section>

      {/* FAQ Section */}
      <section style={styles.faqSection}>
        <h2 style={styles.faqTitle}>Frequently Asked Questions</h2>
        <div style={styles.faqList}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              style={{
                ...styles.faqItem,
                ...(openFaqItems[idx] ? styles.faqItemOpen : {})
              }}
            >
              <button
                type="button"
                style={styles.faqQuestion}
                onClick={() => toggleFaq(idx)}
                aria-expanded={openFaqItems[idx]}
              >
                <span>{faq.question}</span>
                <span style={{
                  ...styles.faqToggle,
                  ...(openFaqItems[idx] ? styles.faqToggleOpen : {})
                }}>
                  ▼
                </span>
              </button>
              {openFaqItems[idx] && (
                <div style={styles.faqAnswer}>
                  <p style={styles.faqAnswerText}>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    backgroundColor: 'var(--color-background)',
    padding: 'var(--spacing-xl)',
  },
  headerSection: {
    maxWidth: '900px',
    margin: '0 auto var(--spacing-3xl)',
    textAlign: 'center',
  },
  header: {
    fontSize: 'var(--font-size-h1)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-md)',
  },
  headerSubtitle: {
    fontSize: 'var(--font-size-body)',
    color: 'var(--color-text-secondary)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  gridSection: {
    maxWidth: '900px',
    margin: '0 auto var(--spacing-3xl)',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--spacing-xl)',
  },
  infoCard: {
    padding: 'var(--spacing-xl)',
    textAlign: 'center',
  },
  infoCardIcon: {
    fontSize: '2rem',
    marginBottom: 'var(--spacing-md)',
  },
  infoCardTitle: {
    fontSize: 'var(--font-size-h4)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-lg)',
  },
  infoItem: {
    marginBottom: 'var(--spacing-lg)',
    textAlign: 'left',
  },
  infoLabel: {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 'var(--spacing-sm)',
  },
  infoLink: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: 'var(--font-weight-semibold)',
  },
  infoText: {
    color: 'var(--color-text-primary)',
    fontWeight: 'var(--font-weight-semibold)',
    margin: 0,
  },
  formSection: {
    maxWidth: '900px',
    margin: '0 auto var(--spacing-3xl)',
  },
  formCard: {
    padding: 'var(--spacing-2xl)',
  },
  formTitle: {
    fontSize: 'var(--font-size-h3)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-xl)',
  },
  formAlert: {
    marginBottom: 'var(--spacing-lg)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  formLabel: {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-primary)',
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: 'var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-body)',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-surface)',
  },
  formActions: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  faqSection: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  faqTitle: {
    fontSize: 'var(--font-size-h3)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-xl)',
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },
  faqItem: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  faqItemOpen: {
    backgroundColor: 'var(--color-soft-orange)',
    borderColor: 'var(--color-light-orange)',
  },
  faqQuestion: {
    width: '100%',
    padding: 'var(--spacing-lg)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-body)',
    transition: 'all 0.2s ease',
  },
  faqToggle: {
    fontSize: 'var(--font-size-h4)',
    color: 'var(--color-text-secondary)',
    transition: 'transform 0.2s ease',
  },
  faqToggleOpen: {
    transform: 'rotate(180deg)',
  },
  faqAnswer: {
    padding: '0 var(--spacing-lg) var(--spacing-lg)',
    borderTop: '1px solid rgba(0,0,0,0.1)',
  },
  faqAnswerText: {
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-body)',
    lineHeight: 1.6,
    margin: 0,
  },
};

export default ContactUs;
