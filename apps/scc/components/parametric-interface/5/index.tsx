"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { useLyricCue } from "../timeline/use-lyric-cue";
import styles from "./gmail.module.css";

type IconName =
  | "menu"
  | "search"
  | "tune"
  | "help"
  | "settings"
  | "apps"
  | "compose"
  | "inbox"
  | "star"
  | "snooze"
  | "send"
  | "draft"
  | "chevronDown"
  | "tag"
  | "plus"
  | "task"
  | "more"
  | "chevronLeft"
  | "chevronRight"
  | "calendar"
  | "keep"
  | "contacts"
  | "chat"
  | "meet"
  | "refresh";

type MailboxItem = {
  id: string;
  icon: IconName;
  label: string;
  count?: string;
  active?: boolean;
};

const primaryMailboxItems: readonly MailboxItem[] = [
  { id: "inbox", icon: "inbox", label: "Inbox", count: "22", active: true },
  { id: "starred", icon: "star", label: "Starred" },
  { id: "snoozed", icon: "snooze", label: "Snoozed" },
  { id: "sent", icon: "send", label: "Sent" },
  { id: "drafts", icon: "draft", label: "Drafts", count: "2" },
];

const labelItems = [
  { id: "important", label: "Important", marker: "#f4b400" },
  { id: "notes", label: "Notes", marker: "#34a853" },
  { id: "travel", label: "Travel", marker: "#4285f4" },
] as const;

type InboxThread = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
  starred?: boolean;
  label?: string;
};

const threadsBeforeLyric: readonly InboxThread[] = [
  { id: "strategy", sender: "Amara Lee", subject: "Re: Q3 launch estimates", preview: "I added the updated channel split and the revised burn assumptions.", time: "3:02 PM" },
  { id: "calendar", sender: "Google Calendar", subject: "Invitation: weekly planning", preview: "Monday, August 17 · 10:00 – 10:30 AM (KST)", time: "2:45 PM" },
  { id: "figma", sender: "Figma", subject: "You were mentioned in Checkout experience", preview: "Minseo: Could you look at the mobile confirmation state?", time: "2:19 PM" },
  { id: "docusign", sender: "DocuSign", subject: "Completed: Mutual NDA — Northline Studio", preview: "All parties have completed the document.", time: "1:54 PM" },
  { id: "slack", sender: "Slack", subject: "New mentions in #partnerships", preview: "You have 3 new mentions since your last visit.", time: "1:31 PM" },
  { id: "accounts", sender: "Accounts Team", subject: "ACTION REQUIRED: payment verification", preview: "Please confirm your account details to avoid service interruption.", time: "12:56 PM" },
  { id: "mira", sender: "Mira Patel", subject: "Notes from the supplier call", preview: "The minimum order and lead time are both workable for September.", time: "12:22 PM" },
  { id: "google", sender: "Google", subject: "Security alert", preview: "A new sign-in was detected on your Google Account.", time: "11:46 AM" },
  { id: "linear", sender: "Linear", subject: "Reader layout ready for review", preview: "A reviewer moved this issue to In review.", time: "11:10 AM" },
];

const threadsAfterLyric: readonly InboxThread[] = [
  { id: "shipping", sender: "Amazon Business", subject: "Your order has shipped", preview: "Your order for office supplies is on its way.", time: "10:42 AM" },
  { id: "newsletter", sender: "Medium Daily Digest", subject: "The stories you may have missed", preview: "A collection of recommendations from writers you follow.", time: "10:17 AM", label: "Updates" },
  { id: "rewards", sender: "Rewards Center", subject: "You have been selected for a $500 gift card", preview: "Claim your reward today. Limited availability.", time: "9:52 AM" },
  { id: "notion", sender: "Notion", subject: "Shared with you: August research notes", preview: "A collaborator invited you to view a page in Workspace.", time: "9:21 AM" },
  { id: "lucas", sender: "Lucas Chen", subject: "Invoice schedule for August", preview: "I have attached the dates we agreed in yesterday’s call.", time: "8:48 AM" },
  { id: "stripe", sender: "Stripe", subject: "Payout scheduled for Aug 15", preview: "A payout of ₩1,820,000 is scheduled for your bank account.", time: "8:02 AM" },
  { id: "team", sender: "Team Updates", subject: "Last chance: update your profile", preview: "Your profile will be removed unless you verify it now.", time: "7:35 AM" },
  { id: "travel", sender: "Korean Air", subject: "Your itinerary is ready", preview: "Seoul (ICN) to Tokyo (HND) · September 4.", time: "7:12 AM", label: "Travel" },
  { id: "wetransfer", sender: "WeTransfer", subject: "Files shared with you", preview: "A new transfer is available for download until August 22.", time: "6:50 AM" },
];

