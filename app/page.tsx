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

export default function Home() {
  return (
    <AvatarProvider>
      <PhysicsProvider>
      <main className="bg-ink">
        <CustomCursor />
        <AvatarStage />
        <AvatarDirector />
        <Nav />
        <Hero />
        <Projects />
        <Skills />
        <BuildStudio />
        <About />
        <Contact />
        <Footer />
      </main>
      </PhysicsProvider>
    </AvatarProvider>
  );
}
