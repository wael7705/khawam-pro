import './Services.css'
import ServicesCarousel from '../components/ServicesCarousel'

export default function Services() {
  return (
    <div className="services-landing">
      <section className="services-hero">
        <div className="services-hero__content">
          <span className="hero-badge">خبرة 15 عاماً في الطباعة والدعاية</span>
          <h1>حلول دعائية متكاملة تعكس هوية علامتك</h1>
          <p>
            فريق خوام يقدم لك رحلة متكاملة من التخطيط إلى التنفيذ. ندرس أهدافك، نصمم الرسالة المناسبة،
            وننفذ كل ما يلزم لضمان ظهور علامتك بالشكل الأمثل سواء في الفضاء الرقمي أو على أرض الواقع.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#services-showcase">اكتشف خدماتنا</a>
            <a className="btn btn-secondary" href="/contact">استشارة مجانية</a>
          </div>
        </div>

        <div className="services-hero__media" aria-hidden="true">
          <video
            className="services-hero__video"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=900&q=80"
          >
            <source src="https://storage.googleapis.com/khawam-static/printing-showreel.mp4" type="video/mp4" />
          </video>
          <div className="services-hero__overlay" />
        </div>
      </section>

      <section id="services-showcase" className="services-showcase">
        <div className="container">
          <div className="services-showcase__intro">
            <h2>كل ما تحتاجه لتطلق حملتك الدعائية بثقة</h2>
            <p>3 محاور رئيسية نعمل من خلالها على تصميم قصص نجاح عملائنا.</p>
          </div>
          <div className="services-showcase__grid">
            <div className="showcase-card">
              <span>01</span>
              <h3>استراتيجية العلامة</h3>
              <p>
                جلسات استكشاف لفهم أهدافك، الجمهور المستهدف، وقنوات التواصل المناسبة مع تقديم خارطة طريق واضحة للحملة.
              </p>
            </div>
            <div className="showcase-card">
              <span>02</span>
              <h3>التصميم والإنتاج</h3>
              <p>
                فريق تصميم متخصص يصنع مواد إبداعية جاهزة للطباعة أو النشر الرقمي مع مراقبة جودة لكل مرحلة إنتاج.
              </p>
            </div>
            <div className="showcase-card">
              <span>03</span>
              <h3>النشر والمتابعة</h3>
              <p>
                تنفيذ وتركيب في الموقع، إدارة القنوات الإعلانية، وقياس النتائج لضمان تحقيق أعلى عائد ممكن للحملة.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="services-carousel-wrapper">
        <div className="container">
          <ServicesCarousel />
        </div>
      </section>

      <section className="services-cta">
        <div className="container">
          <h2>جاهز لبدء مشروعك القادم؟</h2>
          <p>
            احجز موعداً مع أحد مستشارينا لنبني خطة عمل مخصصة تناسب ميزانيتك وتطلعاتك.
          </p>
          <a className="btn btn-primary" href="/contact">ابدأ الآن</a>
        </div>
      </section>
    </div>
  )
}

