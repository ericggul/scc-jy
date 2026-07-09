"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { industries } from "./data";
import { generateCv, parametersFromPointer } from "./generator";
import { getCvStyle, type CvStyle } from "./styles";
import type { CvDocument, Role } from "./types";

type PointerState = {
  x: number;
  y: number;
};

const PAGE_WIDTH =
  "min(calc(100vw - 1.5rem), calc((100dvh - 1.5rem) * 210 / 297), 760px)";

function fontFamily(style: CvStyle) {
  if (style.type === "serif") {
    return 'Georgia, "Times New Roman", Times, serif';
  }

  if (style.type === "mono") {
    return '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
  }

  if (style.type === "condensed") {
    return '"Arial Narrow", "Helvetica Neue Condensed", Arial, sans-serif';
  }

  return 'Arial, "Helvetica Neue", Helvetica, ui-sans-serif, system-ui, sans-serif';
}

function pageFontSize(style: CvStyle) {
  if (style.density === "compact") {
    return "clamp(7.1px, 1.1cqw, 9.4px)";
  }

  if (style.density === "expanded") {
    return "clamp(7.6px, 1.2cqw, 10.4px)";
  }

  return "clamp(7.3px, 1.16cqw, 9.9px)";
}

function pagePadding(style: CvStyle) {
  if (style.density === "compact") {
    return "4.4em";
  }

  if (style.density === "expanded") {
    return "5.8em";
  }

  return "5.1em";
}

function sectionGap(style: CvStyle) {
  if (style.density === "compact") {
    return "1.05em";
  }

  if (style.density === "expanded") {
    return "1.55em";
  }

  return "1.28em";
}

function formatDate(role: Role) {
  return `${role.start} - ${role.end}`;
}

function Section({
  title,
  style,
  index,
  children,
}: {
  title: string;
  style: CvStyle;
  index: number;
  children: React.ReactNode;
}) {
  const heading =
    style.section === "numbered"
      ? `${String(index + 1).padStart(2, "0")} ${title}`
      : title;
  const headingClass =
    style.section === "boxed"
      ? "py-[0.2em] text-[0.78em] font-bold uppercase tracking-[0.08em]"
      : style.section === "tabular"
        ? "grid grid-cols-[9em_1fr] gap-[1em] text-[0.78em] font-bold uppercase tracking-[0.08em]"
        : style.section === "plain"
          ? "text-[0.92em] font-bold leading-tight"
          : style.section === "smallcaps"
            ? "text-[0.82em] font-bold uppercase tracking-[0.16em]"
            : "text-[0.78em] font-bold uppercase tracking-[0.1em]";

  return (
    <section className="break-inside-avoid grid gap-[0.68em]">
      {style.section === "tabular" ? (
        <h2 className={headingClass}>{heading}</h2>
      ) : (
        <h2 className={headingClass}>{heading}</h2>
      )}
      {children}
    </section>
  );
}

