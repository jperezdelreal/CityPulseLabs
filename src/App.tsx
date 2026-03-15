import MapView from './components/Map/MapView';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="bg-blue-700 text-white px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xl font-bold">🚲 BiciCoruña</span>
        <span className="text-sm opacity-80">Smart bike-sharing route planner</span>
      </header>
      <main className="flex-1 relative">
        <MapView />
      </main>
    </div>
  );
}

export default App;
