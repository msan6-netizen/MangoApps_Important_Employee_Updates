import { Header } from './components/Header';
import { EmployeeFeed } from './components/employee/EmployeeFeed';
import { TextBanner } from './components/employee/TextBanner';
import { ManagerView } from './components/manager/ManagerView';
import { useApp } from './state/AppContext';

export default function App() {
  const { state } = useApp();
  const viewer = state.employees.find((e) => e.id === state.viewerId)!;
  const isManager = viewer.role === 'store_manager' || viewer.role === 'ops_manager';
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-4">
        {isManager ? <ManagerView key={viewer.id} manager={viewer} /> : <><TextBanner key={viewer.id} /><EmployeeFeed key={viewer.id} /></>}
      </main>
    </div>
  );
}
