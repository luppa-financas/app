import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LandingCta } from './components/landing/landing-cta';
import { LandingFeatureAnalytics } from './components/landing/landing-feature-analytics';
import { LandingFeatureGoals } from './components/landing/landing-feature-goals';
import { LandingFeatureInvoices } from './components/landing/landing-feature-invoices';
import { LandingFeatureTransactions } from './components/landing/landing-feature-transactions';
import { LandingFooter } from './components/landing/landing-footer';
import { LandingHero } from './components/landing/landing-hero';
import { LandingHowItWorks } from './components/landing/landing-how-it-works';
import { LandingNavbar } from './components/landing/landing-navbar';
import { LandingStatsBand } from './components/landing/landing-stats-band';

export default async function HomePage() {
  const user = await currentUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="bg-white text-slate-900">
      <LandingNavbar />
      <LandingHero />
      <LandingStatsBand />
      <LandingHowItWorks />
      <LandingFeatureTransactions />
      <LandingFeatureAnalytics />
      <LandingFeatureGoals />
      <LandingFeatureInvoices />
      <LandingCta />
      <LandingFooter />
    </main>
  );
}
