import React from 'react';
import {
  ShieldCheck,
  FileText,
  Copyright,
  Cookie,
  AlertTriangle,
  ArrowLeft,
  Mail,
  CheckCircle2,
} from 'lucide-react';

export type LegalRoute = 'privacy' | 'terms' | 'dmca' | 'cookies' | 'disclaimer';

interface LegalPageViewProps {
  route: LegalRoute;
  onNavigateHome: () => void;
  onNavigateRoute: (route: LegalRoute) => void;
}

export const LegalPageView: React.FC<LegalPageViewProps> = ({
  route,
  onNavigateHome,
  onNavigateRoute,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-slide-up">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer min-h-[36px] w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Downloader</span>
        </button>

        {/* Quick switcher among legal documents */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => onNavigateRoute('privacy')}
            className={`px-2.5 py-1 rounded-lg transition active:scale-95 duration-150 cursor-pointer ${
              route === 'privacy'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium'
                : 'hover:text-slate-200'
            }`}
          >
            Privacy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateRoute('terms')}
            className={`px-2.5 py-1 rounded-lg transition active:scale-95 duration-150 cursor-pointer ${
              route === 'terms'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium'
                : 'hover:text-slate-200'
            }`}
          >
            Terms
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateRoute('dmca')}
            className={`px-2.5 py-1 rounded-lg transition active:scale-95 duration-150 cursor-pointer ${
              route === 'dmca'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium'
                : 'hover:text-slate-200'
            }`}
          >
            DMCA
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateRoute('cookies')}
            className={`px-2.5 py-1 rounded-lg transition active:scale-95 duration-150 cursor-pointer ${
              route === 'cookies'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium'
                : 'hover:text-slate-200'
            }`}
          >
            Cookies
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateRoute('disclaimer')}
            className={`px-2.5 py-1 rounded-lg transition active:scale-95 duration-150 cursor-pointer ${
              route === 'disclaimer'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium'
                : 'hover:text-slate-200'
            }`}
          >
            Disclaimer
          </button>
        </div>
      </div>

      {/* Main Document Content */}
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#13192f] to-[#0c1020] border border-indigo-500/25 p-4 sm:p-8 md:p-10 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-8">
          {route === 'privacy' && <PrivacyPolicyContent />}
          {route === 'terms' && <TermsOfServiceContent />}
          {route === 'dmca' && <DmcaPolicyContent />}
          {route === 'cookies' && <CookiePolicyContent />}
          {route === 'disclaimer' && <DisclaimerContent />}
        </div>
      </article>

      {/* Contact & Configuration Notice */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Legal & Inquiries Contact:{' '}
            <span className="font-mono text-slate-200 break-all">ytdownloads.support@gmail.com</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================== */
/* 1. PRIVACY POLICY CONTENT                                                  */
/* ========================================================================== */
function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data Protection & Privacy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">Last Updated: September 2026</p>
      </div>

      <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs sm:text-sm text-indigo-200">
        <strong>Privacy Commitment:</strong> YTdownloader operates on a stateless, minimal-processing
        architecture. We do not require user registrations, we do not store personal profiles, and we
        do not retain converted media files on server storage.
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">1. Information We Process</h2>
        <p className="text-sm leading-relaxed">
          When you utilize YTdownloader, we process only the technical information strictly necessary
          to deliver the requested media conversion and download functionality:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li>
            <strong>Submitted URLs:</strong> The YouTube video, Short, or playlist link you enter in
            the search input. This URL is parsed solely to query metadata and fetch the media stream.
          </li>
          <li>
            <strong>Selected Format & Quality:</strong> The requested resolution (e.g., 1080p, 720p)
            or audio-only preference.
          </li>
          <li>
            <strong>Technical Connection Data:</strong> Your IP address is processed in volatile
            memory by our rate-limiting middleware to defend against denial-of-service (DoS) attacks
            and infrastructure abuse. Standard HTTP request headers (such as User-Agent) are processed
            by the web server to negotiate connection standards.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">2. Ephemeral Storage & Data Retention</h2>
        <p className="text-sm leading-relaxed">
          All download processing is ephemeral. When you initiate a download:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li>
            Media files are written to isolated, randomized temporary directories (e.g.,{' '}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-purple-300">
              temp_downloads/
            </code>
            ) on the server host.
          </li>
          <li>
            <strong>Automatic Purge:</strong> Finished files and temporary directories are
            automatically scheduled for deletion immediately following client delivery or after a
            brief grace window (5 minutes by default).
          </li>
          <li>
            <strong>Restart Purge:</strong> Any remaining temporary directories are completely wiped
            upon application startup or container restart.
          </li>
          <li>
            We maintain <strong>no permanent databases</strong> of downloaded files, conversion
            histories, or user IP addresses.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">3. Third-Party Interactions</h2>
        <p className="text-sm leading-relaxed">
          To perform media analysis and stream extraction, YTdownloader communicates directly with
          YouTube's public endpoints using standard open-source extraction tools (<code className="text-xs bg-slate-800 px-1 rounded">yt-dlp</code>).
          We do not sell, rent, monetize, or disclose your queries to third-party data brokers or marketing
          networks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4. Cookies & Local Storage</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader does <strong>not</strong> use tracking cookies, advertising beacons, persistent
          browser identifiers, or analytics trackers. For complete details, refer to our{' '}
          <span className="text-indigo-400 font-medium">Cookie Policy</span>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">5. Security Practices</h2>
        <p className="text-sm leading-relaxed">
          We employ industry-standard defenses to safeguard our service and infrastructure, including
          strict URL validation, UUID format enforcement, path traversal defenses, Helmet HTTP security
          headers, process execution sandboxing, and automated rate-limiting.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">6. Your Rights & Data Deletion</h2>
        <p className="text-sm leading-relaxed">
          Because we do not collect personal identities, user accounts, or persistent records, there is
          no user profile data to inspect, rectify, or export. Any temporary conversion data is erased
          automatically within minutes of creation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">7. Policy Changes & Contact</h2>
        <p className="text-sm leading-relaxed">
          We may update this Privacy Policy periodically to reflect technical or legal improvements.
          Continued use of YTdownloader after any modifications signifies acceptance of the updated
          terms. For privacy inquiries, please contact:{' '}
          <span className="font-mono text-indigo-300">[privacy@ytdownloader.example]</span>.
        </p>
      </section>
    </div>
  );
}

