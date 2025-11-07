import GoogleMap from '../components/GoogleMap'
import './Contact.css'

const CONTACT_COORDINATES_TEXT = "33°30'33.7\"N 36°17'16.4\"E"
const WHATSAPP_NUMBER = '+963112134640'
const WHATSAPP_LINK = `https://wa.me/963112134640?text=${encodeURIComponent('مرحباً، أرغب بمتابعة طلبي لدى شركة خوام.')}`

export default function Contact() {
  return (
    <div className="contact-page">
      <div className="container">
        <section className="contact-hero">
          <div className="contact-hero__content">
            <span className="contact-badge">مرحباً بكم في خوام للطباعة والتصميم</span>
            <h1>تواصل مباشر مع فريق الدعم وخدمة العملاء</h1>
            <p>
              نضع بين يديك جميع وسائل التواصل لمتابعة طلباتك، طلب تسعيرة، أو الحصول على استشارة فورية. اختر الطريقة الأنسب
              لك وسيقوم فريقنا بالرد خلال دقائق.
            </p>

            <div className="contact-cards">
              <article className="contact-card whatsapp">
                <div className="contact-card__icon">💬</div>
                <div>
                  <h3>دردشة واتساب</h3>
                  <p>متابعة فورية لحالة الطلبات والأسعار عبر واتساب.</p>
                </div>
                <a className="contact-card__action" href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
                  ابدأ محادثة الآن
                  <span>{WHATSAPP_NUMBER}</span>
                </a>
              </article>

              <article className="contact-card facebook">
                <div className="contact-card__icon">📘</div>
                <div>
                  <h3>صفحة فيسبوك الرسمية</h3>
                  <p>تابع أحدث الأعمال والعروض عبر Facebook.</p>
                </div>
                <a className="contact-card__action" href="https://www.facebook.com/Khawam.me" target="_blank" rel="noreferrer">
                  زيارة صفحة Khawam
                </a>
              </article>

              <article className="contact-card email">
                <div className="contact-card__icon">✉️</div>
                <div>
                  <h3>البريد الإلكتروني</h3>
                  <p>استفسارات الشركات والشراكات والتوظيف.</p>
                </div>
                <a className="contact-card__action" href="mailto:hello@khawamprint.com">
                  hello@khawamprint.com
                </a>
              </article>
            </div>
          </div>

          <aside className="contact-hero__sidebar">
            <div className="contact-info-card">
              <h2>معلومات الموقع</h2>
              <ul>
                <li>
                  <strong>العنوان</strong>
                  <span>سوريا - دمشق - ساحة المرجة - مبنى خوام للطباعة</span>
                </li>
                <li>
                  <strong>الإحداثيات</strong>
                  <span>{CONTACT_COORDINATES_TEXT}</span>
                </li>
                <li>
                  <strong>ساعات العمل</strong>
                  <span>يومياً من 9 صباحاً حتى 9 مساءً</span>
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>

      <section className="contact-map-section">
        <div className="container contact-map-grid">
          <div className="contact-map-grid__map">
            <GoogleMap description="زورونا في مقر خوام للطباعة والتصميم – موقعنا مباشرة على ساحة المرجة." />
          </div>
          <div className="contact-map-grid__cta">
            <h2>جاهز لزيارتنا؟</h2>
            <p>
              استخدم الإحداثيات أو خريطة جوجل للوصول بشكل مباشر. أخبرنا على واتساب عند اقترابك لنستقبلك ونجهّز الطلب أو
              العينات التي ترغب بمشاهدتها.
            </p>
            <a className="btn btn-secondary" href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
              أعلمني عند الوصول
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