function Header({ cv, style }: { cv: CvDocument; style: CvStyle }) {
  const contact = `${cv.person.city} | ${cv.person.email} | ${cv.person.phone} | ${cv.person.profileUrl}`;

  if (style.header === "table") {
    return (
      <header className="grid grid-cols-[1.1fr_1fr] gap-[2em] text-[0.86em] leading-[1.32]">
        <div>
          <h1 className="text-[2.35em] font-bold uppercase leading-none tracking-[0.04em]">
            {cv.person.name}
          </h1>
          <p className="mt-[0.65em] font-bold">{cv.targetTitle}</p>
        </div>
        <div className="grid content-start gap-[0.18em] text-right">
          <p>{cv.person.city}</p>
          <p>{cv.person.email}</p>
          <p>{cv.person.phone}</p>
          <p>{cv.person.profileUrl}</p>
        </div>
      </header>
    );
  }

  if (style.header === "block") {
    return (
      <header className="grid gap-[0.72em] pl-[0.2em]">
        <h1 className="text-[2.28em] font-bold leading-none">{cv.person.name}</h1>
        <p className="text-[0.95em] font-bold">{cv.targetTitle}</p>
        <p className="text-[0.8em] leading-tight">{contact}</p>
      </header>
    );
  }

  if (style.header === "letterhead") {
    return (
      <header className="grid grid-cols-[1fr_auto] items-end gap-[1.5em]">
        <div>
          <h1 className="text-[2.55em] font-normal leading-none">{cv.person.name}</h1>
          <p className="mt-[0.45em] text-[0.95em] font-bold">{cv.targetTitle}</p>
        </div>
        <p className="max-w-[24em] text-right text-[0.78em] leading-[1.32]">
          {contact}
        </p>
      </header>
    );
  }

  if (style.header === "left" || style.header === "rule") {
    return (
      <header className="grid gap-[0.62em]">
        <h1 className="text-[2.45em] font-bold leading-none">{cv.person.name}</h1>
        <div className="grid grid-cols-[1fr_auto] gap-[1.4em] text-[0.84em] leading-tight">
          <p className="font-bold">{cv.targetTitle}</p>
          <p className="text-right">{contact}</p>
        </div>
      </header>
    );
  }

  return (
    <header className="grid justify-items-center gap-[0.58em] text-center">
      <h1 className="text-[2.38em] font-bold leading-none tracking-[0.04em]">
        {cv.person.name}
      </h1>
      <p className="text-[0.92em] font-bold leading-tight">{cv.targetTitle}</p>
      <p className="text-[0.78em] leading-tight">{contact}</p>
    </header>
  );
}