/* ========================================================================== */
/* 2. TERMS OF SERVICE CONTENT                                                */
/* ========================================================================== */
function TermsOfServiceContent() {
  return (
    <div className="space-y-6 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400">Last Updated: September 2026</p>
      </div>

      <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs sm:text-sm text-blue-200">
        <strong>Important Notice:</strong> By accessing or using YTdownloader, you acknowledge that
        you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree,
        you must discontinue use immediately.
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">1. Authorized Purpose & Permitted Use</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader is developed solely as a technical utility for personal archiving, educational
          research, time-shifting, and offline accessibility of content that:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li>You own or hold explicit copyright authority over; or</li>
          <li>Is distributed under an open Creative Commons or public domain license; or</li>
          <li>You have express written permission from the copyright owner to download.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">2. User Responsibility & Copyright Compliance</h2>
        <p className="text-sm leading-relaxed">
          You bear <strong>sole and exclusive responsibility</strong> for determining whether your
          download and use of any YouTube video or audio content complies with applicable local
          copyright laws, international treaties, and YouTube's Terms of Service.
        </p>
        <p className="text-sm leading-relaxed">
          YTdownloader does not monitor, endorse, preview, or curate user-submitted URLs. We expressly
          disclaim any liability arising from copyright infringement committed by users of this
          service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">3. Intellectual Property & No Ownership Claim</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader does <strong>not</strong> claim ownership, licensing rights, or intellectual
          property over any third-party video, audio, or metadata processed through the application.
          All trademarks, logos, video titles, and media assets remain the sole property of their
          respective owners.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4. Prohibited Activities</h2>
        <p className="text-sm leading-relaxed">You agree not to use YTdownloader to:</p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li>Download copyrighted media without authorization or redistribution permissions;</li>
          <li>Attempt to circumvent Digital Rights Management (DRM), access control ciphers, or platform paywalls;</li>
          <li>Perform automated scraping, high-frequency flooding, or denial-of-service attacks against our servers;</li>
          <li>Redistribute, commercially exploit, or resell downloaded media without license;</li>
          <li>Inject malicious code, commands, or exploits into API parameters.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">5. Service Availability & Warranties</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong>{' '}
          basis without warranties of any kind, whether express or implied. We do not warrant that the
          service will be uninterrupted, error-free, compatible with all video formats, or resilient to
          upstream platform changes by YouTube.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">6. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed">
          To the maximum extent permitted by law, the operators and contributors of YTdownloader shall
          not be held liable for any direct, indirect, incidental, consequential, or punitive damages
          resulting from your access to, use of, or inability to use this service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">7. Termination & Amendments</h2>
        <p className="text-sm leading-relaxed">
          We reserve the right to restrict access, apply rate limits, or terminate service to any user
          who violates these Terms. These Terms may be updated at any time, with revisions published on
          this page.
        </p>
      </section>
    </div>
  );
}

