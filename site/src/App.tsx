import { LangProvider } from './lang';
import { Logo } from './components/Logo';
import { LangSwitch } from './components/LangSwitch';
import { Hero } from './components/Hero';
import { GraphSection } from './components/GraphSection';
import { InstallSection } from './components/InstallSection';
import { AgentsSection } from './components/AgentsSection';
import { FactsSection } from './components/FactsSection';
import { Footer } from './components/Footer';

export function App() {
  return (
    <LangProvider>
      <Logo />
      <LangSwitch />
      <div className="wrap">
        <Hero />
        <GraphSection />
        <InstallSection />
        <AgentsSection />
        <FactsSection />
        <Footer />
      </div>
    </LangProvider>
  );
}
