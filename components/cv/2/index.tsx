"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { industries } from "../1/data";
import { generateCv, parametersFromPointer } from "../1/generator";
import type { CvDocument, Role } from "../1/types";
import { cvTwoStyles, getCvTwoStyle, type CvTwoStyle } from "./styles";

type PointerState = {
  x: number;
  y: number;
};

const PAGE_WIDTH =
  "min(calc(100vw - 1.5rem), calc((100dvh - 1.5rem) * 210 / 297), 760px)";

function fontFamily(style: CvTwoStyle) {
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

function fontSize(style: CvTwoStyle) {
  if (style.density === "tight") {
    return "1.9cqw";
  }

  if (style.density === "open") {
    return "2.08cqw";
  }

  return "1.98cqw";
}

function pagePadding(style: CvTwoStyle) {
  if (style.header === "poster" || style.density === "open") {
    return "3.75em";
  }

  if (style.density === "tight") {
    return "3.35em";
  }

  return "3.55em";
}

function sectionGap(style: CvTwoStyle) {
  if (style.density === "tight") {
    return "0.68em";
  }

  if (style.density === "open") {
    return "0.88em";
  }

  return "0.76em";
}

function Header({ cv, style }: { cv: CvDocument; style: CvTwoStyle }) {
  const contact = `${cv.person.city} / ${cv.person.email} / ${cv.person.phone} / ${cv.person.profileUrl}`;

  if (style.header === "poster") {
    return (
      <header className="grid gap-[0.85em]">
        <p className="text-[0.72em] uppercase tracking-[0.22em]" style={{ color: style.muted }}>
          {style.label}
        </p>
        <h1 className="max-w-[11em] text-[3.4em] font-bold leading-[0.88]">
          {cv.person.name}
        </h1>
        <p className="max-w-[42em] text-[0.88em] leading-[1.32]">{contact}</p>
      </header>
    );
  }

  if (style.header === "ledger" || style.header === "index") {
    return (
      <header className="grid grid-cols-[1fr_1fr] gap-[2em] text-[0.82em] leading-[1.28]">
        <div>
          <h1 className="text-[2.28em] font-bold leading-none">{cv.person.name}</h1>
          <p className="mt-[0.55em] font-bold">{cv.targetTitle}</p>
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

  if (style.header === "memo") {
    return (
      <header className="grid gap-[0.65em] text-[0.84em] leading-[1.3]">
        <p style={{ color: style.muted }}>To hiring committee / {cv.industry.field}</p>
        <h1 className="text-[2.35em] font-bold leading-none">{cv.person.name}</h1>
        <p className="font-bold">{cv.targetTitle}</p>
        <p>{contact}</p>
      </header>
    );
  }

  if (style.header === "dossier") {
    return (
      <header className="grid gap-[0.7em]">
        <h1 className="text-[2.2em] font-bold leading-none">{cv.person.name}</h1>
        <div className="grid grid-cols-[1fr_auto] gap-[1.4em] text-[0.82em]">
          <p>{cv.targetTitle}</p>
          <p>{contact}</p>
        </div>
      </header>
    );
  }

  return (
    <header className="grid gap-[0.62em] text-center">
      <h1 className="text-[2.42em] font-bold leading-none">{cv.person.name}</h1>
      <p className="font-bold">{cv.targetTitle}</p>
      <p className="text-[0.8em]">{contact}</p>
    </header>
  );
}

function Section({
  cv,
  style,
  title,
  index,
  children,
}: {
  cv: CvDocument;
  style: CvTwoStyle;
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  const prefix = style.sections === "numbered" ? `${index + 1}. ` : "";
  const label =
    style.sections === "folio" ? `${title} / ${cv.person.name}` : `${prefix}${title}`;
  const className =
    style.sections === "label"
      ? "text-[0.76em] font-bold uppercase tracking-[0.22em]"
      : style.sections === "ledger"
        ? "text-[0.78em] font-bold uppercase tracking-[0.1em]"
        : style.sections === "quiet"
          ? "text-[0.92em] font-bold"
          : "text-[0.8em] font-bold uppercase tracking-[0.12em]";

  return (
    <section className="break-inside-avoid grid gap-[0.62em]">
      <h2 className={className} style={{ color: style.accent }}>
        {label}
      </h2>
      {children}
    </section>
  );
}

function RoleBlock({
  role,
  style,
  bulletLimit,
}: {
  role: Role;
  style: CvTwoStyle;
  bulletLimit?: number;
}) {
  const bullets = bulletLimit ? role.bullets.slice(0, bulletLimit) : role.bullets;

  return (
    <article className="break-inside-avoid grid gap-[0.38em]">
      <div className="grid grid-cols-[1fr_auto] gap-[1.2em]">
        <div>
          <h3 className="text-[0.95em] font-bold leading-tight">{role.title}</h3>
          <p className="text-[0.82em] leading-tight">
            {role.employer}, {role.city}
          </p>
        </div>
        <p className="whitespace-nowrap text-right text-[0.74em]" style={{ color: style.muted }}>
          {role.start} - {role.end}
        </p>
      </div>
      {style.emphasis !== "evidence" && (
        <p className="text-[0.76em] italic leading-[1.28]" style={{ color: style.muted }}>
          {role.context}
        </p>
      )}
      <ul className="grid gap-[0.2em] pl-[1.1em] text-[0.78em] leading-[1.31]">
        {bullets.map((bullet) => (
          <li key={bullet.id} className="list-disc">
            {bullet.text}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Experience({
  roles,
  style,
  bulletLimit,
}: {
  roles: Role[];
  style: CvTwoStyle;
  bulletLimit?: number;
}) {
  return (
    <div className="grid gap-[0.9em]">
      {roles.map((role) => (
        <RoleBlock
          key={role.id}
          role={role}
          style={style}
          bulletLimit={bulletLimit}
        />
      ))}
    </div>
  );
}

function Education({ cv, style }: { cv: CvDocument; style: CvTwoStyle }) {
  return (
    <div className="grid gap-[0.52em] text-[0.78em] leading-[1.3]">
      {cv.education.map((education) => (
        <div key={education.id} className="grid grid-cols-[1fr_auto] gap-[1em]">
          <div>
            <p className="font-bold">{education.degree}</p>
            <p>
              {education.institution}, {education.city}
            </p>
            <p style={{ color: style.muted }}>{education.details}</p>
          </div>
          <p className="whitespace-nowrap text-right" style={{ color: style.muted }}>
            {education.year}
          </p>
        </div>
      ))}
    </div>
  );
}

function Skills({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid gap-[0.34em] text-[0.78em] leading-[1.3]">
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
    <div className="grid gap-[0.42em] text-[0.78em] leading-[1.3]">
      {cv.projects.slice(0, 4).map((project) => (
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
    <ol className="grid gap-[0.32em] text-[0.76em] leading-[1.28]">
      {cv.publications.slice(0, 8).map((publication) => (
        <li key={publication.id}>{publication.citation}</li>
      ))}
    </ol>
  );
}

function Awards({ cv }: { cv: CvDocument }) {
  return (
    <ul className="grid gap-[0.24em] pl-[1em] text-[0.78em] leading-[1.3]">
      {cv.awards.map((award) => (
        <li key={award.id} className="list-disc">
          {award.text}
        </li>
      ))}
    </ul>
  );
}

function Page({
  cv,
  style,
  page,
  children,
}: {
  cv: CvDocument;
  style: CvTwoStyle;
  page?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="grid h-dvh snap-start place-items-center">
      <div
        className="relative aspect-[210/297] overflow-hidden border border-black"
        style={
          {
            width: PAGE_WIDTH,
            boxSizing: "border-box",
            flex: "0 0 auto",
            containerType: "inline-size",
          } as React.CSSProperties
        }
      >
        <article
          className="absolute inset-0 grid content-start overflow-hidden"
          style={
            {
              boxSizing: "border-box",
              fontFamily: fontFamily(style),
              fontSize: fontSize(style),
              padding: pagePadding(style),
              gap: sectionGap(style),
              background: style.paper,
              color: style.ink,
              letterSpacing: "0",
              lineHeight: style.density === "open" ? 1.38 : 1.3,
            } as React.CSSProperties
          }
        >
          {children}
          {page && (
            <span className="absolute bottom-[2.1em] right-[4.8em] text-[0.66em]" style={{ color: style.muted }}>
              {cv.person.name} / {page}
            </span>
          )}
        </article>
      </div>
    </div>
  );
}

function PageSections({
  cv,
  style,
  sections,
}: {
  cv: CvDocument;
  style: CvTwoStyle;
  sections: Array<{ title: string; content: React.ReactNode }>;
}) {
  return (
    <>
      {sections.map((section, index) => (
        <Section
          key={`${cv.id}-${style.id}-${section.title}-${index}`}
          cv={cv}
          style={style}
          title={section.title}
          index={index}
        >
          {section.content}
        </Section>
      ))}
    </>
  );
}

function OnePage({ cv, style }: { cv: CvDocument; style: CvTwoStyle }) {
  return (
    <Page cv={cv} style={style}>
      <Header cv={cv} style={style} />
      <PageSections
        cv={cv}
        style={style}
        sections={[
          { title: "Profile", content: <p className="text-[0.8em] leading-[1.32]">{cv.profile}</p> },
          { title: "Experience", content: <Experience roles={cv.roles.slice(0, 3)} style={style} bulletLimit={3} /> },
          { title: "Selected work", content: <Projects cv={cv} /> },
          { title: "Education", content: <Education cv={cv} style={style} /> },
          { title: "Skills", content: <Skills cv={cv} /> },
        ]}
      />
    </Page>
  );
}

function TwoPage({ cv, style }: { cv: CvDocument; style: CvTwoStyle }) {
  return (
    <>
      <Page cv={cv} style={style}>
        <Header cv={cv} style={style} />
        <PageSections
          cv={cv}
          style={style}
          sections={[
            { title: "Profile", content: <p className="text-[0.8em] leading-[1.32]">{cv.profile}</p> },
            { title: "Recent experience", content: <Experience roles={cv.roles.slice(0, 3)} style={style} bulletLimit={3} /> },
            { title: style.emphasis === "portfolio" ? "Portfolio evidence" : "Selected evidence", content: <Projects cv={cv} /> },
          ]}
        />
      </Page>
      <Page cv={cv} style={style} page={2}>
        <PageSections
          cv={cv}
          style={style}
          sections={[
            { title: "Earlier experience", content: <Experience roles={cv.roles.slice(3)} style={style} bulletLimit={2} /> },
            { title: "Education and credentials", content: <Education cv={cv} style={style} /> },
            { title: "Skills", content: <Skills cv={cv} /> },
            { title: "Recognition", content: <Awards cv={cv} /> },
          ]}
        />
      </Page>
    </>
  );
}

function ThreePage({ cv, style }: { cv: CvDocument; style: CvTwoStyle }) {
  return (
    <>
      <Page cv={cv} style={style}>
        <Header cv={cv} style={style} />
        <PageSections
          cv={cv}
          style={style}
          sections={[
            { title: "Profile", content: <p className="text-[0.8em] leading-[1.32]">{cv.profile}</p> },
            { title: "Appointments and roles", content: <Experience roles={cv.roles.slice(0, 3)} style={style} bulletLimit={3} /> },
            { title: "Education", content: <Education cv={cv} style={style} /> },
          ]}
        />
      </Page>
      <Page cv={cv} style={style} page={2}>
        <PageSections
          cv={cv}
          style={style}
          sections={[
            { title: "Publications and documents", content: <Publications cv={cv} /> },
            { title: "Projects and programs", content: <Projects cv={cv} /> },
          ]}
        />
      </Page>
      <Page cv={cv} style={style} page={3}>
        <PageSections
          cv={cv}
          style={style}
          sections={[
            { title: "Earlier experience", content: <Experience roles={cv.roles.slice(3)} style={style} bulletLimit={2} /> },
            { title: "Recognition and service", content: <Awards cv={cv} /> },
            { title: "Skills and languages", content: <Skills cv={cv} /> },
          ]}
        />
      </Page>
    </>
  );
}

function DocumentStack({ cv, style }: { cv: CvDocument; style: CvTwoStyle }) {
  return (
    <div
      className="h-dvh snap-y snap-mandatory overflow-y-auto bg-white"
      style={{ scrollbarGutter: "stable both-edges" }}
    >
      {style.pageMode === "three" ? (
        <ThreePage cv={cv} style={style} />
      ) : style.pageMode === "two" ? (
        <TwoPage cv={cv} style={style} />
      ) : (
        <OnePage cv={cv} style={style} />
      )}
    </div>
  );
}

export default function CvTwo() {
  const frameRef = useRef<number | null>(null);
  const lastClientRef = useRef<{ x: number; y: number } | null>(null);
  const pendingRef = useRef<PointerState>({ x: 0.47, y: 0.52 });
  const [pointer, setPointer] = useState<PointerState>({ x: 0.47, y: 0.52 });

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
  const style = useMemo(() => {
    const index = Math.floor(
      (pointer.x * 71 + pointer.y * 149 + parameters.entropy / 29) %
        cvTwoStyles.length,
    );
    return getCvTwoStyle(index);
  }, [parameters.entropy, pointer.x, pointer.y]);

  return (
    <main
      className="h-dvh cursor-crosshair overflow-hidden bg-white text-black"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const client = {
          x: Math.round(event.clientX),
          y: Math.round(event.clientY),
        };

        if (
          lastClientRef.current?.x === client.x &&
          lastClientRef.current?.y === client.y
        ) {
          return;
        }

        lastClientRef.current = client;
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
        Mouse position maps to industry, years of experience, and one of{" "}
        {cvTwoStyles.length} CV style profiles. Current industry is{" "}
        {industries[parameters.industryIndex]?.label}; current style is{" "}
        {style.label}.
      </div>
    </main>
  );
}
