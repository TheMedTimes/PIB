import TopBar from './TopBar';
import './LegalPage.css';

export default function Terms() {
  return (
    <>
      <TopBar back title="Terms and Conditions" />
      <div className="legal-wrap">
        <p className="legal-updated">Last updated: September 2026</p>

        <section>
          <h2>1. What P.I.B. is</h2>
          <p>
            P.I.B. (Pharmac In a Bottle) is a free study tool built by TheMedTimes to help medical
            students practice pharmacology through daily match the following drills. It is provided
            for educational purposes only.
          </p>
        </section>

        <section>
          <h2>2. Not medical advice</h2>
          <p>
            Nothing on this site is medical advice and it must not be used to diagnose, treat, or
            make clinical decisions about any patient. Content is a study aid only. Always verify
            drug information against current, authoritative references before applying it in
            practice.
          </p>
        </section>

        <section>
          <h2>3. Accuracy of content</h2>
          <p>
            We take care in preparing the drug information shown on this site, but pharmacology
            content changes and errors are possible. TheMedTimes makes no warranty that the content
            is complete, current, or free of mistakes, and is not liable for any outcome resulting
            from reliance on it.
          </p>
        </section>

        <section>
          <h2>4. Use of the site</h2>
          <p>
            The site is free to use. You may not copy, redistribute, or repackage the question sets
            or app content for commercial purposes without written permission. You agree not to
            attempt to disrupt, scrape at scale, or interfere with the normal operation of the site.
          </p>
        </section>

        <section>
          <h2>5. Changes</h2>
          <p>
            These terms may be updated from time to time as the app develops. Continued use of the
            site after a change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2>6. Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:themedtimescontactmail@gmail.com">themedtimescontactmail@gmail.com</a>.
          </p>
        </section>
      </div>
    </>
  );
}
