import { projects } from "@/data/projects";
import ProjectCard from "./ProjectCard";

export default function Projects() {
  return (
    <section id="work" className="bg-ink px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-accent">Selected work</p>
          <h2 className="mt-3 font-display text-4xl text-paper sm:text-5xl">
            Things I've shipped
          </h2>
          <p className="mt-4 text-haze">
            A mix of client sites, backend services, and internal tools —
            built end to end, from data model to interface.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
