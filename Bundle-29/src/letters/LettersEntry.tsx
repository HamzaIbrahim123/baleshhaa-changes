import type { ReactNode } from 'react';
import './LettersEntry.css';

export type LettersEntryProps = {
  isSignedIn: boolean;
  backendConfigured: boolean;
  onHost: () => void;
  onViewer: () => void;
  onDemo: () => void;
  onBack: () => void;
};

function HexIcon({ children, color }: { children: ReactNode; color: 'orange' | 'green' }) {
  return <div className={`letters-entry__hex letters-entry__hex--${color}`} aria-hidden="true"><span>{children}</span></div>;
}

/** Entry page only: keeps experimental Letters rooms separate from live Seen Jeem. */
export function LettersEntry({ isSignedIn, backendConfigured, onHost, onViewer, onDemo, onBack }: LettersEntryProps) {
  return <section className="letters-entry" dir="rtl" aria-labelledby="letters-entry-heading">
    <div className="letters-entry__top">
      <button type="button" className="letters-entry__back" onClick={onBack}>العودة للألعاب</button>
      <span className="letters-entry__brand">⬡ بلّشها / لعبة الحروف</span>
    </div>
    <div className="letters-entry__hero">
      <div className="letters-entry__copy">
        <span className="letters-entry__eyebrow">نسخة تجريبية • نظام الغرف</span>
        <h1 id="letters-entry-heading">لعبة الحروف</h1>
        <p>فريقان، شبكة من 25 حرفًا، وتحدّي توصيل الألوان. اختار دورك عشان تبلّش تجربة الغرف.</p>
        {!backendConfigured && <p className="letters-entry__notice" role="status">الواجهات جاهزة للتجربة، لكن إنشاء الغرف والانضمام الفعلي يحتاج تفعيل اتصال الخادم على الموقع.</p>}
      </div>
      <div className="letters-entry__art" aria-hidden="true">
        <HexIcon color="orange">ع</HexIcon><HexIcon color="green">م</HexIcon><HexIcon color="orange">ب</HexIcon>
        <HexIcon color="green">ل</HexIcon><HexIcon color="orange">ش</HexIcon>
      </div>
    </div>
    <div className="letters-entry__options">
      <article className="letters-entry__option">
        <div className="letters-entry__option-icon letters-entry__option-icon--orange">◈</div>
        <div className="letters-entry__option-body">
          <h2>أنا المقدّم</h2>
          <p>أنشئ غرفة، سمِّ الفريقين، واختار عدد الجولات. شارك رمز الدخول مع شاشة العرض.</p>
        </div>
        <button type="button" className="letters-entry__button letters-entry__button--orange" onClick={onHost}>
          {isSignedIn ? 'إنشاء غرفة' : 'سجّل دخولك لإنشاء غرفة'}
        </button>
      </article>
      <article className="letters-entry__option">
        <div className="letters-entry__option-icon letters-entry__option-icon--green">⬡</div>
        <div className="letters-entry__option-body">
          <h2>شاشة المتسابقين</h2>
          <p>ادخل برمز الغرفة أو بالرابط المرسل من المقدّم، بدون إنشاء حساب أو تسجيل دخول.</p>
        </div>
        <button type="button" className="letters-entry__button letters-entry__button--green" onClick={onViewer}>الانضمام للغرفة</button>
      </article>
    </div>
    <section className="letters-entry__offline" aria-label="تجربة اللوحة بدون غرفة">
      <div className="letters-entry__offline-copy">
        <span className="letters-entry__eyebrow">تجربة بصرية بدون خادم</span>
        <h2>جرّب فوز الحروف بنفسك</h2>
        <p>لوّن خلايا اللوحة، وجرّب المسارات البرتقالية والخضراء، وشوف كيف النظام يكتشف الفائز. بدون حساب، وبدون إنشاء غرفة، وبدون تخزين.</p>
      </div>
      <button type="button" className="letters-entry__button letters-entry__button--demo" onClick={onDemo}>تجربة اللوحة الآن</button>
    </section>
    <div className="letters-entry__footnote">هذه تجربة للغرف، وليست إطلاقًا كاملًا للعبة أو بنك الأسئلة بعد.</div>
  </section>;
}