import TopBar from './TopBar';
import './LegalPage.css';

export default function Terms() {
  return (
    <>
      <TopBar back title="Terms and Conditions" />
      <div className="legal-wrap">
        <p className="legal-updated">Last updated: November 2026</p>

        <section>
          <h2>1. What P.I.B. is</h2>
          <p>
            P.I.B. (Pharmac In a Bottle) is a free, fun learning game built by TheMedTimes. It offers
            daily match the following drills on pharmacology, in an Exam mode (a small selection of
            commonly tested facts) and a Hard mode (a larger set). It is not a study guide, textbook,
            course, or reference, and it is not a substitute for any of those.
          </p>
        </section>

        <section>
          <h2>2. Please don't depend on it</h2>
          <p>
            P.I.B. is provided for fun and casual learning only. Nobody should rely on it to prepare
            for an exam, to learn a subject, or to make any decision. Nothing on this site is medical
            advice, and it must never be used to diagnose, treat, or make clinical decisions about any
            patient. Always check drug information against current, authoritative references.
          </p>
        </section>

        <section>
          <h2>3. Accuracy and missing information</h2>
          <p>
            Pharmacology changes, and a quick game cannot cover everything. Content may contain
            mistakes, be out of date, or leave things out, and Exam mode in particular is only a
            selection, not the whole syllabus. The site is provided "as is" with no promise that it is
            complete, current, or error-free. TheMedTimes is not responsible for any missing or
            incorrect information, or for any outcome that results from relying on it. If you spot a
            mistake or something missing, we would love to hear about it: use the Report Question link
            at the bottom of the site, or email us (see section 7).
          </p>
        </section>

        <section>
          <h2>4. Use of the site</h2>
          <p>
            The site is free to use. You agree not to attempt to disrupt, scrape at scale, or
            interfere with the normal operation of the site. If you believe anything on the site
            infringes your rights, contact us (see section 7) and we will look into it.
          </p>
        </section>

        <section>
          <h2>5. Accounts and the leaderboard</h2>
          <p>
            Creating an account is optional. Nicknames appear publicly, so they must not be offensive,
            misleading, or impersonate anyone. Leaderboard times must be earned by playing normally:
            using scripts, tampering with the app, or otherwise faking a time is not allowed. We may
            remove nicknames, results or accounts that break these rules. See the Privacy Policy for how
            account data is handled.
          </p>
        </section>

        <section>
          <h2>6. Changes</h2>
          <p>
            These terms may be updated from time to time as the app develops. Continued use of the
            site after a change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:themedtimescontactmail@gmail.com">themedtimescontactmail@gmail.com</a>.
          </p>
        </section>
      </div>
    </>
  );
}
