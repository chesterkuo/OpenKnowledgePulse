import Layout from "@theme/Layout";
import CTASection from "../components/CTASection";
import CodeExample from "../components/CodeExample";

import EcosystemNote from "../components/EcosystemNote";
import FeatureGrid from "../components/FeatureGrid";
import FrameworkLogos from "../components/FrameworkLogos";
import HeroSection from "../components/HeroSection";
import ProtocolStack from "../components/ProtocolStack";
import StatsCounter from "../components/StatsCounter";
import TestimonialCards from "../components/TestimonialCards";
import UseCaseCards from "../components/UseCaseCards";

export default function Home(): JSX.Element {
  return (
    <Layout title="Home" description="Open AI Knowledge-Sharing Protocol">
      <HeroSection />
      <StatsCounter />
      <ProtocolStack />
      <FeatureGrid />
      <CodeExample />
      <UseCaseCards />
      <FrameworkLogos />
      <TestimonialCards />
      <EcosystemNote />
      <CTASection />
    </Layout>
  );
}
