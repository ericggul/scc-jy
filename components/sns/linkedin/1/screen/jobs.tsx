import { ChangeEvent, UIEvent, useEffect, useMemo, useState } from "react";
import { linkedinJobs } from "../model/jobs.generated";
import type { LinkedinJob } from "../model/job-types";
import { LinkedinIcon } from "./icons";
import styles from "./linkedin.module.css";

type SortMode = "Most relevant" | "Most recent";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function seniorityFor(job: LinkedinJob) {
  const title = job.title.toLowerCase();
  if (/(intern|apprentice|graduate)/.test(title)) return "Internship";
  if (/(vp|vice president|director|head of)/.test(title)) return "Director";
  if (/(principal|staff|senior|lead|manager)/.test(title)) return "Mid-Senior level";
  if (/(associate|analyst|specialist)/.test(title)) return "Associate";
  return null;
}

function companyJobsUrl(company: string) {
  return company === "Figma" ? "https://boards.greenhouse.io/figma" : "https://stripe.com/jobs";
}

function CompanyMark({ company }: { company: string }) {
  return <span aria-hidden="true" className={`${styles.companyMark} ${company === "Figma" ? styles.figmaMark : styles.stripeMark}`}>{company === "Figma" ? "F" : "S"}</span>;
}

function JobListItem({
  job,
  onChoose,
  saved,
  selected,
}: {
  job: LinkedinJob;
  onChoose: () => void;
  saved: boolean;
  selected: boolean;
}) {
  return <button aria-current={selected ? "true" : undefined} className={`${styles.jobListItem} ${selected ? styles.selectedJob : ""}`} onClick={onChoose} type="button"><CompanyMark company={job.company} /><span className={styles.jobListCopy}><strong>{job.title}</strong><b>{job.company}</b><em>{job.location} · {job.workplace}</em><small>Listed {shortDate(job.postedAt)} · {job.employment}</small></span>{saved ? <LinkedinIcon className={styles.savedMark} name="bookmark" solid /> : null}</button>;
}

