import Nav from "@/components/portfolio/Nav";
import Hero from "@/components/portfolio/Hero";
import Projects from "@/components/portfolio/Projects";
import Skills from "@/components/portfolio/Skills";
import BuildStudio from "@/components/portfolio/buildstudio/BuildStudio";
import About from "@/components/portfolio/About";
import Contact from "@/components/portfolio/Contact";
import Footer from "@/components/portfolio/Footer";
import CustomCursor from "@/components/portfolio/CustomCursor";
import { AvatarProvider } from "@/components/portfolio/avatar/AvatarContext";
import { PhysicsProvider } from "@/components/portfolio/physics/PhysicsContext";
import AvatarStage from "@/components/portfolio/avatar/AvatarStage";
import AvatarDirector from "@/components/portfolio/avatar/AvatarDirector";
import AvatarToggle from "@/components/portfolio/avatar/AvatarToggle";
import { RebuildProvider } from "@/components/portfolio/rebuild/RebuildContext";
import RebuildStage from "@/components/portfolio/rebuild/RebuildStage";
import { BrainProvider } from "@/components/portfolio/brain/BrainContext";
import BrainOverlay from "@/components/portfolio/brain/BrainOverlay";
import { AdProvider } from "@/components/portfolio/ad/AdContext";
import AdPlayer from "@/components/portfolio/ad/AdPlayer";
import Intro from "@/components/portfolio/intro/Intro";

export default function Home() {
  return (
    <AvatarProvider>
      <PhysicsProvider>
      <RebuildProvider>
      <BrainProvider>
      <AdProvider>
      <main className="bg-ink">
        <CustomCursor />
        <AvatarStage />
        <AvatarDirector />
        <AvatarToggle />
        <RebuildStage />
        <BrainOverlay />
        <AdPlayer />
        <Intro />
        <Nav />
        <Hero />
        <Projects />
        <Skills />
        <BuildStudio />
        <About />
        <Contact />
        <Footer />
      </main>
      </AdProvider>
      </BrainProvider>
      </RebuildProvider>
      </PhysicsProvider>
    </AvatarProvider>
  );
}
