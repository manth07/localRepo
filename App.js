import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Layout, Users, Calendar, Clock, LogOut, CheckCircle, XCircle, Briefcase, Lock, User, Settings, ArrowRight } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [page, setPage] = useState('landing'); // landing, auth, app
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');

  // Check auth on load
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = token;
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/profile`);
      setUser(res.data);
      setPage('app');
    } catch (err) { logout(); }
  };

  const login = async (email, password, isAdminLogin) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password, isAdminLogin });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setPage('app');
    } catch (err) { alert(err.response?.data?.error || 'Login Failed'); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPage('landing'); // Go back to landing on logout
  };

  // --- RENDER FLOW ---

  if (page === 'landing') return <LandingPage onEnter={() => setPage('auth')} />;
  if (page === 'auth') return <AuthScreen onLogin={login} onBack={() => setPage('landing')} />;
  
  // Main App
  if (!user) return null; // Loading state

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand"><div style={{width:12, height:12, background:'white', borderRadius:'2px'}}></div> Dayflow</div>
        <nav>
          <NavItem icon={<Users size={18}/>} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<User size={18}/>} label="My Profile" active={view === 'profile'} onClick={() => setView('profile')} />
          {user.role === 'Admin' && <NavItem icon={<Briefcase size={18}/>} label="Employees" active={view === 'employees'} onClick={() => setView('employees')} />}
          {user.role === 'Admin' && <NavItem icon={<Settings size={18}/>} label="Admin Settings" active={view === 'settings'} onClick={() => setView('settings')} />}
          <NavItem icon={<Clock size={18}/>} label="Attendance" active={view === 'attendance'} onClick={() => setView('attendance')} />
          <NavItem icon={<Calendar size={18}/>} label="Leaves" active={view === 'leaves'} onClick={() => setView('leaves')} />
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <NavItem icon={<LogOut size={18}/>} label="Sign Out" onClick={logout} />
        </div>
      </aside>

      {/* Main Content with Bulb Animation */}
      <main className="main-content">
        <div className="bulb-glow"></div> {/* Aesthetic Bulb/Glow */}
        
        <header className="animate-entry">
          <h2 style={{color: 'white'}}>
            {user.role === 'Admin' ? 'Admin Overview' : 'Employee Dashboard'}
          </h2>
          <p style={{color:'#888', marginTop:'5px'}}>Welcome back, {user.name}</p>
        </header>
        
        <div className="animate-entry" style={{marginTop:'40px'}}>
          {view === 'dashboard' && <Dashboard user={user} />}
          {view === 'profile' && <Profile user={user} refresh={fetchProfile} />}
          {view === 'employees' && <EmployeeList />}
          {view === 'settings' && <AdminSettings user={user} refresh={fetchProfile} />}
          {view === 'attendance' && <Attendance user={user} />}
          {view === 'leaves' && <Leaves user={user} />}
        </div>
      </main>
    </div>
  );
}

// --- NEW LANDING PAGE ---
function LandingPage({ onEnter }) {
  return (
    <div className="landing-container">
      <div className="bulb-glow" style={{top:'-20%', right:'40%', width:'800px', height:'800px', opacity:0.3}}></div>
      <h1 className="landing-title animate-entry">Dayflow</h1>
      <p className="landing-quote animate-entry" style={{animationDelay:'0.1s'}}>"DayFlow, Stay in Flow"</p>
      <button className="enter-btn animate-entry" style={{animationDelay:'0.2s'}} onClick={onEnter}>
        Enter Workspace <ArrowRight size={18} style={{marginLeft:'10px', verticalAlign:'middle'}}/>
      </button>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon} <span>{label}</span>
    </div>
  );
}

function AuthScreen({ onLogin, onBack }) {
  const [mode, setMode] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({});

  const handleSubmit = async () => {
    try {
      if (mode === 'login') {
        await onLogin(form.email, form.password, isAdmin);
      } else if (mode === 'signup') {
        await axios.post(`${API_URL}/signup`, { ...form, role: 'Employee' });
        alert('Registered! Please Log In.');
        setMode('login');
      } else if (mode === 'forgot') {
        await axios.post(`${API_URL}/reset-password`, form);
        alert('Password Reset Successful!');
        setMode('login');
      }
    } catch (e) { alert(e.response?.data?.error || 'Action Failed'); }
  };

  return (
    <div className="login-wrapper">
      <div className="bulb-glow" style={{right:'auto', left:'-10%', bottom:'-10%', top:'auto'}}></div>
      
      <div className="login-box glass animate-entry">
        {mode === 'login' && (
           <div className="toggle-switch">
             <div className={`toggle-opt ${!isAdmin ? 'active' : ''}`} onClick={() => setIsAdmin(false)}>Employee</div>
             <div className={`toggle-opt ${isAdmin ? 'active' : ''}`} onClick={() => setIsAdmin(true)}>Admin Portal</div>
           </div>
        )}

        <h2 style={{fontSize:'28px', marginBottom:'10px'}}>
          {mode === 'login' ? (isAdmin ? 'Admin Access' : 'Login') : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p style={{color:'#888', marginBottom:'30px', fontSize:'14px'}}>Secure HR Management System</p>

        {mode === 'login' && (
          <>
            <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
            <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
            <div style={{textAlign:'right', marginTop:'10px'}}>
              <span onClick={() => setMode('forgot')} style={{fontSize:'12px', color:'#888', cursor:'pointer'}}>Forgot Password?</span>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <>
            <input placeholder="Full Name" onChange={e => setForm({...form, name: e.target.value})} />
            <input placeholder="Employee ID" onChange={e => setForm({...form, employeeId: e.target.value})} />
            <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
            <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
          </>
        )}

        {mode === 'forgot' && (
          <>
            <input placeholder="Employee ID" onChange={e => setForm({...form, employeeId: e.target.value})} />
            <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
            <input type="password" placeholder="New Password" onChange={e => setForm({...form, newPassword: e.target.value})} />
          </>
        )}

        <button className="btn btn-primary" style={{marginTop:'25px'}} onClick={handleSubmit}>
          {mode === 'login' ? 'Continue' : mode === 'signup' ? 'Sign Up' : 'Update Password'}
        </button>

        <div style={{marginTop:'15px', display:'flex', justifyContent:'space-between'}}>
            {mode !== 'forgot' && (
            <span style={{fontSize:'13px', color:'#888', cursor:'pointer'}} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? "No account? Sign Up" : "Back to Login"}
            </span>
            )}
            {mode === 'forgot' && <span style={{fontSize:'13px', color:'#888', cursor:'pointer'}} onClick={() => setMode('login')}>Back</span>}
            
            <span style={{fontSize:'13px', color:'#888', cursor:'pointer'}} onClick={onBack}>Home</span>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  return (
    <div className="grid-3">
      <div className="card glass"><h3>Annual Compensation</h3><div className="stat-val">${user.salary?.toLocaleString() || 0}</div></div>
      <div className="card glass"><h3>Role Title</h3><div className="stat-val" style={{fontSize:'28px'}}>{user.jobTitle || 'N/A'}</div><p style={{color:'#888'}}>{user.department}</p></div>
      <div className="card glass"><h3>System Access</h3><div className="stat-val" style={{fontSize:'28px'}}>{user.role}</div></div>
    </div>
  );
}

function AdminSettings({ user, refresh }) {
  const [form, setForm] = useState({});
  const handleUpdate = async () => {
    if(!window.confirm("Changing credentials will require you to login again. Proceed?")) return;
    await axios.put(`${API_URL}/users/${user.id}`, form);
    alert("Updated. Please login again.");
    refresh();
  };
  return (
    <div className="card glass">
      <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'20px'}}>
        <Lock size={20} color="white" /> <h3 style={{marginBottom:0}}>Admin Security</h3>
      </div>
      <div className="grid-3">
        <div><label style={{fontSize:'12px', color:'#888'}}>Update Email</label><input onChange={e => setForm({...form, email: e.target.value})} /></div>
        <div><label style={{fontSize:'12px', color:'#888'}}>Update Password</label><input type="password" onChange={e => setForm({...form, password: e.target.value})} /></div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleUpdate}>Save Credentials</button>
    </div>
  );
}

function Profile({ user, refresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });
  const handleSave = async () => { await axios.put(`${API_URL}/users/${user.id}`, formData); setIsEditing(false); refresh(); };

  return (
    <div className="card glass">
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
        <h3>My Profile</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>{isEditing ? 'Save' : 'Edit'}</button>
      </div>
      <div className="grid-3">
        <div><label style={{fontSize:'12px', color:'#888'}}>Full Name</label><input disabled={!isEditing} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
        <div><label style={{fontSize:'12px', color:'#888'}}>Phone</label><input disabled={!isEditing} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
        <div><label style={{fontSize:'12px', color:'#888'}}>Address</label><input disabled={!isEditing} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
      </div>
    </div>
  );
}

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  useEffect(() => { axios.get(`${API_URL}/users`).then(res => setEmployees(res.data)) }, []);
  return (
    <div className="card glass">
      <h3>Directory</h3>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Dept</th></tr></thead>
        <tbody>
          {employees.map((emp, i) => (
            <tr key={i}>
              <td style={{color:'white'}}>{emp.employeeId}</td>
              <td>{emp.name}</td>
              <td><span className="status-badge">{emp.role}</span></td>
              <td>{emp.department}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Attendance({ user }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => { axios.get(`${API_URL}/attendance`).then(res => setLogs(res.data)) }, []);
  const handle = (type) => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    axios[type === 'in' ? 'post' : 'put'](type === 'in' ? `${API_URL}/attendance/checkin` : `${API_URL}/attendance/checkout`, type === 'in' ? { date: today, checkIn: time } : { date: today, checkOut: time }).then(() => window.location.reload());
  };
  return (
    <div className="card glass">
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
        <h3>Attendance Logs</h3>
        {user.role === 'Employee' && <div style={{display:'flex', gap:'10px'}}><button className="btn btn-primary btn-sm" onClick={() => handle('in')}>Check In</button><button className="btn btn-secondary btn-sm" onClick={() => handle('out')}>Check Out</button></div>}
      </div>
      <table>
        <thead><tr><th>Date</th>{user.role === 'Admin' && <th>User</th>}<th>In</th><th>Out</th><th>Status</th></tr></thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i}><td>{log.date}</td>{user.role === 'Admin' && <td>{log.name}</td>}<td>{log.checkIn}</td><td>{log.checkOut || '-'}</td><td><span className="status-badge">{log.status}</span></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Leaves({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ type: 'Sick', start: '', end: '' });
  const refresh = () => axios.get(`${API_URL}/leaves`).then(res => setLeaves(res.data));
  useEffect(() => { refresh() }, []);
  const apply = () => axios.post(`${API_URL}/leaves`, { ...form, startDate: form.start, endDate: form.end }).then(() => { alert('Applied'); refresh(); });
  const update = (id, status) => axios.put(`${API_URL}/leaves/${id}`, { status }).then(refresh);
  return (
    <div style={{display:'grid', gap:'20px'}}>
      {user.role === 'Employee' && <div className="card glass"><h3>Request Leave</h3><div className="grid-3" style={{marginBottom:0, alignItems:'end'}}><div><label style={{fontSize:'12px', color:'#888'}}>Type</label><select onChange={e => setForm({...form, type: e.target.value})}><option>Sick</option><option>Casual</option></select></div><div><label style={{fontSize:'12px', color:'#888'}}>Dates</label><div style={{display:'flex', gap:'5px'}}><input type="date" onChange={e => setForm({...form, start: e.target.value})}/><input type="date" onChange={e => setForm({...form, end: e.target.value})}/></div></div><button className="btn btn-primary" onClick={apply}>Submit</button></div></div>}
      <div className="card glass"><h3>History</h3><table><thead><tr><th>Type</th>{user.role === 'Admin' && <th>User</th>}<th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{leaves.map((l, i) => (<tr key={i}><td>{l.type}</td>{user.role === 'Admin' && <td>{l.name}</td>}<td>{l.startDate}</td><td><span className="status-badge">{l.status}</span></td><td>{user.role === 'Admin' && l.status === 'Pending' ? <div style={{display:'flex', gap:'5px'}}><button className="btn btn-secondary btn-sm" onClick={() => update(l.id, 'Approved')}>✓</button><button className="btn btn-secondary btn-sm" onClick={() => update(l.id, 'Rejected')}>✕</button></div> : '-'}</td></tr>))}</tbody></table></div>
    </div>
  );
}