function JobDetail({
  job,
  onBack,
  onSave,
  saved,
}: {
  job: LinkedinJob;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const seniority = seniorityFor(job);
  return <article className={styles.jobDetail}>
    <button aria-label="Back to jobs" className={styles.mobileJobBack} onClick={onBack} type="button">‹</button>
    <div className={styles.jobDetailHero}><CompanyMark company={job.company} /><div><h1>{job.title}</h1><strong>{job.company}</strong><p>{job.location} · {job.workplace} · {job.employment}</p><small>Listed {shortDate(job.postedAt)}</small></div></div>
    <div className={styles.jobDetailActions}><a href={job.applicationUrl} rel="noreferrer" target="_blank">Apply</a><button aria-label={saved ? "Remove saved job" : "Save job"} className={saved ? styles.detailSaved : ""} onClick={onSave} type="button"><LinkedinIcon name="bookmark" solid={saved} /></button></div>
    <section className={styles.aboutJob}><h2>About the role</h2><p>{job.company} is hiring for {job.title} in {job.team}. Review the full requirements and application questions on the company careers site.</p></section>
    <section className={styles.jobDetails}><h2>Job details</h2>{seniority ? <div><LinkedinIcon name="briefcase" /><span><small>Seniority level</small><b>{seniority}</b></span></div> : null}<div><LinkedinIcon name="briefcase" /><span><small>Employment type</small><b>{job.employment}</b></span></div><div><LinkedinIcon name="location" /><span><small>Job function</small><b>{job.team}</b></span></div><div><LinkedinIcon name="location" /><span><small>Workplace type</small><b>{job.workplace}</b></span></div></section>
    <section className={styles.companyDetail}><CompanyMark company={job.company} /><div><h2>{job.company}</h2><p>Company careers</p><a href={companyJobsUrl(job.company)} rel="noreferrer" target="_blank">See all jobs</a></div></section>
  </article>;
}

export function LinkedinJobsScreen({
  onQueryChange,
  onToast,
  query,
}: {
  onQueryChange: (value: string) => void;
  onToast: (message: string) => void;
  query: string;
}) {
  const [location, setLocation] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("Most relevant");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [alertOn, setAlertOn] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState(linkedinJobs[0]?.id ?? "");
  const [visibleCount, setVisibleCount] = useState(24);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const results = useMemo(() => {
    const titleQuery = query.trim().toLowerCase();
    const locationQuery = location.trim().toLowerCase();
    const filtered = linkedinJobs.filter((job) => {
      const matchesTitle = !titleQuery || `${job.title} ${job.company} ${job.team}`.toLowerCase().includes(titleQuery);
      const matchesLocation = !locationQuery || job.location.toLowerCase().includes(locationQuery);
      return matchesTitle && matchesLocation && (!remoteOnly || job.workplace === "Remote");
    });
    return sortMode === "Most recent" ? [...filtered].sort((a, b) => b.postedAt.localeCompare(a.postedAt)) : filtered;
  }, [location, query, remoteOnly, sortMode]);

  const selected = results.find((job) => job.id === selectedId) ?? results[0];
  const visibleJobs = results.slice(0, visibleCount);

  useEffect(() => {
    const extendMobileList = () => {
      if (window.innerWidth > 760) return;
      if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 900) {
        setVisibleCount((count) => Math.min(results.length, count + 24));
      }
    };
    window.addEventListener("scroll", extendMobileList, { passive: true });
    return () => window.removeEventListener("scroll", extendMobileList);
  }, [results.length]);

  function selectJob(job: LinkedinJob) {
    setSelectedId(job.id);
    setMobileDetailOpen(true);
  }

  function handleListScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 620) {
      setVisibleCount((count) => Math.min(results.length, count + 24));
    }
  }

  function toggleSaved() {
    if (!selected) return;
    setSaved((current) => ({ ...current, [selected.id]: !current[selected.id] }));
    onToast(saved[selected.id] ? "Job removed from saved jobs" : "Job saved to your tracker");
  }

  function updateQuery(event: ChangeEvent<HTMLInputElement>) {
    onQueryChange(event.target.value);
    setVisibleCount(24);
  }

  return <main className={`${styles.jobsShell} ${mobileDetailOpen ? styles.mobileJobDetailOpen : ""}`}>
    <section className={styles.jobsSearchHeader}>
      <div className={styles.jobsSearchFields}><label><LinkedinIcon name="search" /><input aria-label="Search jobs" onChange={updateQuery} placeholder="Search by title, skill, or company" value={query} /></label><label><LinkedinIcon name="location" /><input aria-label="Search location" onChange={(event) => { setLocation(event.target.value); setVisibleCount(24); }} placeholder="City, state, or country" value={location} /></label><button onClick={() => onToast(`${results.length} roles found`)} type="button">Search</button></div>
      <div className={styles.jobFilterRail}><button type="button">Date posted <LinkedinIcon name="chevron" /></button><button type="button">Experience level <LinkedinIcon name="chevron" /></button><button type="button">Company <LinkedinIcon name="chevron" /></button><button aria-pressed={remoteOnly} className={remoteOnly ? styles.selectedJobFilter : ""} onClick={() => { setRemoteOnly((value) => !value); setVisibleCount(24); }} type="button">Remote</button><button type="button">Easy Apply</button><button className={styles.allFilters} type="button"><LinkedinIcon name="sliders" /> All filters</button></div>
    </section>
    <div className={styles.jobsWorkspace}>
      <aside className={styles.jobsSideRail}><section className={styles.jobsRailCard}><h2>Jobs</h2><button className={styles.jobsRailActive} type="button"><LinkedinIcon name="briefcase" /> Jobs</button><button type="button"><LinkedinIcon name="bookmark" /> My jobs</button><button type="button"><LinkedinIcon name="location" /> Preferences</button></section><section className={styles.jobsRailCard}><strong>Job seeker guidance</strong><button type="button">Interview prep</button><button type="button">Resume building</button><button type="button">Salary insights</button></section></aside>
      <section className={styles.jobsResults}><header><div><h1>Jobs for you</h1><p>{results.length.toLocaleString()} results</p></div><label className={styles.jobAlert}><span>Set alert</span><input checked={alertOn} onChange={(event) => { setAlertOn(event.target.checked); onToast(event.target.checked ? "Job alert created" : "Job alert paused"); }} type="checkbox" /><i /></label></header><div className={styles.jobSort}><span>Based on your profile and preferences</span><button onClick={() => setSortMode((value) => value === "Most relevant" ? "Most recent" : "Most relevant")} type="button">Sort by: <b>{sortMode}</b> <LinkedinIcon name="chevron" /></button></div><div className={styles.jobList} onScroll={handleListScroll}>{visibleJobs.map((job) => <JobListItem job={job} key={job.id} onChoose={() => selectJob(job)} saved={Boolean(saved[job.id])} selected={job.id === selected?.id} />)}{!visibleJobs.length ? <div className={styles.emptyJobs}><strong>No jobs match this search</strong><span>Try a broader title, company, or location.</span></div> : null}{visibleJobs.length < results.length ? <div className={styles.loadingJobs}>Loading more jobs</div> : null}</div></section>
      {selected ? <JobDetail job={selected} onBack={() => setMobileDetailOpen(false)} onSave={toggleSaved} saved={Boolean(saved[selected.id])} /> : <section className={styles.jobDetail}><div className={styles.emptyJobs}><strong>Select a job to view details</strong><span>Job details will open here.</span></div></section>}
    </div>
  </main>;
}