const arrivingMailTemplates: readonly Omit<InboxThread, "id" | "time">[] = [
  { sender: "Mina Park", subject: "Re: Site visit on Thursday", preview: "Thursday afternoon works for the full team.", label: "Updates" },
  { sender: "Asana", subject: "Task assigned to you: Confirm production timeline", preview: "Due tomorrow · Project: Installation launch" },
  { sender: "Hotel L7", subject: "Your reservation is confirmed", preview: "Confirmation number 842719 · Check-in September 4." },
  { sender: "Workspace Admin", subject: "Storage report for August", preview: "Your organization is using 71% of available storage." },
  { sender: "Invoice Desk", subject: "Final notice: open balance remains", preview: "Review your invoice immediately to prevent restrictions." },
  { sender: "Studio Archive", subject: "Reference images for the catalog", preview: "The final selection is now in the shared folder." },
  { sender: "Dropbox", subject: "New files added to Shared work", preview: "Seven files were added to the shared folder." },
  { sender: "The Design Desk", subject: "Your weekly brief", preview: "Three field notes, two essays, and an open call." },
] as const;

const initialInboxThreads = [...threadsBeforeLyric, ...threadsAfterLyric];

function AppIcon({ name }: { name: IconName }) {
  const props = {
    "aria-hidden": true,
    fill: "none",
    focusable: false,
    viewBox: "0 0 24 24",
  } as const;

  switch (name) {
    case "menu": return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18" /></svg>;
    case "search": return <svg {...props}><circle cx="10.8" cy="10.8" r="6.1" /><path d="m16 16 4.2 4.2" /></svg>;
    case "tune": return <svg {...props}><path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h3M11 12h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="9" cy="17" r="2" /></svg>;
    case "help": return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 1 1 4.18 1.82c-1.36 1.16-1.88 1.63-1.88 3.18M12 17.25h.01" /></svg>;
    case "settings": return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.07.07-2.11 2.11-.07-.07a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3v-.1A1.7 1.7 0 0 0 10.69 18.65a1.7 1.7 0 0 0-1.88.34l-.07.07-2.11-2.11.07-.07A1.7 1.7 0 0 0 7.04 15a1.7 1.7 0 0 0-1.56-1.03h-.1v-3h.1A1.7 1.7 0 0 0 7.04 9.94a1.7 1.7 0 0 0-.34-1.88l-.07-.07 2.11-2.11.07.07a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.1h3v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.07-.07 2.11 2.11-.07.07a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z" /></svg>;
    case "apps": return <svg {...props}><circle cx="5" cy="5" r="1.25" fill="currentColor" /><circle cx="12" cy="5" r="1.25" fill="currentColor" /><circle cx="19" cy="5" r="1.25" fill="currentColor" /><circle cx="5" cy="12" r="1.25" fill="currentColor" /><circle cx="12" cy="12" r="1.25" fill="currentColor" /><circle cx="19" cy="12" r="1.25" fill="currentColor" /><circle cx="5" cy="19" r="1.25" fill="currentColor" /><circle cx="12" cy="19" r="1.25" fill="currentColor" /><circle cx="19" cy="19" r="1.25" fill="currentColor" /></svg>;
    case "compose": return <svg {...props}><path d="M4 16.6V20h3.4L18.2 9.2l-3.4-3.4L4 16.6Z" /><path d="m12.9 7.7 3.4 3.4M17.2 6.8l.9-.9a1.2 1.2 0 0 0 0-1.7l-.3-.3a1.2 1.2 0 0 0-1.7 0l-.9.9" /></svg>;
    case "inbox": return <svg {...props}><path d="M4 5.5h16v13H4z" /><path d="M4 14h4.3l1.2 2h5l1.2-2H20" /></svg>;
    case "star": return <svg {...props}><path d="m12 3.6 2.55 5.15 5.69.83-4.12 4.02.97 5.67L12 16.6l-5.09 2.67.97-5.67-4.12-4.02 5.69-.83L12 3.6Z" /></svg>;
    case "snooze": return <svg {...props}><circle cx="12" cy="12" r="7.5" /><path d="M12 8v4.6l3.1 1.8M5 3.8 3.7 5.1M19 3.8l1.3 1.3" /></svg>;
    case "send": return <svg {...props}><path d="m3.7 4.2 16.1 7.1-16.1 2.7 5.1 1.8-5.1 4.1V4.2Z" /><path d="M8.8 15.8 12 12" /></svg>;
    case "draft": return <svg {...props}><path d="M6 3.8h8.8L19 8v12.2H6z" /><path d="M14.8 3.8V8H19M9 12h7M9 15.5h7" /></svg>;
    case "chevronDown": return <svg {...props}><path d="m7.5 9.5 4.5 4.5 4.5-4.5" /></svg>;
    case "tag": return <svg {...props}><path d="M3.7 5.2V12l7.1 7.1a1.8 1.8 0 0 0 2.5 0l5.8-5.8a1.8 1.8 0 0 0 0-2.5L12 3.7H5.2a1.5 1.5 0 0 0-1.5 1.5Z" /><circle cx="7.6" cy="7.6" fill="currentColor" r="1" stroke="none" /></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "task": return <svg {...props}><path d="M5 5.5h10.5V19H5zM8 3.5h10.5V17M7.4 11.4l1.6 1.6 3.2-3.2" /></svg>;
    case "more": return <svg {...props}><circle cx="12" cy="5" r="1.35" fill="currentColor" /><circle cx="12" cy="12" r="1.35" fill="currentColor" /><circle cx="12" cy="19" r="1.35" fill="currentColor" /></svg>;
    case "chevronLeft": return <svg {...props}><path d="m14.5 6.5-5 5.5 5 5.5" /></svg>;
    case "chevronRight": return <svg {...props}><path d="m9.5 6.5 5 5.5-5 5.5" /></svg>;
    case "calendar": return <svg {...props}><rect x="4.5" y="5.5" width="15" height="14" rx="1.2" /><path d="M8 3.5v4M16 3.5v4M4.5 9h15M8 12h2.1v2H8zM13.9 12H16v2h-2.1zM8 15.5h2.1v2H8z" /></svg>;
    case "keep": return <svg {...props}><path d="M6.5 9.2a5.5 5.5 0 0 1 11 0c0 2.5-1.3 3.8-2.3 4.8l-.7 2.5H9.5L8.8 14C7.8 13 6.5 11.7 6.5 9.2Z" /><path d="M9.5 19h5" /></svg>;
    case "contacts": return <svg {...props}><circle cx="12" cy="8" r="3" /><path d="M5.5 19c.6-3.1 2.7-5 6.5-5s5.9 1.9 6.5 5" /></svg>;
    case "chat": return <svg {...props}><path d="M5 5.5h14v10H9.2L5 18.8V5.5Z" /><path d="M8.5 10.5h7" /></svg>;
    case "meet": return <svg {...props}><rect x="4" y="6.5" width="11.5" height="11" rx="1.5" /><path d="m15.5 10 4.5-2.5v9l-4.5-2.5" /></svg>;
    case "refresh": return <svg {...props}><path d="M19.2 8A7.7 7.7 0 1 0 20 13.2M19.2 4.5V8h-3.5" /></svg>;
  }
}

