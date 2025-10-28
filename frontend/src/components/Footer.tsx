import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>خوام</h3>
            <p>خدمات الطباعة والتصميم الاحترافي</p>
          </div>
          
          <div className="footer-section">
            <h4>روابط سريعة</h4>
            <ul>
              <li><a href="/">الرئيسية</a></li>
              <li><a href="/services">الخدمات</a></li>
              <li><a href="/products">المنتجات</a></li>
              <li><a href="/portfolio">أعمالنا</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>تواصل معنا</h4>
            <p>📧 eyadmrx@gmail.com</p>
            <p>📱 +963112134640</p>
            <p>📍 دمشق - البرامكة</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 خوام. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}

