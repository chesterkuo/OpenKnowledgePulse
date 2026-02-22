import Layout from "@theme/Layout";
import HeroSection from "../components/HeroSection";
import StatsCounter from "../components/StatsCounter";
import ProtocolStack from "../components/ProtocolStack";
import FeatureGrid from "../components/FeatureGrid";
import CodeExample from "../components/CodeExample";
import ComparisonTable from "../components/ComparisonTable";
import UseCaseCards from "../components/UseCaseCards";
import FrameworkLogos from "../components/FrameworkLogos";
import TestimonialCards from "../components/TestimonialCards";
import EcosystemNote from "../components/EcosystemNote";
import CTASection from "../components/CTASection";

export default function Home(): JSX.Element {
  return (
    <Layout title="Home" description="Open AI Knowledge-Sharing Protocol">
      <HeroSection />
      <StatsCounter />
      <ProtocolStack />
      <FeatureGrid />
      <CodeExample />
      <ComparisonTable />
      <UseCaseCards />
      <FrameworkLogos />
      <TestimonialCards />
      <EcosystemNote />
      <CTASection />
    </Layout>
  );
}
