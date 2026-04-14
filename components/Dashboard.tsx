'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@/lib/theme-context';
import type { CityKey, Category, Project } from '@/lib/types';
import Header from './Header';
import StatsBar from './StatsBar';
import FilterBar from './FilterBar';
import SearchBar from './SearchBar';
import ProjectGrid from './ProjectGrid';
import Ticker from './Ticker';
import ScanlineOverlay from './ScanlineOverlay';
import LiveScanModal from './LiveScanModal';
import AgentStatus from './AgentStatus';
import BootSequence from './BootSequence';

interface Props {
  initialData: Record<CityKey, Project[]>;
}

const FREE_SCAN_LIMIT = 3;
const SCAN_COUNT_KEY = 'gotham-scan-count';
const BOOT_KEY = 'gotham-boot-done';

export default function Dashboard({ initialData }: Props) {
  const { theme } = useTheme();
  const [selectedCity, setSelectedCity] = useState<CityKey>('nyc');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveProjects, setLiveProjects] = useState<Project[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scanCode, setScanCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [scanError, setScanError] = useState('');
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem(SCAN_COUNT_KEY) ?? '0', 10);
    setScanCount(isNaN(count) ? 0 : count);
    const done = sessionStorage.getItem(BOOT_KEY) === 'true';
    setBootDone(done);
  }, []);

  const baseProjects = liveProjects ?? (initialData[selectedCity] ?? []);

  const filteredProjects = useMemo(() => {
    let p = baseProjects;
    if (selectedCategory) p = p.filter(x => x.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      p = p.filter(x =>
        x.title.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q) ||
        x.author.toLowerCase().includes(q)
      );
    }
    return p;
  }, [baseProjects, selectedCategory, searchQuery]);

  const handleCityChange = (city: CityKey) => {
    setSelectedCity(city);
    setLiveProjects(null);
    setSelectedCategory(null);
    setSearchQuery('');
    setScanError('');
  };

  const triggerScan = useCallback(async (code?: string) => {
    const usedCode = code ?? scanCode;
    setIsScanning(true);
    setScanError('');

    const newCount = scanCount + 1;
    setScanCount(newCount);
    localStorage.setItem(SCAN_COUNT_KEY, String(newCount));

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: selectedCity,
          category: selectedCategory ?? undefined,
          query: searchQuery || undefined,
          scanCode: usedCode || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setScanError(msg);
        return;
      }

      const data = await res.json();
      setLiveProjects(data.projects ?? []);
    } catch {
      setScanError('SIGNAL LOST -- SCANNER MALFUNCTION');
    } finally {
      setIsScanning(false);
    }
  }, [selectedCity, selectedCategory, searchQuery, scanCount, scanCode]);

  const handleScanRequest = () => {
    if (scanCount >= FREE_SCAN_LIMIT && !scanCode) {
      setShowModal(true);
    } else {
      setShowModal(true); // show modal even when scans remain (shows count + confirm)
    }
  };

  const handleCodeSubmit = (code: string) => {
    if (code) setScanCode(code);
    setShowModal(false);
    triggerScan(code || undefined);
  };

  const isFlap = theme === 'flap';
  const bg = isFlap ? 'bg-flap-bg text-flap-yellow' : 'bg-crt-black text-crt-green animate-flicker';

  if (!bootDone) {
    return (
      <BootSequence
        onComplete={() => {
          sessionStorage.setItem(BOOT_KEY, 'true');
          setBootDone(true);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${bg} font-mono`}>
      <ScanlineOverlay />
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <Header
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
          scanCount={scanCount}
          freeScanLimit={FREE_SCAN_LIMIT}
          onScanRequest={handleScanRequest}
          isScanning={isScanning}
        />
        <StatsBar projects={baseProjects} selectedCity={selectedCity} />
        <div className="flex flex-col md:flex-row gap-2 my-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <div className="md:flex-none">
            <FilterBar selected={selectedCategory} onSelect={setSelectedCategory} />
          </div>
        </div>
        {scanError && (
          <p className="text-crt-red font-mono text-xs mb-2">[ERR] {scanError}</p>
        )}
        {isScanning ? (
          <AgentStatus city={selectedCity} />
        ) : (
          <ProjectGrid projects={filteredProjects} scanCode={scanCode} />
        )}
        <Ticker projects={baseProjects} />
      </div>
      {showModal && (
        <LiveScanModal
          scanCount={scanCount}
          freeScanLimit={FREE_SCAN_LIMIT}
          onSubmit={handleCodeSubmit}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
