import type { ReactNode } from 'react';
import './LettersEntry.css';

export type LettersEntryProps = {
  isSignedIn: boolean;
  backendConfigured: boolean;
  onHost: () => void;
  onViewer: () => void;
  onDemo: () => void;
  onPresenterDemo: () => void;
  onBack: () => void;
};

function HexIcon({ children, color }: { children: ReactNode; color: 'orange' | 'green' }) {
  return <div className={`letters-entry__hex letters-entry__hex--${color}`} aria-hidden="true"><span>{children}</span></div>;
}

/** Entry page only: keeps experimental Letters rooms separate from live Seen Jeem. */
export function LettersEntry({ isSignedIn, backendConfigured, onHost, onViewer, onDemo, onPresenterDemo, onBack }: LettersEntryProps) {
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

    <details className="letters-entry__rules">
      <summary>كيف تلعب لعبة الحروف؟</summary>
      <div className="letters-entry__rules-content">
        <p>المقدّم ينشئ غرفة، يختار اسم كل فريق وعدد الجولات، وبعدها يشارك الرمز مع شاشة المتسابقين.</p>
        <p>البرتقالي يحاول وصل يمين اللوحة بيسارها، والأخضر يحاول وصل أعلاها بأسفلها. المقدّم يفتح سؤال الحرف، ويسجل لون الفريق اللي جاوب صح بالضغط على الخلية.</p>
      </div>
    </details>
    <section className="letters-entry__preview" aria-label="معاينة بصرية للوحة لعبة الحروف الأصلية">
      <div className="letters-entry__preview-copy">
        <span className="letters-entry__eyebrow">معاينة بصرية • بدون خادم</span>
        <h2>هاي هي لوحة الحروف الأصلية</h2>
        <p>شبكة سداسية متصلة من 25 حرفًا، مع طرفين برتقاليين وطرفين أخضرين. هذا الشكل للتعرّف على اللعبة، أما اللعب والأسئلة الحقيقية فبيبدأوا من إنشاء غرفة.</p>
        <div className="letters-entry__preview-legend"><span><i className="letters-entry__legend-dot letters-entry__legend-dot--orange"/> برتقالي: يمين ↔ يسار</span><span><i className="letters-entry__legend-dot letters-entry__legend-dot--green"/> أخضر: أعلى ↕ أسفل</span></div>
      </div>
      <div className="letters-entry__preview-frame" aria-hidden="true">
        <div className="letters-entry__preview-board">
          {[
            ['م','ع','ب','ل','ش'],
            ['ر','س','ف','ك','ن'],
            ['ي','ج','ت','ق','أ'],
            ['ز','ه','د','ح','ص'],
            ['و','ث','غ','ط','خ']
          ].map((row,ri)=><div className="letters-entry__preview-row" key={ri}>
            {row.map((letter,ci)=><span className={'letters-entry__preview-hex '+(ri===2&&ci===0?'letters-entry__preview-hex--orange':ri===3&&ci===2?'letters-entry__preview-hex--green':'')} key={ci}><span>{letter}</span></span>)}
          </div>)}
        </div>
      </div>
    </section>
    <div className="letters-entry__footnote">غرف المقدّم وشاشة المتسابقين متصلتان بنظام اللعبة الحقيقي؛ المعاينة بالأعلى بصرية فقط.</div>
  </section>;
}