import React from 'react';

const StudentInstitutionLeaderboard = () => {

  return (
    <>
      <div className="bg-mesh"></div>

      <main className="dash-main" style={{ paddingBottom: '60px' }}>
        <div className="dash-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 className="dash-title">Institution <span className="hero-gradient">Leaderboard</span></h1>
            <p className="dash-sub">Institution rankings will appear here when leaderboard data is available.</p>
          </div>
        </div>

        <div className="section-card results-card">
          <div className="results-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>🏆 Institution Rankings</h3>
          </div>

          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', width: '70px' }}>Rank</th>
                  <th style={{ padding: '12px 16px' }}>Student Name</th>
                  <th style={{ padding: '12px 16px' }}>Student ID</th>
                  <th style={{ padding: '12px 16px' }}>Avg Score</th>
                  <th style={{ padding: '12px 16px' }}>Exams Taken</th>
                  <th style={{ padding: '12px 16px' }}>Badge</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="6" role="status" style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    Leaderboard data is currently unavailable.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
};

export default StudentInstitutionLeaderboard;
