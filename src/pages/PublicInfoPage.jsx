import React from 'react';
import { Link } from 'react-router-dom';
import PublicFooter from '../components/PublicFooter';

const pageContent = {
  about: {
    eyebrow: 'ABOUT VYASAPREP',
    title: 'Practice with purpose.',
    intro: 'VyasaPrep is a KCET preparation platform for independent students and institution-supported learners.',
    sections: [
      { title: 'A focused study experience', body: 'Students can work through published practice exams, review submitted answers, and see recorded results in one learning workspace.' },
      { title: 'Built around real progress', body: 'Subject results and exam history are drawn from completed attempts, so students can review the work they have actually submitted.' },
    ],
  },
  privacy: {
    eyebrow: 'PRIVACY',
    title: 'Privacy notice',
    intro: 'VyasaPrep uses account and exam information to provide sign-in, exam access, submissions, and student results.',
    sections: [
      { title: 'Information used', body: 'Depending on your account, this can include your name, email address, student or institution relationship, exam responses, scores, and submission timing.' },
      { title: 'How it is used', body: 'This information supports account access, exam eligibility, evaluation, and the student dashboard. The web application may also retain session profile and submission details in browser storage.' },
      { title: 'Questions', body: 'For questions about information associated with your account, contact the VyasaPrep team.' },
    ],
  },
  terms: {
    eyebrow: 'TERMS',
    title: 'Terms of use',
    intro: 'Use VyasaPrep for KCET learning and assessment in accordance with the rules shown for each account and exam.',
    sections: [
      { title: 'Your account', body: 'Provide accurate account information and keep your sign-in credentials private. You are responsible for activity performed through your account.' },
      { title: 'Exams and results', body: 'Exam availability and attempt limits are set for each published exam. Submitted answers are evaluated and recorded for your learning dashboard.' },
      { title: 'Plans and payments', body: 'Plan details and charges, when offered, are presented in the subscription flow before payment.' },
    ],
  },
};

const PublicInfoPage = ({ page }) => {
  const content = pageContent[page] || pageContent.about;

  return (
    <>
      <main className="public-info-page">
        <div className="public-info-inner">
          <p className="public-info-eyebrow">{content.eyebrow}</p>
          <h1 className="public-info-title">{content.title}</h1>
          <p className="public-info-intro">{content.intro}</p>
          {content.sections.map((section) => (
            <section className="public-info-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <Link className="public-info-contact" to="/contact-us">Contact VyasaPrep</Link>
        </div>
      </main>
      <PublicFooter />
    </>
  );
};

export default PublicInfoPage;