function GmailMark() {
  return (
    <svg aria-label="Gmail" className={styles.gmailMark} role="img" viewBox="0 0 150 40">
      <path d="M3 34V7.8L18.6 19.5 27 13.2 35.4 19.5 51 7.8V34H40V16.8L27 26.4 14 16.8V34H3Z" fill="#ea4335" />
      <path d="M3 7.8 14 16.8V34H3V7.8Z" fill="#c5221f" />
      <path d="m14 16.8 13 9.6v10.1L14 27.2V16.8Z" fill="#fbbc04" />
      <path d="m40 16.8 11-9V34H40V16.8Z" fill="#4285f4" />
      <path d="m27 26.4 13-9v16.6L27 26.4Z" fill="#34a853" />
      <text fill="#5f6368" fontFamily="Arial, sans-serif" fontSize="20" x="61" y="27">Gmail</text>
    </svg>
  );
}

function IconButton({ label, name, className }: { label: string; name: IconName; className?: string }) {
  return <button aria-label={label} className={[styles.iconButton, className].filter(Boolean).join(" ")} type="button"><AppIcon name={name} /></button>;
}

export default function ParametricInterfaceFive({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <GmailLyricInbox />
    </SongPlayback>
  );
}

function GmailLyricInbox() {
  const { hasStarted, lyricCues, reducedMotion, wordIndex, wordTimings } = useLyricCue();
  const [arrivingThreads, setArrivingThreads] = useState<InboxThread[]>([]);
  const arrivalStepRef = useRef(0);

  const lyricThreads = useMemo(() => {
    if (!hasStarted || reducedMotion) return [];

    return wordTimings
      .slice(0, wordIndex + 1)
      .map((timing, index) => ({
        id: `lyric-arrival-${index}`,
        sender: "SIGNALS WE KEEP",
        subject: timing.word.toUpperCase(),
        preview: lyricCues[timing.cueIndex]!.join(" ").toUpperCase(),
        time: "now",
        unread: index === wordIndex,
        starred: true,
      }))
      .reverse();
  }, [hasStarted, lyricCues, reducedMotion, wordIndex, wordTimings]);

  useEffect(() => {
    if (!hasStarted || reducedMotion) return;
    let timeout: number;
    const scheduleNextArrival = () => {
      const delay = 600 + Math.round(Math.random() * 720);
      timeout = window.setTimeout(() => {
        arrivalStepRef.current += 1;
        const step = arrivalStepRef.current;
        const template = arrivingMailTemplates[(step - 1) % arrivingMailTemplates.length]!;
        const nextThread: InboxThread = {
          ...template,
          id: `arrival-${step}`,
          time: "now",
          unread: false,
        };
        setArrivingThreads((current) => [nextThread, ...current].slice(0, 240));
        scheduleNextArrival();
      }, delay);
    };

    scheduleNextArrival();
    return () => window.clearTimeout(timeout);
  }, [hasStarted, reducedMotion]);

  return (
    <main className={styles.gmail}>
      <header className={styles.topbar}>
        <div className={styles.brandCluster}><IconButton label="Main menu" name="menu" /><GmailMark /></div>
        <div className={styles.searchBox} role="search"><AppIcon name="search" /><span>Search mail</span><button aria-label="Show search options" type="button"><AppIcon name="tune" /></button></div>
        <div className={styles.headerActions}><button aria-label="Set status" className={styles.presence} type="button"><i /><AppIcon name="chevronDown" /></button><IconButton label="Support" name="help" /><IconButton label="Settings" name="settings" /><button aria-label="Gemini" className={styles.gemini} type="button">✦</button><IconButton label="Google apps" name="apps" /><button aria-label="Google Account: Jules" className={styles.account} type="button"><span>Google</span><i>J</i></button></div>
      </header>

      <div className={styles.application}>
        <aside aria-label="Google Workspace" className={styles.appRail}>
          <button className={styles.activeApp} type="button"><span className={styles.mailBadge}>1</span><AppIcon name="inbox" /><small>Mail</small></button>
          <button type="button"><AppIcon name="chat" /><small>Chat</small></button>
          <button type="button"><AppIcon name="meet" /><small>Meet</small></button>
        </aside>
        <nav aria-label="Mail folders" className={styles.navigation}>
          <button className={styles.compose} type="button"><AppIcon name="compose" /><span>Compose</span></button>
          <div className={styles.mailboxList}>
            {primaryMailboxItems.map((item) => <button className={item.active ? styles.activeMailbox : undefined} key={item.id} type="button"><AppIcon name={item.icon} /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}
            <button type="button"><AppIcon name="chevronDown" /><span>More</span></button>
          </div>
          <div className={styles.labelHeading}><span>Labels</span><IconButton label="Create new label" name="plus" /></div>
          <div className={styles.labelList}>{labelItems.map((item) => <button key={item.id} type="button"><i style={{ backgroundColor: item.marker }} /><span>{item.label}</span></button>)}</div>
          <div className={styles.navigationBottom}><button type="button"><span className={styles.meetMark}>⌁</span><span>Meet</span></button><button type="button"><AppIcon name="calendar" /><span>New meeting</span></button></div>
        </nav>

        <section aria-label="Inbox" className={styles.mailPane}>
          <div className={styles.messageToolbar}>
            <div className={styles.toolGroup}><label aria-label="Select all" className={styles.selectBox}><input type="checkbox" /><i /></label><IconButton label="Refresh" name="refresh" /><IconButton label="More" name="more" /></div>
            <div className={styles.pager}><span>1–50 of 237</span><IconButton label="Newer" name="chevronLeft" /><IconButton label="Older" name="chevronRight" /></div>
          </div>
          <div className={styles.categoryTabs} role="tablist"><button aria-selected="true" role="tab" type="button"><AppIcon name="inbox" /><span>Primary</span></button><button role="tab" type="button"><AppIcon name="tag" /><span>Promotions</span></button><button role="tab" type="button"><AppIcon name="contacts" /><span>Social</span></button><button role="tab" type="button"><AppIcon name="help" /><span>Updates</span><em>4 new</em></button></div>
          <div aria-label="Message list" className={styles.threadList} role="list">
            {lyricThreads.map((thread) => <InboxThreadRow isArriving key={thread.id} thread={thread} />)}
            {arrivingThreads.map((thread) => <InboxThreadRow isArriving key={thread.id} thread={thread} />)}
            {initialInboxThreads.map((thread) => <InboxThreadRow key={thread.id} thread={thread} />)}
          </div>
        </section>

        <aside aria-label="Google Workspace side panel" className={styles.sidePanel}>
          <IconButton label="Calendar" name="calendar" /><IconButton label="Keep" name="keep" /><IconButton label="Tasks" name="task" /><IconButton label="Contacts" name="contacts" /><span className={styles.sideRule} /><IconButton label="Get add-ons" name="plus" /><button aria-label="Hide side panel" className={styles.sideCollapse} type="button"><AppIcon name="chevronRight" /></button>
        </aside>
      </div>
    </main>
  );
}

function InboxThreadRow({ isArriving = false, thread }: { isArriving?: boolean; thread: InboxThread }) {
  return (
    <article className={`${styles.thread}${thread.unread ? ` ${styles.unreadThread}` : ""}${isArriving ? ` ${styles.arrivingThread}` : ""}`} role="listitem">
      <label aria-label={`Select ${thread.subject}`}><input type="checkbox" /><i /></label>
      <button aria-label={`Star ${thread.subject}`} className={`${styles.threadStar}${thread.starred ? ` ${styles.starred}` : ""}`} type="button"><AppIcon name="star" /></button>
      <strong className={styles.threadSender}>{thread.sender}</strong>
      <div className={styles.threadSummary}><b>{thread.subject}</b>{thread.label ? <em>{thread.label}</em> : null}{thread.preview ? <span> — {thread.preview}</span> : null}</div>
      <time>{thread.time}</time>
    </article>
  );
}
