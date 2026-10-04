import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';

const AdminStudentManage = () => {
  const [searchParams] = useSearchParams();
  const isCreateMode = searchParams.get('action') === 'create';
  return (
    <>
      {/* Auto-injected styles from HTML head */}
      <style dangerouslySetInnerHTML={{ __html: `
    .form-section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .form-section h3 {
      margin: 0 0 16px;
      font-size: 1rem;
      font-weight: 600;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .form-row.full {
      grid-template-columns: 1fr;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
    }
    
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
    }
    
    .form-group input,
    .form-group select {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--rs);
      background: var(--s2);
      color: var(--text);
      font-size: 0.9rem;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-primary);
      background: var(--s3);
    }
    
    .form-group small {
      font-size: 0.75rem;
      color: var(--muted2);
      margin-top: 4px;
    }
    
    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    @media (max-width: 900px) {
      .section-grid {
        grid-template-columns: 1fr;
      }
      
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    
    .info-tile {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px;
    }
    
    .info-tile-label {
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .info-tile-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
    }
    
    .action-buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--muted);
    }
    
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    
    .empty-state-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text);
    }
    
    .empty-state-sub {
      font-size: 0.85rem;
      color: var(--muted2);
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .status-badge.active {
      background: rgba(5, 150, 105, 0.15);
      color: var(--green-l);
    }
    
    .status-badge.trial {
      background: rgba(5, 150, 105, 0.1);
      color: var(--green-l);
    }
    
    .status-badge.no_subscription {
      background: rgba(107, 114, 128, 0.1);
      color: var(--muted2);
    }
    
    .status-badge.overdue {
      background: rgba(217, 119, 6, 0.15);
      color: var(--yellow-l);
    }
    
    .status-badge.expired {
      background: rgba(220, 38, 38, 0.12);
      color: var(--red-l);
    }
    .admin-student-manage-wrap { width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
    .admin-student-manage-wrap h1,.admin-student-manage-wrap h3 { color:#0f172a !important; }
    .admin-student-manage-wrap > div:first-child p { color:#475569 !important; }
    @media (max-width:900px) { .navbar { min-width:0;overflow:hidden;padding:0 12px;gap:8px; } .navbar .nav-brand { flex:0 0 auto; } .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none; } .navbar .nav-links::-webkit-scrollbar { display:none; } .navbar .nav-actions { flex:0 0 auto; } .admin-student-manage-wrap { padding-left:16px !important;padding-right:16px !important; } }
    @media (max-width:560px) { .navbar .brand-name,.navbar .brand-ai { font-size:0.95rem; } .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; } .admin-student-manage-wrap { padding-top:18px !important;padding-bottom:48px !important; } .admin-student-manage-wrap .action-buttons { flex-wrap:wrap; } .admin-student-manage-wrap .action-buttons button { flex:1;min-width:120px; } }
  
` }} />
      
  <div className="bg-mesh"></div>

  
  

  <div className="main-wrap admin-student-manage-wrap" style={{"maxWidth":"100%","padding":"24px 28px 80px"}}>

    
    <AdminPageHeader
      title="Manage Student"
      titleId="pageTitle"
      description="View and manage student details. Subscription/payment features are currently inactive / future feature."
      descriptionId="pageSubtitle"
    />

    
    {!isCreateMode && <div id="loadingState" style={{"textAlign":"center","padding":"60px 20px","color":"var(--muted)"}}>
      <div style={{"fontSize":"3rem","marginBottom":"12px","opacity":"0.5","display":"flex","alignItems":"center","justifyContent":"center"}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '3rem', height: '3rem' }}>
          <path d="M20 21a8 8 0 10-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div style={{"fontSize":"1.1rem","fontWeight":"600","marginBottom":"6px","color":"#0f172a"}}>Select a student to manage</div>
      <div style={{ fontSize: '0.88rem', marginBottom: '16px' }}>No student identifier was supplied. Use the Students page to review records.</div>
      <Link to="/admin/students" className="btn-outline">Back to Students</Link>
    </div>
    }

    <div id="contentArea" style={{"display": isCreateMode ? 'none' : 'none'}}>

      
      <div className="section-grid">
        <div className="form-section">
          <h3>Student Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input type="text" id="fieldName" placeholder="Student name" required/>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" id="fieldEmail" placeholder="student@example.com" required/>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>KCET Student ID</label>
              <input type="text" id="fieldKcetId" placeholder="Optional KCET ID"/>
            </div>
            <div className="form-group">
              <label>User ID</label>
              <input type="text" id="fieldUserId" placeholder="User ID" readOnly style={{"background":"var(--s1)","color":"var(--muted)"}}/>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Password & Security</h3>
          <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
            <div style={{"background":"rgba(37,99,235,0.1)","border":"1px solid rgba(37,99,235,0.2)","borderRadius":"var(--rs)","padding":"14px"}}>
              <div style={{"fontWeight":"600","color":"var(--blue-l,#60a5fa)","marginBottom":"8px"}}>Password Management</div>
              <p style={{"fontSize":"0.85rem","color":"var(--muted)","margin":"0","lineHeight":"1.5"}}>
                Passwords are securely hashed in the database and cannot be viewed. 
                Use the "Reset Password" button below to set a new password for this student if they forgot theirs.
              </p>
            </div>
            
            <div id="resetPasswordSection" style={{"display":"none","border":"1px solid rgba(220,38,38,0.2)","borderRadius":"var(--rs)","padding":"14px","background":"rgba(220,38,38,0.05)"}}>
              <div style={{"fontWeight":"600","color":"var(--red-l)","marginBottom":"12px"}}>Warning  Set New Password</div>
              <div className="form-group" style={{"marginBottom":"12px"}}>
                <label htmlFor="newPassword">New Password *</label>
                <input type="password" id="newPassword" placeholder="Enter new password" style={{"width":"100%","padding":"10px 14px","border":"1px solid var(--border)","borderRadius":"var(--rs)","background":"var(--s2)","color":"var(--text)"}}/>
                <small style={{"color":"var(--muted2)"}}>Minimum 8 characters. Student will use this to login.</small>
              </div>
              <div className="form-group" style={{"marginBottom":"12px"}}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input type="password" id="confirmPassword" placeholder="Confirm new password" style={{"width":"100%","padding":"10px 14px","border":"1px solid var(--border)","borderRadius":"var(--rs)","background":"var(--s2)","color":"var(--text)"}}/>
              </div>
              <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end"}}>
                <button type="button" className="btn-outline small" id="btnCancelReset" >Cancel</button>
                <button type="button" className="btn-primary small" id="btnSavePassword" style={{"color":"var(--red-l)","borderColor":"var(--red-l)"}}>Confirm Reset</button>
              </div>
            </div>

            <button className="btn-outline small" id="btnResetPassword" style={{"width":"100%","textAlign":"center","color":"var(--red-l)","borderColor":"var(--red-l)"}}>Reset Student Password</button>
          </div>
        </div>
      </div>

      


      
      <div className="action-buttons">
        <button className="btn-outline" >Back</button>
        <button className="btn-primary" id="btnSave">Save Changes</button>
      </div>

    </div>

    
    <div id="createForm" style={{"display": isCreateMode ? 'block' : 'none'}}>
      <div className="form-section">
        <h3>Create New Direct Student</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input type="text" id="createFieldName" placeholder="Student name" required/>
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" id="createFieldEmail" placeholder="student@example.com" required/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>KCET Student ID</label>
            <input type="text" id="createFieldKcetId" placeholder="Optional KCET ID"/>
          </div>
          <div className="form-group">
            <label>Platform access</label>
            <input type="text" value="Free access" readOnly aria-label="Platform access" />
            <small>Subscription/payment features are currently inactive / future feature.</small>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn-outline" >Cancel</button>
        <button className="btn-primary" id="btnCreate">Create Student</button>
      </div>
    </div>

  </div>

  
  

    </>
  );
};

export default AdminStudentManage;