function RoleBlock({ role, style }: { role: Role; style: CvStyle }) {
  return (
    <article className="break-inside-avoid grid gap-[0.42em]">
      <div className="grid grid-cols-[1fr_auto] gap-[1.35em]">
        <div>
          <h3 className="text-[0.96em] font-bold leading-tight">{role.title}</h3>
          <p className="text-[0.84em] leading-tight">
            {role.employer}, {role.city}
          </p>
        </div>
        <p className="whitespace-nowrap text-right text-[0.76em] leading-tight">
          {formatDate(role)}
        </p>
      </div>
      {style.pageMode !== "one" && (
        <p className="text-[0.77em] italic leading-[1.28] text-[#3e3e3e]">
          {role.context}
        </p>
      )}
      <ul className="grid gap-[0.2em] pl-[1.15em] text-[0.8em] leading-[1.31]">
        {role.bullets.map((bullet) => (
          <li key={bullet.id} className="list-disc">
            {bullet.text}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Experience({
  cv,
  style,
  roles,
}: {
  cv: CvDocument;
  style: CvStyle;
  roles: Role[];
}) {
  return (
    <div className="grid gap-[0.92em]">
      {roles.map((role) => (
        <RoleBlock key={role.id} role={role} style={style} />
      ))}
      {roles.length === 0 && (
        <p className="text-[0.82em] leading-[1.32]">
          Earlier career history available on request for {cv.industry.field}.
        </p>
      )}
    </div>
  );
}

function Education({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid gap-[0.58em] text-[0.8em] leading-[1.3]">
      {cv.education.map((education) => (
        <div key={education.id} className="grid grid-cols-[1fr_auto] gap-[1em]">
          <div>
            <p className="font-bold">{education.degree}</p>
            <p>
              {education.institution}, {education.city}
            </p>
            <p>{education.details}</p>
          </div>
          <p className="whitespace-nowrap text-right">{education.year}</p>
        </div>
      ))}
    </div>
  );
}

function Skills({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid gap-[0.38em] text-[0.79em] leading-[1.3]">
      {cv.skillGroups.map((group) => (
        <p key={group.id}>
          <span className="font-bold">{group.label}: </span>
          {group.items.join(", ")}
        </p>
      ))}
      <p>
        <span className="font-bold">Credentials: </span>
        {cv.credentials.join(", ")}
      </p>
      <p>
        <span className="font-bold">Languages: </span>
        {cv.languages.join(", ")}
      </p>
    </div>
  );
}

function Projects({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid gap-[0.48em] text-[0.79em] leading-[1.31]">
      {cv.projects.map((project) => (
        <p key={project.id}>
          <span className="font-bold">{project.label}: </span>
          {project.text}
        </p>
      ))}
    </div>
  );
}

function Publications({ cv }: { cv: CvDocument }) {
  return (
    <ol className="grid gap-[0.36em] text-[0.78em] leading-[1.3]">
      {cv.publications.map((publication) => (
        <li key={publication.id}>{publication.citation}</li>
      ))}
    </ol>
  );
}

function Awards({ cv }: { cv: CvDocument }) {
  return (
    <ul className="grid gap-[0.28em] pl-[1.1em] text-[0.79em] leading-[1.31]">
      {cv.awards.map((award) => (
        <li key={award.id} className="list-disc">
          {award.text}
        </li>
      ))}
    </ul>
  );
}

function Service({ cv }: { cv: CvDocument }) {
  return (
    <ul className="grid gap-[0.28em] pl-[1.1em] text-[0.79em] leading-[1.31]">
      {cv.service.map((item, index) => (
        <li key={`${cv.id}-service-${index}`} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Page({
  cv,
  style,
  children,
  pageNumber,
}: {
  cv: CvDocument;
  style: CvStyle;
  children: React.ReactNode;
  pageNumber?: number;
}) {
  return (
    <article
      className="relative grid aspect-[210/297] content-start text-[#151515]"
      style={
        {
          width: PAGE_WIDTH,
          containerType: "inline-size",
          fontFamily: fontFamily(style),
          fontSize: pageFontSize(style),
          padding: pagePadding(style),
          gap: sectionGap(style),
          lineHeight: style.density === "expanded" ? 1.38 : 1.31,
          background: "#ffffff",
          border: "1px solid #000000",
          color: "#151515",
          fontStretch: style.type === "condensed" ? "condensed" : "normal",
        } as React.CSSProperties
      }
    >
      {children}
      {pageNumber && (
        <span className="absolute bottom-[2.2em] right-[4.8em] text-[0.68em] text-[#555]">
          {cv.person.name} / {pageNumber}
        </span>
      )}
    </article>
  );
}

function PageSections({
  cv,
  style,
  sections,
}: {
  cv: CvDocument;
  style: CvStyle;
  sections: Array<{ title: string; content: React.ReactNode }>;
}) {
  return (
    <>
      {sections.map((section, index) => (
        <Section
          key={`${cv.id}-section-${section.title}-${index}`}
          title={section.title}
          style={style}
          index={index}
        >
          {section.content}
        </Section>
      ))}
    </>
  );
}

function OnePageDocument({ cv, style }: { cv: CvDocument; style: CvStyle }) {
  const roles = cv.roles.slice(0, style.id === "plain-ats" ? 4 : 3);

  return (
    <Page cv={cv} style={style}>
      <Header cv={cv} style={style} />
      <PageSections
        cv={cv}
        style={style}
        sections={[
          {
            title: style.id === "engineer-spec" ? "Profile / scope" : "Professional summary",
            content: <p className="text-[0.82em] leading-[1.33]">{cv.profile}</p>,
          },
          {
            title: "Experience",
            content: <Experience cv={cv} style={style} roles={roles} />,
          },
          {
            title: "Selected projects",
            content: <Projects cv={cv} />,
          },
          {
            title: "Education",
            content: <Education cv={cv} />,
          },
          {
            title: "Skills",
            content: <Skills cv={cv} />,
          },
        ]}
      />
    </Page>
  );
}

function TwoPageDocument({ cv, style }: { cv: CvDocument; style: CvStyle }) {
  const firstRoles = cv.roles.slice(0, 3);
  const secondRoles = cv.roles.slice(3);

  return (
    <>
      <Page cv={cv} style={style}>
        <Header cv={cv} style={style} />
        <PageSections
          cv={cv}
          style={style}
          sections={[
            {
              title:
                style.id === "executive-board"
                  ? "Executive profile"
                  : style.id === "europass-clean"
                    ? "Personal profile"
                    : "Profile",
              content: <p className="text-[0.83em] leading-[1.34]">{cv.profile}</p>,
            },
            {
              title:
                style.id === "government-ksas"
                  ? "Specialized experience"
                  : "Recent experience",
              content: <Experience cv={cv} style={style} roles={firstRoles} />,
            },
            {
              title:
                style.id === "architecture-plate"
                  ? "Selected commissions"
                  : "Selected projects",
              content: <Projects cv={cv} />,
            },
          ]}
        />
      </Page>
      <Page cv={cv} style={style} pageNumber={2}>
        <PageSections
          cv={cv}
          style={style}
          sections={[
            {
              title: "Earlier experience",
              content: <Experience cv={cv} style={style} roles={secondRoles} />,
            },
            {
              title: "Education and training",
              content: <Education cv={cv} />,
            },
            {
              title: "Skills and credentials",
              content: <Skills cv={cv} />,
            },
            {
              title: "Recognition",
              content: <Awards cv={cv} />,
            },
          ]}
        />
      </Page>
    </>
  );
}

function DossierDocument({ cv, style }: { cv: CvDocument; style: CvStyle }) {
  return (
    <>
      <Page cv={cv} style={style}>
        <Header cv={cv} style={style} />
        <PageSections
          cv={cv}
          style={style}
          sections={[
            {
              title: "Research profile",
              content: <p className="text-[0.83em] leading-[1.34]">{cv.profile}</p>,
            },
            {
              title: "Appointments",
              content: <Experience cv={cv} style={style} roles={cv.roles.slice(0, 4)} />,
            },
            {
              title: "Education",
              content: <Education cv={cv} />,
            },
          ]}
        />
      </Page>
      <Page cv={cv} style={style} pageNumber={2}>
        <PageSections
          cv={cv}
          style={style}
          sections={[
            {
              title: "Publications",
              content: <Publications cv={cv} />,
            },
            {
              title: "Research programs",
              content: <Projects cv={cv} />,
            },
          ]}
        />
      </Page>
      <Page cv={cv} style={style} pageNumber={3}>
        <PageSections
          cv={cv}
          style={style}
          sections={[
            {
              title: "Teaching, service, and review",
              content: <Service cv={cv} />,
            },
            {
              title: "Awards and invited activity",
              content: <Awards cv={cv} />,
            },
            {
              title: "Methods and skills",
              content: <Skills cv={cv} />,
            },
          ]}
        />
      </Page>
    </>
  );
}

function DocumentStack({ cv, style }: { cv: CvDocument; style: CvStyle }) {
  return (
    <div className="grid h-dvh snap-y snap-mandatory justify-items-center gap-10 overflow-y-auto bg-white px-3 py-3">
      {style.pageMode === "dossier" ? (
        <DossierDocument cv={cv} style={style} />
      ) : style.pageMode === "two" ? (
        <TwoPageDocument cv={cv} style={style} />
      ) : (
        <OnePageDocument cv={cv} style={style} />
      )}
    </div>
  );
}

export default function CvsOne() {
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<PointerState>({ x: 0.5, y: 0.42 });
  const [pointer, setPointer] = useState<PointerState>({ x: 0.5, y: 0.42 });

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const parameters = useMemo(
    () => parametersFromPointer(pointer.x, pointer.y),
    [pointer.x, pointer.y],
  );
  const cv = useMemo(() => generateCv(parameters), [parameters]);
  const style = useMemo(() => getCvStyle(cv.styleIndex), [cv.styleIndex]);

  return (
    <main
      className="relative h-dvh cursor-crosshair overflow-hidden bg-white text-black"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pendingRef.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        };

        if (frameRef.current === null) {
          frameRef.current = requestAnimationFrame(() => {
            setPointer(pendingRef.current);
            frameRef.current = null;
          });
        }
      }}
    >
      <DocumentStack cv={cv} style={style} />
      <div className="sr-only">
        Mouse X selects industry and style family. Mouse Y selects years of
        experience from 0 to 30. Current style is {style.label}. Current industry
        is {industries[parameters.industryIndex]?.label}.
      </div>
    </main>
  );
}
