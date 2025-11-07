import GoogleMap from '../components/GoogleMap'
import './Contact.css'

const CONTACT_COORDINATES_TEXT = "33°30'33.7\"N 36°17'16.4\"E"

export default function Contact() {
  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero__content">
          <span className="contact-badge">يسعدنا تواصلك</span>
          <h1>دعنا نبدأ مشروعك الآن</h1>
          <p>
            سواء كنت تحتاج إلى حملة دعائية متكاملة أو طباعة سريعة، فريق خوام جاهز ليقدم لك الاستشارة المجانية والخيارات الأنسب لميزانيتك.
          </p>
          <div className="contact-details">
            <div>
              <strong>واتساب</strong>
              <a href="https://wa.me/963993000000" target="_blank" rel="noreferrer">+963 993 000 000</a>
            </div>
            <div>
              <strong>البريد</strong>
              <a href="mailto:hello@khawamprint.com">hello@khawamprint.com</a>
            </div>
            <div>
              <strong>ساعات العمل</strong>
              <span>يومياً 9 صباحاً - 9 مساءً</span>
            </div>
          </div>
        </div>

        <div className="contact-hero__form">
          <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
            <h2>أخبرنا عن مشروعك</h2>
            <div className="form-grid">
              <label>
                الاسم الكامل
                <input type="text" placeholder="الاسم" required />
              </label>
              <label>
                البريد الإلكتروني
                <input type="email" placeholder="example@email.com" required />
              </label>
              <label className="span-2">
                نوع المشروع
                <select defaultValue="">
                  <option value="" disabled>
                    اختر نوع الخدمة المطلوبة
                  </option>
                  <option value="digital">طباعة رقمية ومواد دعائية</option>
                  <option value="branding">هوية بصرية كاملة</option>
                  <option value="outdoor">إعلانات خارجية وتركيب</option>
                  <option value="other">أخرى</option>
                </select>
              </label>
              <label className="span-2">
                تفاصيل إضافية
                <textarea rows={4} placeholder="أخبرنا بأهم التفاصيل والمتطلبات"></textarea>
              </label>
            </div>
            <button type="submit" className="btn btn-primary">
              ارسال الطلب
            </button>
          </form>
        </div>
      </section>

      <section className="contact-location">
        <div className="container">
          <div className="contact-location__info">
            <h2>مقر خوام للطباعة والتصميم</h2>
            <p>
              تجدوننا في قلب دمشق التجارية مع تجهيزات تقنية متكاملة لاستقبال وتفيذ جميع مشاريع الطباعة والتسويق.
            </p>
            <ul>
              <li>
                <strong>العنوان:</strong>
                <span>سوريا - دمشق - ساحة المرجة - مبنى خوام</span>
              </li>
              <li>
                <strong>الإحداثيات:</strong>
                <span>{CONTACT_COORDINATES_TEXT}</span>
              </li>
            </ul>
          </div>

          <div className="contact-location__map">
            <GoogleMap description="يمكنك زيارتنا للحصول على استشارة فورية وخيارات عينات الطباعة" />
          </div>
        </div>
      </section>
    </div>
  )
}

