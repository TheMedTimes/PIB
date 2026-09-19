import TopBar from './TopBar';
import './LegalPage.css';

export default function Copyright() {
  const year = new Date().getFullYear();
  return (
    <>
      <TopBar back title="Copyright" />
      <div className="legal-wrap">
        <p className="legal-updated">Last updated: September 2026</p>

        <section>
          <h2>Ownership</h2>
          <p>
            P.I.B. (Pharmac In a Bottle), including its name, visual design, artwork, and
            question sets, is owned by TheMedTimes, copyright {year}. All rights reserved unless
            stated otherwise.
          </p>
        </section>

        <section>
          <h2>What you can do</h2>
          <p>
            You are welcome to use the site for personal study, share a link to it with other
            students, and take screenshots for your own notes.
          </p>
        </section>

        <section>
          <h2>What you cannot do</h2>
          <p>
            You may not reproduce, redistribute, resell, or publish the site content, question
            sets, or artwork elsewhere, in whole or in part, without prior written permission from
            TheMedTimes.
          </p>
        </section>

        <section>
          <h2>Drug information</h2>
          <p>
            Pharmacology facts themselves (mechanisms, adverse reactions, therapy indications) are
            general scientific knowledge and not owned by anyone. What is protected here is our
            specific selection, wording, and presentation of that information as question sets.
          </p>
        </section>

        <section>
          <h2>Reporting a concern</h2>
          <p>
            If you believe any content on this site infringes your rights, contact{' '}
            <a href="mailto:themedtimescontactmail@gmail.com">themedtimescontactmail@gmail.com</a>{' '}
            and we will look into it.
          </p>
        </section>
      </div>
    </>
  );
}
