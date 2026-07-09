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
    return "1.92cqw";
  }

  if (style.density === "expanded") {
    return "2.08cqw";
  }

  return "2cqw";
}

function pagePadding(style: CvStyle) {
  if (style.density === "compact") {
    return "6.6cqw";
  }

  if (style.density === "expanded") {
    return "7.8cqw";
  }

  return "7.2cqw";
}

function sectionGap(style: CvStyle) {
  if (style.density === "compact") {
    return "0.72em";
  }

  if (style.density === "expanded") {
    return "0.9em";
  }

  return "0.8em";
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

function RoleBlock({
  role,
  style,
  bulletLimit,
  mode = "bullets",
}: {
  role: Role;
  style: CvStyle;
  bulletLimit?: number;
  mode?: "bullets" | "narrative" | "ledger";
}) {
  const bullets = bulletLimit ? role.bullets.slice(0, bulletLimit) : role.bullets;

  if (mode === "ledger") {
    return (
      <article className="break-inside-avoid grid grid-cols-[7.6em_1fr] gap-[1em] border-t border-[#d0d0d0] pt-[0.42em] text-[0.78em] leading-[1.3]">
        <p className="text-[0.92em] uppercase tracking-[0.06em] text-[#444]">
          {formatDate(role)}
        </p>
        <div>
          <p className="font-bold">
            {role.title}, {role.employer}
          </p>
          <p>{role.context}</p>
          <p>{role.bullets[0]?.text}</p>
        </div>
      </article>
    );
  }

  if (mode === "narrative") {
    return (
      <article className="break-inside-avoid grid gap-[0.32em]">
        <div className="grid grid-cols-[1fr_auto] gap-[1.35em]">
          <div>
            <h3 className="text-[0.96em] font-bold leading-tight">{role.title}</h3>
            <p className="text-[0.82em] leading-tight">
              {role.employer}, {role.city}
            </p>
          </div>
          <p className="whitespace-nowrap text-right text-[0.74em] leading-tight">
            {formatDate(role)}
          </p>
        </div>
        <p className="text-[0.8em] leading-[1.32]">
          {role.context} {bullets.map((bullet) => bullet.text).join(" ")}
        </p>
      </article>
    );
  }

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
  cv,
  style,
  roles,
  bulletLimit,
  mode = "bullets",
}: {
  cv: CvDocument;
  style: CvStyle;
  roles: Role[];
  bulletLimit?: number;
  mode?: "bullets" | "narrative" | "ledger";
}) {
  return (
    <div className={mode === "ledger" ? "grid gap-[0.34em]" : "grid gap-[0.88em]"}>
      {roles.map((role) => (
        <RoleBlock
          key={role.id}
          role={role}
          style={style}
          bulletLimit={bulletLimit}
          mode={mode}
        />
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

function SkillsMatrix({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid grid-cols-[6.8em_1fr] border-t border-[#d4d4d4] text-[0.76em] leading-[1.28]">
      {cv.skillGroups.map((group) => (
        <div key={group.id} className="contents">
          <p className="border-b border-[#d4d4d4] py-[0.36em] pr-[1em] font-bold uppercase tracking-[0.06em]">
            {group.label}
          </p>
          <p className="border-b border-[#d4d4d4] py-[0.36em]">
            {group.items.join(" / ")}
          </p>
        </div>
      ))}
      <p className="border-b border-[#d4d4d4] py-[0.36em] pr-[1em] font-bold uppercase tracking-[0.06em]">
        Credentials
      </p>
      <p className="border-b border-[#d4d4d4] py-[0.36em]">
        {cv.credentials.join(" / ")}
      </p>
    </div>
  );
}

function Projects({
  cv,
  variant = "paragraph",
  limit = 4,
}: {
  cv: CvDocument;
  variant?: "paragraph" | "table" | "casebook" | "matter";
  limit?: number;
}) {
  const projects = cv.projects.slice(0, limit);

  if (variant === "table") {
    return (
      <div className="grid grid-cols-[3.8em_1fr_8em] border-t border-[#d2d2d2] text-[0.76em] leading-[1.26]">
        {projects.map((project, index) => (
          <div key={project.id} className="contents">
            <p className="border-b border-[#d2d2d2] py-[0.38em] pr-[0.9em] font-bold">
              {String(2026 - index)}
            </p>
            <p className="border-b border-[#d2d2d2] py-[0.38em] pr-[1em]">
              <span className="font-bold">{project.label}</span> - {project.text}
            </p>
            <p className="border-b border-[#d2d2d2] py-[0.38em] text-right">
              {cv.industry.metrics[index % cv.industry.metrics.length]}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "casebook") {
    return (
      <div className="grid grid-cols-2 gap-x-[1.2em] gap-y-[0.56em] text-[0.76em] leading-[1.28]">
        {projects.map((project, index) => (
          <article key={project.id} className="break-inside-avoid border-t border-[#cfcfcf] pt-[0.4em]">
            <p className="text-[0.72em] uppercase tracking-[0.1em] text-[#555]">
              Case {String(index + 1).padStart(2, "0")}
            </p>
            <p className="font-bold">{project.label}</p>
            <p>{project.text}</p>
          </article>
        ))}
      </div>
    );
  }

  if (variant === "matter") {
    return (
      <div className="grid gap-[0.5em] text-[0.78em] leading-[1.3]">
        {projects.map((project, index) => (
          <article key={project.id} className="grid grid-cols-[7.5em_1fr] gap-[1em]">
            <p className="font-bold">
              {cv.roles[index % cv.roles.length]?.employer ?? cv.industry.field}
            </p>
            <p>
              <span className="font-bold">{project.label}: </span>
              {project.text}
            </p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-[0.48em] text-[0.79em] leading-[1.31]">
        {projects.map((project) => (
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
        {cv.publications.slice(0, 8).map((publication) => (
        <li key={publication.id}>{publication.citation}</li>
      ))}
    </ol>
  );
}

function CredentialFile({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid grid-cols-[8em_1fr] gap-x-[1.1em] gap-y-[0.36em] text-[0.78em] leading-[1.3]">
      <p className="font-bold">Registration</p>
      <p>{cv.credentials.join(", ")}</p>
      <p className="font-bold">Systems</p>
      <p>{cv.skillGroups[1]?.items.join(", ")}</p>
      <p className="font-bold">Languages</p>
      <p>{cv.languages.join(", ")}</p>
      <p className="font-bold">Evidence</p>
      <p>{cv.skillGroups[2]?.items.join(", ")}</p>
    </div>
  );
}

function FederalNarratives({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid gap-[0.62em] text-[0.78em] leading-[1.31]">
      {cv.roles.slice(0, 3).map((role) => (
        <article key={role.id} className="break-inside-avoid grid gap-[0.22em]">
          <p className="font-bold">
            {role.title} | {role.employer} | {formatDate(role)}
          </p>
          <p>
            <span className="font-bold">Scope: </span>
            {role.context}
          </p>
          <p>
            <span className="font-bold">Evidence: </span>
            {role.bullets.slice(0, 2).map((bullet) => bullet.text).join(" ")}
          </p>
        </article>
      ))}
    </div>
  );
}

function RirekishoTable({ cv }: { cv: CvDocument }) {
  return (
    <div className="grid grid-cols-[5.2em_1fr] border-t border-[#cfcfcf] text-[0.78em] leading-[1.32]">
      {cv.education.map((education) => (
        <div key={education.id} className="contents">
          <p className="border-b border-[#cfcfcf] py-[0.42em] pr-[1em] text-right font-bold">
            {education.year}
          </p>
          <p className="border-b border-[#cfcfcf] py-[0.42em]">
            {education.degree}, {education.institution}
          </p>
        </div>
      ))}
      {cv.roles.map((role) => (
        <div key={role.id} className="contents">
          <p className="border-b border-[#cfcfcf] py-[0.42em] pr-[1em] text-right font-bold">
            {role.start.split(" ").at(-1)}
          </p>
          <p className="border-b border-[#cfcfcf] py-[0.42em]">
            Joined {role.employer} as {role.title}; {role.context}
          </p>
        </div>
      ))}
    </div>
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
          className="absolute inset-0 grid content-start overflow-hidden text-[#151515]"
          style={
            {
              boxSizing: "border-box",
              fontFamily: fontFamily(style),
              fontSize: pageFontSize(style),
              padding: pagePadding(style),
              gap: sectionGap(style),
              lineHeight: style.density === "expanded" ? 1.38 : 1.31,
              background: "#ffffff",
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
  const roles = cv.roles.slice(0, style.structure === "plain" ? 3 : 2);

  if (style.structure === "technical") {
    return (
      <Page cv={cv} style={style}>
        <Header cv={cv} style={style} />
        <PageSections
          cv={cv}
          style={style}
          sections={[
            {
              title: "Profile / operating scope",
              content: <p className="text-[0.82em] leading-[1.33]">{cv.profile}</p>,
            },
            {
              title: "Delivery record",
              content: (
                <Experience
                  cv={cv}
                  style={style}
                  roles={cv.roles.slice(0, 4)}
                  mode="ledger"
                />
              ),
            },
            {
              title: "System programs",
              content: <Projects cv={cv} variant="table" limit={5} />,
            },
            {
              title: "Technical matrix",
              content: <SkillsMatrix cv={cv} />,
            },
          ]}
        />
      </Page>
    );
  }

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
            content: (
              <Experience
                cv={cv}
                style={style}
                roles={roles}
                bulletLimit={style.structure === "plain" ? 3 : 2}
                mode={style.structure === "impact" ? "narrative" : "bullets"}
              />
            ),
          },
          {
            title: style.structure === "impact" ? "Selected impact cases" : "Selected projects",
            content: (
              <Projects
                cv={cv}
                variant={style.structure === "impact" ? "casebook" : "paragraph"}
                limit={style.structure === "impact" ? 4 : 3}
              />
            ),
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

  if (style.structure === "legal") {
    return (
      <>
        <Page cv={cv} style={style}>
          <Header cv={cv} style={style} />
          <PageSections
            cv={cv}
            style={style}
            sections={[
              {
                title: "Practice profile",
                content: <p className="text-[0.83em] leading-[1.34]">{cv.profile}</p>,
              },
              {
                title: "Counsel and policy experience",
                content: (
                  <Experience cv={cv} style={style} roles={firstRoles} mode="narrative" bulletLimit={2} />
                ),
              },
              {
                title: "Representative matters",
                content: <Projects cv={cv} variant="matter" limit={5} />,
              },
            ]}
          />
        </Page>
        <Page cv={cv} style={style} pageNumber={2}>
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Earlier appointments", content: <Experience cv={cv} style={style} roles={secondRoles} mode="ledger" /> },
              { title: "Education and admissions", content: <Education cv={cv} /> },
              { title: "Practice credentials", content: <CredentialFile cv={cv} /> },
              { title: "Publications and policy notes", content: <Publications cv={cv} /> },
            ]}
          />
        </Page>
      </>
    );
  }

  if (style.structure === "federal") {
    return (
      <>
        <Page cv={cv} style={style}>
          <Header cv={cv} style={style} />
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Specialized experience", content: <FederalNarratives cv={cv} /> },
              { title: "Training and certificates", content: <CredentialFile cv={cv} /> },
            ]}
          />
        </Page>
        <Page cv={cv} style={style} pageNumber={2}>
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Employment chronology", content: <Experience cv={cv} style={style} roles={cv.roles} mode="ledger" /> },
              { title: "Education", content: <Education cv={cv} /> },
              { title: "Awards", content: <Awards cv={cv} /> },
            ]}
          />
        </Page>
      </>
    );
  }

  if (style.structure === "rirekisho") {
    return (
      <>
        <Page cv={cv} style={style}>
          <Header cv={cv} style={style} />
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Profile", content: <p className="text-[0.82em] leading-[1.34]">{cv.profile}</p> },
              { title: "Education and employment history", content: <RirekishoTable cv={cv} /> },
            ]}
          />
        </Page>
        <Page cv={cv} style={style} pageNumber={2}>
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Qualifications", content: <CredentialFile cv={cv} /> },
              { title: "Reason for application", content: <Experience cv={cv} style={style} roles={firstRoles.slice(0, 2)} mode="narrative" bulletLimit={1} /> },
              { title: "Skills", content: <SkillsMatrix cv={cv} /> },
            ]}
          />
        </Page>
      </>
    );
  }

  if (style.structure === "structured" || style.structure === "clinical") {
    return (
      <>
        <Page cv={cv} style={style}>
          <Header cv={cv} style={style} />
          <PageSections
            cv={cv}
            style={style}
            sections={[
              {
                title: style.structure === "clinical" ? "Clinical profile" : "Personal profile",
                content: <p className="text-[0.83em] leading-[1.34]">{cv.profile}</p>,
              },
              {
                title: style.structure === "clinical" ? "Clinical appointments" : "Work experience",
                content: <Experience cv={cv} style={style} roles={firstRoles} mode="ledger" />,
              },
              {
                title: style.structure === "clinical" ? "Quality programs" : "Projects and mobility",
                content: <Projects cv={cv} variant="table" limit={5} />,
              },
            ]}
          />
        </Page>
        <Page cv={cv} style={style} pageNumber={2}>
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Education and training", content: <Education cv={cv} /> },
              { title: "Skills and qualifications", content: <CredentialFile cv={cv} /> },
              { title: "Recognition", content: <Awards cv={cv} /> },
            ]}
          />
        </Page>
      </>
    );
  }

  if (
    style.structure === "casebook" ||
    style.structure === "architecture" ||
    style.structure === "editorial"
  ) {
    return (
      <>
        <Page cv={cv} style={style}>
          <Header cv={cv} style={style} />
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Profile", content: <p className="text-[0.83em] leading-[1.34]">{cv.profile}</p> },
              {
                title:
                  style.structure === "architecture"
                    ? "Selected commissions"
                    : style.structure === "editorial"
                      ? "Selected work"
                      : "Case studies",
                content: (
                  <Projects
                    cv={cv}
                    variant={style.structure === "casebook" ? "casebook" : "table"}
                    limit={6}
                  />
                ),
              },
              { title: "Capability matrix", content: <SkillsMatrix cv={cv} /> },
            ]}
          />
        </Page>
        <Page cv={cv} style={style} pageNumber={2}>
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Experience", content: <Experience cv={cv} style={style} roles={cv.roles} mode={style.structure === "architecture" ? "ledger" : "narrative"} bulletLimit={2} /> },
              { title: "Education", content: <Education cv={cv} /> },
              { title: "Recognition", content: <Awards cv={cv} /> },
            ]}
          />
        </Page>
      </>
    );
  }

  if (style.structure === "executive" || style.structure === "grant" || style.structure === "teaching") {
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
                  style.structure === "executive"
                    ? "Executive profile"
                    : style.structure === "grant"
                      ? "Grants and program profile"
                      : "Teaching profile",
                content: <p className="text-[0.83em] leading-[1.34]">{cv.profile}</p>,
              },
              {
                title:
                  style.structure === "teaching"
                    ? "Teaching appointments"
                    : "Leadership mandates",
                content: <Experience cv={cv} style={style} roles={firstRoles} mode="narrative" bulletLimit={2} />,
              },
              {
                title:
                  style.structure === "grant"
                    ? "Funded programs"
                    : style.structure === "teaching"
                      ? "Curriculum and assessment work"
                      : "Board-level initiatives",
                content: <Projects cv={cv} variant="table" limit={5} />,
              },
            ]}
          />
        </Page>
        <Page cv={cv} style={style} pageNumber={2}>
          <PageSections
            cv={cv}
            style={style}
            sections={[
              { title: "Earlier record", content: <Experience cv={cv} style={style} roles={secondRoles} mode="ledger" /> },
              { title: "Education and credentials", content: <Education cv={cv} /> },
              { title: "Service and recognition", content: <Service cv={cv} /> },
              { title: "Skills", content: <SkillsMatrix cv={cv} /> },
            ]}
          />
        </Page>
      </>
    );
  }

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
              content: (
                <Experience cv={cv} style={style} roles={firstRoles} bulletLimit={2} mode="narrative" />
              ),
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
              content: (
                <Experience
                  cv={cv}
                  style={style}
                  roles={secondRoles}
                  bulletLimit={2}
                  mode="ledger"
                />
              ),
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
              content: (
                <Experience
                  cv={cv}
                  style={style}
                  roles={cv.roles.slice(0, 3)}
                  bulletLimit={2}
                  mode="narrative"
                />
              ),
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
              title: "Research programs and grants",
              content: <Projects cv={cv} variant="table" limit={6} />,
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
              content: <SkillsMatrix cv={cv} />,
            },
          ]}
        />
      </Page>
    </>
  );
}

function DocumentStack({ cv, style }: { cv: CvDocument; style: CvStyle }) {
  return (
    <div
      className="h-dvh snap-y snap-mandatory overflow-y-auto bg-white"
      style={{ scrollbarGutter: "stable both-edges" }}
    >
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
  const lastClientRef = useRef<{ x: number; y: number } | null>(null);
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
        Mouse X selects industry and style family. Mouse Y selects years of
        experience from 0 to 30. Current style is {style.label}. Current industry
        is {industries[parameters.industryIndex]?.label}.
      </div>
    </main>
  );
}