/* ========================================================================== */
/* 3. DMCA / COPYRIGHT POLICY CONTENT                                         */
/* ========================================================================== */
function DmcaPolicyContent() {
  return (
    <div className="space-y-6 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          <Copyright className="w-3.5 h-3.5" />
          <span>Intellectual Property Protection</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          DMCA & Copyright Policy
        </h1>
        <p className="text-xs text-slate-400">Last Updated: September 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">1. Respect for Copyright Holders</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader fully respects the intellectual property rights of artists, creators, and
          publishers. It is our policy to respond expeditiously to legitimate notices of alleged
          infringement in compliance with the Digital Millennium Copyright Act (17 U.S.C. § 512) and
          applicable international copyright statutes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">2. Technical Nature of Our Service</h2>
        <p className="text-sm leading-relaxed">
          Please note the following technical characteristics regarding how YTdownloader operates:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li>
            <strong>Ephemeral Processing:</strong> YTdownloader is a client-directed conversion proxy.
            We do not maintain a permanent video hosting service, a public media index, or an archive
            of converted files.
          </li>
          <li>
            <strong>Source Platform:</strong> All content is hosted directly on YouTube. Disabling or
            removing content from the source YouTube channel will prevent any further downloads via our
            tool.
          </li>
          <li>
            <strong>No DRM Circumvention:</strong> We do not defeat, bypass, or crack DRM-encrypted or
            paywalled media.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">3. Filing a Takedown Notice</h2>
        <p className="text-sm leading-relaxed">
          If you are a copyright owner or an authorized agent and believe that content accessible
          through our service infringes your rights, please submit a formal written notice containing:
        </p>
        <ol className="list-decimal list-inside text-sm space-y-2 pl-2 text-slate-300">
          <li>A physical or electronic signature of the authorized copyright holder;</li>
          <li>Identification of the copyrighted work claimed to have been infringed;</li>
          <li>
            The exact YouTube URL(s) or identifying link(s) subject to the claim;
          </li>
          <li>Your contact information (name, mailing address, telephone number, and email address);</li>
          <li>
            A statement that you have a good-faith belief that the use is not authorized by the copyright
            owner, its agent, or the law;
          </li>
          <li>
            A statement made under penalty of perjury that the information in the notification is accurate
            and that you are authorized to act on behalf of the owner.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4. Designated Copyright Contact</h2>
        <p className="text-sm leading-relaxed">
          Please direct copyright and DMCA correspondence to our designated contact address:
        </p>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-indigo-300 space-y-1">
          <p><strong>Designated DMCA Agent:</strong> Legal & Copyright Inquiries</p>
          <p><strong>Email:</strong> [dmca@ytdownloader.example]</p>
          <p className="text-slate-400 text-[11px] pt-1">
            * Note: To prevent spam and maintain transparency, please include "DMCA Takedown Request" in the subject line.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">5. Counter-Notification Procedure</h2>
        <p className="text-sm leading-relaxed">
          If a user believes that their download request was wrongfully blocked or subject to a mistaken
          infringement claim, they may submit a counter-notification complying with 17 U.S.C. § 512(g)(3).
        </p>
      </section>
    </div>
  );
}

