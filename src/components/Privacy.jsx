import TopBar from './TopBar';
import './LegalPage.css';

export default function Privacy() {
  return (
    <>
      <TopBar back title="Privacy Policy" />
      <div className="legal-wrap">
        <p className="legal-updated">Last updated: October 2026</p>

        <section>
          <h2>The short version</h2>
          <p>
            You can use P.I.B. without an account, and in that case we store nothing about you on our
            servers. If you choose to make an account, we keep the minimum needed to run the leaderboard
            and your streak. There are no ads, no analytics, no tracking cookies, and we never sell or
            share your data.
          </p>
        </section>

        <section>
          <h2>If you do not log in</h2>
          <p>
            Nothing is sent to or stored by us. Your sound on/off preference is saved on your own device
            only.
          </p>
        </section>

        <section>
          <h2>If you create an account</h2>
          <p>We store:</p>
          <p>
            Your email address and a password (the password is stored in scrambled form by our
            authentication provider, we cannot see or recover it). Your chosen nickname, which is shown
            publicly on the leaderboard. Your email is never shown to other users. Your completion time
            for each section on the current day. Your streak: a count of consecutive days and the date
            you last completed all three sections.
          </p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>
            Daily completion times are only kept for the day they were set and are removed afterwards.
            The cleanup runs whenever someone opens the leaderboard, so on rare occasions a day's entries
            may remain a little longer. Your email, nickname and streak are kept until you ask us to
            delete your account.
          </p>
        </section>

        <section>
          <h2>Who handles your data</h2>
          <p>
            Accounts and the database are provided by Supabase. The website is hosted on GitHub Pages,
            which, like any web host, may log visitors' IP addresses as part of normal operation. Fonts
            are served from this site itself, so no font provider sees your visit. We do not use any
            other third-party services.
          </p>
        </section>

        <section>
          <h2>On your device</h2>
          <p>
            To keep you logged in and remember your sound setting, the app stores small pieces of data in
            your browser's local storage. These are needed for the app to work and are not used for
            tracking.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You can ask to see, correct or delete your data at any time by emailing{' '}
            <a href="mailto:themedtimescontactmail@gmail.com">themedtimescontactmail@gmail.com</a> from
            the address you signed up with. Deleting your account removes your email, nickname, streak and
            any results.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            P.I.B. is made for medical students and other adult learners. It is not directed at children
            under 13 and we do not knowingly collect their data.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            If this policy changes, the date above will be updated. Questions can be sent to{' '}
            <a href="mailto:themedtimescontactmail@gmail.com">themedtimescontactmail@gmail.com</a>.
          </p>
        </section>
      </div>
    </>
  );
}
