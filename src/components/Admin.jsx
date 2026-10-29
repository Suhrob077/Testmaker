import { useState } from 'react';
import Creator from './Creator.jsx';
import Users from './Users.jsx';

export default function Admin(props) {
  const [tab, setTab] = useState('tests');
  return (
    <>
      <div className="chips" style={{ padding: '.8rem 1rem 0', margin: 0 }}>
        <button className={`chip ${tab === 'tests' ? 'on' : ''}`} onClick={() => setTab('tests')}>Test yuklash</button>
        <button className={`chip ${tab === 'users' ? 'on' : ''}`} onClick={() => setTab('users')}>Foydalanuvchilar</button>
      </div>
      {tab === 'tests' ? <Creator {...props} /> : <Users />}
    </>
  );
}
