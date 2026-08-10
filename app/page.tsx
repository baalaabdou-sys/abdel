import Nav from "@/components/portfolio/Nav";
import Hero from "@/components/portfolio/Hero";
import Projects from "@/components/portfolio/Projects";
import Skills from "@/components/portfolio/Skills";
import About from "@/components/portfolio/About";
import Contact from "@/components/portfolio/Contact";
import Footer from "@/components/portfolio/Footer";
import CustomCursor from "@/components/portfolio/CustomCursor";

export default function Home() {
  return (
    <main className="bg-ink">
      <CustomCursor />
      <Nav />
      <Hero />
      <Projects />
      <Skills />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
