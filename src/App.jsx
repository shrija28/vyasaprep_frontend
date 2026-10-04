import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import './assets/css/style.css'; 
import './assets/css/institution.css';
import './assets/css/subscription.css';
import './assets/css/subscription-modal-premium.css'; 

import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import InstitutionLayout from './layouts/InstitutionLayout';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicInfoPage from './pages/PublicInfoPage';
import StudentProfile from './pages/student/StudentProfile';

// Auto-generated components
import AdminAnalytics from './pages/auto/AdminAnalytics';
import AdminDashboard from './pages/auto/AdminDashboard';
import AdminExams from './pages/auto/AdminExams';
import AdminInstitutions from './pages/auto/AdminInstitutions';
import AdminQuestions from './pages/auto/AdminQuestions';
import AdminStudentManage from './pages/auto/AdminStudentManage';
import AdminStudents from './pages/auto/AdminStudents';
import AdminSyllabus from './pages/auto/AdminSyllabus';
import AdminTextbookUpload from './pages/auto/AdminTextbookUpload';
import AdminUpload from './pages/auto/AdminUpload';
import Config from './pages/auto/Config';
import ContactUs from './pages/auto/ContactUs';
import Dashboard from './pages/auto/Dashboard';
import Exam from './pages/auto/Exam';
import Index from './pages/auto/Index';
import InstitutionAnalytics from './pages/auto/InstitutionAnalytics';
import InstitutionDashboard from './pages/auto/InstitutionDashboard';
import InstitutionExams from './pages/auto/InstitutionExams';
import InstitutionQuestions from './pages/auto/InstitutionQuestions';
import InstitutionRegister from './pages/auto/InstitutionRegister';
import InstitutionStudents from './pages/auto/InstitutionStudents';
import InstitutionSyllabus from './pages/auto/InstitutionSyllabus';
import InstitutionUpload from './pages/auto/InstitutionUpload';
import InvitationAccept from './pages/auto/InvitationAccept';
import Landing from './pages/auto/Landing';
import Login from './pages/auto/Login';
import NotFound from './pages/auto/NotFound';
import Register from './pages/auto/Register';
import StudentInstitutionExams from './pages/auto/StudentInstitutionExams';
import StudentInstitutionLeaderboard from './pages/auto/StudentInstitutionLeaderboard';
import Syllabus from './pages/auto/Syllabus';

// Public Layout Wrapper
const PublicLayout = ({ children }) => (
  <>
    <Navbar variant="public" />
    {children}
  </>
);

const InstitutionRouteGuard = () => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div className="route-loading" role="status">Checking institution access...</div>;

  const role = String(user?.role || user?.user_type || user?.account_type || '').toLowerCase();
  if (!user || !['institution', 'institution_admin'].includes(role)) {
    return <Navigate to="/login" replace state={{ from: '/institution/dashboard' }} />;
  }

  return <InstitutionLayout />;
};

const AdminRouteGuard = () => {
  const { user, loading } = React.useContext(AuthContext);
  const location = useLocation();
  if (loading) return <div className="route-loading" role="status">Checking admin access...</div>;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = String(user.role || user.user_type || user.account_type || '').toLowerCase();
  if (role === 'admin') return <AdminLayout />;
  if (['institution', 'institution_admin'].includes(role)) {
    return <Navigate to="/institution/dashboard" replace />;
  }

  const accountTypes = [user.student_subtype, user.account_type, user.user_type]
    .map((value) => String(value || '').toLowerCase());
  const isInstitutionStudent = accountTypes.some((type) =>
    ['institutional', 'institution_student', 'institution', 'institution_linked'].includes(type)
  ) || Boolean(
    user.institution_id || user.institution?.id || user.institution_name || user.institution?.name ||
    user.student?.institution_id || user.student?.institution_name
  );

  return <Navigate to={isInstitutionStudent ? '/student/institution/dashboard' : '/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
          <Route path="/index" element={<PublicLayout><Index /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
          <Route path="/student/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
          <Route path="/institution/register" element={<PublicLayout><InstitutionRegister /></PublicLayout>} />
          <Route path="/contact-us" element={<PublicLayout><ContactUs /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><PublicInfoPage page="about" /></PublicLayout>} />
          <Route path="/privacy" element={<PublicLayout><PublicInfoPage page="privacy" /></PublicLayout>} />
          <Route path="/terms" element={<PublicLayout><PublicInfoPage page="terms" /></PublicLayout>} />
          <Route path="/config" element={<Config />} />
          <Route path="/invitation-accept" element={<PublicLayout><InvitationAccept /></PublicLayout>} />

          {/* Student Routes */}
          <Route element={<StudentLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<StudentProfile />} />
            <Route path="/exam" element={<Exam />} />
            <Route path="/subscription" element={<Navigate to="/dashboard" replace />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/student-pricing" element={<Navigate to="/dashboard" replace />} />
            
            {/* Institution Specific Student Routes */}
            <Route path="/student-institution-dashboard" element={<Dashboard />} />
            <Route path="/student-institution-exams" element={<StudentInstitutionExams />} />
            <Route path="/student-institution-leaderboard" element={<StudentInstitutionLeaderboard />} />
            <Route path="/student-institution-performance" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/student/institution" element={<Navigate to="/student/institution/dashboard" replace />} />
            <Route path="/student/institution/dashboard" element={<Dashboard />} />
            <Route path="/student/institution/exams" element={<StudentInstitutionExams />} />
            <Route path="/student/institution/leaderboard" element={<StudentInstitutionLeaderboard />} />
            <Route path="/student/institution/performance" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRouteGuard />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="exams" element={<AdminExams />} />
            <Route path="institutions" element={<AdminInstitutions />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="student-manage" element={<AdminStudentManage />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="subscriptions" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="syllabus" element={<AdminSyllabus />} />
            <Route path="textbook-upload" element={<AdminTextbookUpload />} />
            <Route path="upload" element={<AdminUpload />} />
          </Route>

          {/* Institution Routes */}
          <Route path="/institution" element={<InstitutionRouteGuard />}>
            <Route index element={<Navigate to="/institution/dashboard" replace />} />
            <Route path="analytics" element={<InstitutionAnalytics />} />
            <Route path="dashboard" element={<InstitutionDashboard />} />
            <Route path="exams" element={<InstitutionExams />} />
            <Route path="pricing" element={<Navigate to="/institution/dashboard" replace />} />
            <Route path="questions" element={<InstitutionQuestions />} />
            <Route path="students" element={<InstitutionStudents />} />
            <Route path="subscription" element={<Navigate to="/institution/dashboard" replace />} />
            <Route path="syllabus" element={<InstitutionSyllabus />} />
            <Route path="upload" element={<InstitutionUpload />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