/* ========================================================================== */
/* 4. COOKIE POLICY CONTENT                                                   */
/* ========================================================================== */
function CookiePolicyContent() {
  return (
    <div className="space-y-6 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <Cookie className="w-3.5 h-3.5" />
          <span>Tracking & Storage Disclosure</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Cookie Policy
        </h1>
        <p className="text-xs text-slate-400">Last Updated: September 2026</p>
      </div>

      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs sm:text-sm text-emerald-300 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong>Zero Cookies Used:</strong> YTdownloader does not set, read, or require HTTP
          cookies. You can use all features of this tool without any cookies being placed on your
          device.
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">1. What Are Cookies?</h2>
        <p className="text-sm leading-relaxed">
          Cookies are small text files placed on your computer or mobile device by websites to track
          sessions, authenticate user accounts, analyze browsing behaviors, or serve targeted
          advertisements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">2. Our Cookie Practices</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader is intentionally designed as a completely stateless, privacy-friendly utility:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li><strong>No Session Cookies:</strong> We do not create or maintain user session identifiers.</li>
          <li><strong>No Tracking / Advertising Cookies:</strong> We do not partner with ad exchanges, marketing networks, or tracking syndicates.</li>
          <li><strong>No Analytics Cookies:</strong> We do not embed Google Analytics, Facebook Pixels, or third-party behavioral telemetry.</li>
          <li><strong>No Local Storage Tracking:</strong> We do not store tracking tokens, fingerprints, or historical records in browser <code className="text-xs bg-slate-800 px-1 rounded">localStorage</code> or <code className="text-xs bg-slate-800 px-1 rounded">sessionStorage</code>.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">3. Third-Party Websites & Services</h2>
        <p className="text-sm leading-relaxed">
          When you follow links to external platforms (such as YouTube or GitHub), those independent
          third parties may utilize their own cookies subject to their independent privacy and cookie
          policies. We have no control over third-party cookie practices.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4. Managing Your Cookie Preferences</h2>
        <p className="text-sm leading-relaxed">
          Because YTdownloader does not store cookies, no cookie banner or opt-out mechanism is required
          on this website. You may also configure your web browser settings to block all cookies without
          impairing any functionality of YTdownloader.
        </p>
      </section>
    </div>
  );
}

/* ========================================================================== */
/* 5. DISCLAIMER CONTENT                                                      */
/* ========================================================================== */
function DisclaimerContent() {
  return (
    <div className="space-y-6 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Legal & Liability Disclaimer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Disclaimer
        </h1>
        <p className="text-xs text-slate-400">Last Updated: September 2026</p>
      </div>

      <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs sm:text-sm text-rose-200">
        <strong>Affiliation Disclaimer:</strong> YTdownloader is an independent software project. We
        are <strong>NOT</strong> affiliated with, associated with, authorized by, endorsed by, or in
        any way officially connected with YouTube, Google LLC, Alphabet Inc., or any of their
        subsidiaries or affiliates.
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">1. General Information Only</h2>
        <p className="text-sm leading-relaxed">
          The information, utilities, and software provided by YTdownloader are presented for personal
          archiving, educational research, and private study purposes only. Nothing on this website
          shall be construed as legal advice concerning intellectual property, copyright compliance,
          or fair use exemptions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">2. No Ownership Over Third-Party Media</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader does not host, store, index, sell, or broadcast any video or audio files. All
          media content converted or retrieved belongs exclusively to the respective copyright holders
          and creators. Users are exclusively responsible for obtaining appropriate authorizations before
          downloading or distributing any material.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">3. Technical & Availability Limitations</h2>
        <p className="text-sm leading-relaxed">
          Media conversion availability, extraction speeds, and format compatibility are subject to
          third-party platform architecture and open-source extraction tool updates. We do not guarantee:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-slate-300">
          <li>Continuous, 100% uptime of download or conversion services;</li>
          <li>Availability of specific high resolutions (e.g., 4K or 1080p) for all source videos;</li>
          <li>Perfection, fidelity, or error-free encoding of output files;</li>
          <li>Compatibility with future changes to YouTube's web application.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4. Fair Use & Digital Protections</h2>
        <p className="text-sm leading-relaxed">
          YTdownloader operates strictly within technical boundaries and does not contain tools to
          circumvent DRM encryption, paywalls, private video credentials, or platform access locks.
          Users are solely responsible for ensuring their usage constitutes legal fair use or authorized
          archival in their jurisdiction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">5. Contact Information</h2>
        <p className="text-sm leading-relaxed">
          If you have questions or concerns regarding this Disclaimer, please reach out via:{' '}
          <span className="font-mono text-indigo-300">[legal@ytdownloader.example]</span>.
        </p>
      </section>
    </div>
  );
}
