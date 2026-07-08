"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Phone, Mail, MapPin, Calendar, ChevronLeft, ChevronRight, 
  ArrowRight, Search, Stethoscope, Menu, X, Clock, MessageSquare, Plus 
} from "lucide-react";
import "./home.css";

// Dữ liệu danh sách Bác sĩ
const DOCTORS = [
  {
    name: "Bs. CKI BSNT Mai Thị Hương Lan",
    role: "Trưởng khoa Nội thần kinh",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Ths. Bs. CKII Nguyễn Ngọc Thao",
    role: "Giám Đốc Y Khoa Bệnh viện",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Bs. CKII Nguyễn Trường Sơn",
    role: "Trưởng đơn vị khám sức khỏe",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Bs. CKII Nguyễn Đình Tiến",
    role: "Trưởng khoa Phẫu thuật - Gây mê hồi sức",
    image: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=600",
  },
];

// Dữ liệu danh sách Chuyên khoa
const SPECIALTIES = [
  {
    title: "Ung bướu",
    image: "https://images.unsplash.com/photo-1579684389782-64d84b5e901d?auto=format&fit=crop&q=80&w=600",
  },
  {
    title: "Tim mạch",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600",
  },
  {
    title: "Ngoại tiêu hóa",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600",
  }
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<"specialty" | "doctor" | "appointment">("specialty");
  const [currentDoctorIndex, setCurrentDoctorIndex] = useState(0);
  
  // Trạng thái đăng nhập và thông tin người dùng
  const [bookingUrl, setBookingUrl] = useState("/login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  // Kiểm tra trạng thái đăng nhập khi tải trang (Người dùng vẫn ở lại trang Landing)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = user?.role?.toUpperCase();
        
        // Tên hiển thị của người dùng đăng nhập
        setUserName(user?.name || user?.email || "Thành viên");
        
        // Cấu hình URL cho nút "Đặt lịch hẹn" tùy theo phân quyền của user
        let targetPath = '/dashboard';
        if (role === 'ADMIN') {
          targetPath = '/dashboard/admin';
        } else if (role === 'DOCTOR') {
          targetPath = '/dashboard/doctor';
        } else if (role === 'RECEPTIONIST') {
          targetPath = '/dashboard/receptionist';
        } else if (role === 'PATIENT') {
          targetPath = '/dashboard/patient';
        }
        
        setBookingUrl(targetPath);
        setIsLoggedIn(true);
      } catch (error) {
        setBookingUrl("/login");
        setIsLoggedIn(false);
      }
    } else {
      setBookingUrl("/login");
      setIsLoggedIn(false);
    }
  }, []);

  // Đổi kiểu Header khi cuộn trang
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Carousel bác sĩ
  const nextDoctor = () => {
    setCurrentDoctorIndex((prev) => (prev + 1) % DOCTORS.length);
  };

  const prevDoctor = () => {
    setCurrentDoctorIndex((prev) => (prev - 1 + DOCTORS.length) % DOCTORS.length);
  };

  // Đăng xuất và giữ người dùng ở lại trang chủ
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    document.cookie = "accessToken=; path=/; max-age=0; SameSite=Lax;";
    setBookingUrl("/login");
    setIsLoggedIn(false);
    setUserName("");
    window.location.reload();
  };

  return (
    <div className="homepage-wrapper">
      
      {/* 1. HEADER & TOP BAR */}
      <header className={`main-header ${isScrolled ? "scrolled" : ""}`}>
        {!isScrolled && (
          <div className="top-bar">
            <div className="container top-bar-inner">
              <div className="top-bar-left">
                <a href="tel:02839902468" className="contact-item">
                  <Phone /> 0844342445
                </a>
                <a href="mailto:contactus.saigon@hoanmy.com" className="contact-item">
                  <Mail /> C-Clinic@gmail.com
                </a>
              </div>
              <div className="top-bar-right">
                <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>
                  Bệnh viện đa khoa
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="container navbar">
          {/* Logo Bệnh viện */}
          <Link href="/" className="logo-link">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <div className="logo-badge"></div>
            </div>
            <div className="logo-text">
              <span className="logo-brand">C-Clinic</span>
              <span className="logo-sub">Sài Gòn</span>
            </div>
          </Link>

          {/* Menu Desktop */}
          <nav className="nav-menu">
            <Link href="#introduction" className="nav-link">Bệnh viện C-Clinic Sài Gòn</Link>
            <Link href="#specialties" className="nav-link">Chuyên khoa</Link>
            <Link href="#doctors" className="nav-link">Bác sĩ</Link>
            <Link href="#footer" className="nav-link">Về C-Clinic</Link>
          </nav>

          {/* Nút đăng ký, đăng nhập & đặt lịch Desktop */}
          <div className="header-actions">
            {isLoggedIn ? (
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginRight: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--primary-color)" }}>
                  {userName}
                </span>
                <button onClick={handleLogout} className="btn btn-outline-teal" style={{ padding: "6px 14px", fontSize: "12px" }}>
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginRight: "10px" }}>
                <Link href="/login" className="nav-link" style={{ fontSize: "13px", fontWeight: "bold" }}>
                  Đăng nhập
                </Link>
                <Link href="/register" className="nav-link" style={{ fontSize: "13px", fontWeight: "bold" }}>
                  Đăng ký
                </Link>
              </div>
            )}
            
            {/* Nút đặt lịch hẹn luôn xuất hiện bên phải */}
            <Link href={bookingUrl} className="btn btn-primary">
              Đặt lịch hẹn <ArrowRight size={16} />
            </Link>
          </div>

          {/* Hamburger Mobile */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-toggle">
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

       
      </header>

      {/* 2. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="badge-intro">
              <Plus size={16} /> Tận Tâm Chăm Sóc - Vì Sức Khỏe Bạn
            </div>
            <h1 className="hero-title">
             C-Clinic <br />
              <span>Sài Gòn</span>
            </h1>
            <p className="hero-desc">
              Bệnh viện hàng đầu thuộc tập đoàn y khoa C-Clinic. Đồng hành chăm sóc sức khỏe toàn diện cho gia đình bạn với tiêu chuẩn quốc tế và chất lượng vượt trội.
            </p>
            <div className="hero-actions">
              <Link href={bookingUrl} className="btn btn-primary btn-hero-primary">
                Đặt lịch khám ngay <ArrowRight size={18} />
              </Link>
              <Link href="#introduction" className="btn btn-hero-secondary">
                Tìm hiểu thêm
              </Link>
            </div>
          </div>

          <div className="hero-image-wrapper">
            <div className="hero-image-container">
              <img 
                src="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&q=80&w=1200" 
                alt="Hoan My Hospital"
                className="hero-img"
              />
              <div className="stats-card">
                <div className="stats-num">25+</div>
                <div className="stats-text">
                  <h4>Năm thành lập</h4>
                  <p>Chăm sóc y tế chất lượng cao từ năm 1999</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TABS HÀNH ĐỘNG NHANH */}
      <section className="quick-actions-section">
        <div className="container">
          <div className="quick-grid">
            <div onClick={() => setActiveTab("specialty")} className={`action-card ${activeTab === "specialty" ? "active" : ""}`}>
              <div className="card-top">
                <div className="icon-box"><Stethoscope size={24} /></div>
                <h3>Chuyên khoa</h3>
                <p>Đầy đủ chuyên khoa lâm sàng & cận lâm sàng đáp ứng mọi nhu cầu điều trị.</p>
              </div>
              <Link href="#specialties" className="card-link">
                Xem chuyên khoa <ArrowRight size={16} />
              </Link>
            </div>

            <div onClick={() => setActiveTab("doctor")} className={`action-card ${activeTab === "doctor" ? "active" : ""}`}>
              <div className="card-top">
                <div className="icon-box"><Search size={24} /></div>
                <h3>Tìm bác sĩ</h3>
                <p>Đội ngũ bác sĩ chuyên môn cao, giàu kinh nghiệm, hết lòng vì bệnh nhân.</p>
              </div>
              <Link href="#doctors" className="card-link">
                Tìm bác sĩ phù hợp <ArrowRight size={16} />
              </Link>
            </div>

            <div onClick={() => setActiveTab("appointment")} className={`action-card ${activeTab === "appointment" ? "active" : ""}`}>
              <div className="card-top">
                <div className="icon-box"><Calendar size={24} /></div>
                <h3>Đặt lịch hẹn</h3>
                <p>Đăng ký lịch khám trực tuyến nhanh chóng, tiết kiệm thời gian chờ đợi.</p>
              </div>
              <Link href={bookingUrl} className="card-link">
                Đặt hẹn ngay <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION GIỚI THIỆU */}
      <section id="introduction" className="intro-section">
        <div className="container intro-grid">
          <div className="intro-content">
            <h2 className="section-title-teal">Giới thiệu về Bệnh viện C-Clinic Sài Gòn</h2>
            <div className="title-line"></div>
            <div className="intro-desc-list">
              <p>
                Được thành lập vào năm 1999, bệnh viện C-Clinic Sài Gòn là bệnh viện tư nhân đầu tiên tại Việt Nam và hiện là bệnh viện hàng đầu của Tập đoàn y khoa C-Clinic. Bệnh viện có quy mô hơn 300 giường tại Thành phố Hồ Chí Minh phục vụ hơn 2.500 bệnh nhân ngoại trú mỗi ngày. Bệnh viện Hoàn Mỹ Sài Gòn tập trung đẩy mạnh vào đổi mới, đi đầu và đặt tiêu chuẩn cao cho các tiêu chuẩn y tế trong toàn tập đoàn.
              </p>
              <p>
                Chúng tôi cung cấp dịch vụ chăm sóc tận tâm, chất lượng cao, chi phí hợp lý với nhiều chuyên khoa chính, cho bệnh nhân ở mọi lứa tuổi. Đội ngũ chuyên gia y tế chuyên nghiệp của chúng tôi tiếp tục thúc đẩy ranh giới của nghiên cứu y tế, tập trung mạnh vào đào tạo và giáo dục. Chúng tôi cũng tổ chức một loạt các sự kiện và hội thảo chia sẻ kiến thức và lãnh đạo tư tưởng quốc tế, chào đón các chuyên gia y tế toàn cầu đến bệnh viện của chúng tôi.
              </p>
              <p>
                Chúng tôi được chứng nhận bởi Hội đồng Tiêu chuẩn Chăm sóc Sức khỏe Úc Quốc tế (ACHSI), đây là sự thể hiện tiêu chuẩn cao về chăm sóc lâm sàng, an toàn bệnh nhân và chất lượng vận hành của chúng tôi.
              </p>
            </div>
          </div>

          {/* Sidebar Liên Hệ Bên Phải */}
          <div className="contact-sidebar">
            <h3 className="sidebar-title">Liên hệ</h3>
            <div className="sidebar-list">
              <div className="sidebar-item">
                <Phone className="sidebar-icon" size={18} />
                <div>
                  <p className="sidebar-text">0844342445</p>
                </div>
              </div>
              <div className="sidebar-item">
                <MapPin className="sidebar-icon" size={18} />
                <div>
                  <p className="sidebar-text">số 47 cao lỗ, phường Chánh Hưng, TP. Hồ Chí Minh</p>
                </div>
              </div>
              <div className="sidebar-item">
                <Mail className="sidebar-icon" size={18} />
                <div>
                  <p className="sidebar-text">C-Clinic@gmail.com</p>
                </div>
              </div>
              <div className="sidebar-item">
                <Clock className="sidebar-icon" size={18} />
                <div>
                  <p className="sidebar-text">Mở cửa 24 giờ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPECIALTIES SECTION (CHUYÊN KHOA) */}
      <section id="specialties" className="specialties-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title-teal">Chuyên khoa nổi bật</h2>
            <div className="title-line"></div>
            <p className="section-desc">
              C-Clinic cung cấp một loạt chuyên khoa và dịch vụ y tế đa dạng, kết hợp kinh nghiệm y tế với công nghệ tiên tiến để cung cấp sự chăm sóc tốt nhất cho bệnh nhân.
            </p>
          </div>

          <div className="specialty-grid">
            {SPECIALTIES.map((spec, idx) => (
              <Link href={bookingUrl} key={idx} className="specialty-card">
                <img src={spec.image} alt={spec.title} className="specialty-card-img" />
                <div className="card-overlay">
                  <h3 className="specialty-title">{spec.title}</h3>
                  <span className="specialty-more">
                    Tìm hiểu thêm <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="specialty-actions">
            <Link href={bookingUrl} className="btn btn-primary">
              Đặt lịch hẹn <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. DOCTORS SECTION (DANH SÁCH BÁC SĨ) */}
      <section id="doctors" className="doctors-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title-teal">Bác sĩ của chúng tôi, tận tâm vì sức khỏe bạn</h2>
            <div className="title-line"></div>
            <p className="section-desc">
              Mang đến dịch vụ chăm sóc sức khỏe chất lượng cao với đội ngũ bác sĩ giàu kinh nghiệm và hết lòng vì bệnh nhân.
            </p>
          </div>

          {/* Slider bác sĩ */}
          <div className="slider-container">
            <button className="slider-arrow left" onClick={prevDoctor}>
              <ChevronLeft size={24} />
            </button>
            
            <div className="doctors-track">
              <div className="doctors-list" style={{ transform: `translateX(-${currentDoctorIndex * 100}%)` }}>
                {DOCTORS.map((doc, idx) => (
                  <div key={idx} className="doctor-card">
                    <div className="doctor-img-box">
                      <img src={doc.image} alt={doc.name} className="doctor-img" />
                    </div>
                    <div className="doctor-info">
                      <h3 className="doctor-name">{doc.name}</h3>
                      <p className="doctor-role">{doc.role}</p>
                      <div className="doctor-card-bottom">
                        <Link href={bookingUrl} className="doctor-card-btn">
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="slider-arrow right" onClick={nextDoctor}>
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER SECTION */}
      <footer id="footer" className="main-footer">
        <div className="container footer-grid">
          {/* Cột 1: Thông tin liên hệ */}
          <div className="footer-col">
            <div className="footer-about">
              <Link href="/" className="footer-logo">
                <div className="footer-logo-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <span className="footer-logo-text">C-Clinic</span>
              </Link>
              <div className="footer-contact-list">
                <div className="footer-contact-item">
                  <MapPin size={18} />
                  <span>Số 47 Cao lỗ, phường Chánh Hưng, TP. Hồ Chí Minh</span>
                </div>
                <div className="footer-contact-item">
                  <Phone size={18} />
                  <span>0844342445</span>
                </div>
                <div className="footer-contact-item">
                  <Mail size={18} />
                  <span>C-Clinic@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cột 2: Liên kết nhanh 1 */}
          <div className="footer-col">
            <h4 className="footer-links-title">Dịch vụ y khoa</h4>
            <ul className="footer-links-list">
              <li><Link href={bookingUrl} className="footer-link">Bệnh viện C-Clinic Sài Gòn</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Chuyên khoa</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Bác sĩ</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Tin tức</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Về C-Clinic</Link></li>
            </ul>
          </div>

          {/* Cột 3: Liên kết nhanh 2 */}
          <div className="footer-col">
            <h4 className="footer-links-title">Thông tin & Hỗ trợ</h4>
            <ul className="footer-links-list">
              <li><Link href={bookingUrl} className="footer-link">Hội thảo & Hội nghị</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Tin tức sức khỏe</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Giải thưởng đạt được</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Chính sách quà tặng</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Chính sách bảo mật</Link></li>
              <li><Link href={bookingUrl} className="footer-link">Liên hệ hỗ trợ</Link></li>
            </ul>
          </div>

          {/* Cột 4: Hashtag & Tải ứng dụng */}
          <div className="footer-col">
            <h4 className="footer-hashtag">#tantamchamsoc</h4>
            <Link href={bookingUrl} className="btn btn-footer-booking">
              Đặt lịch hẹn <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} Bệnh viện C-Clinic Sài Gòn. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>

      {/* 8. FLOATING BUTTON LIÊN HỆ */}
      <a href="tel:0844342445" className="floating-contact">
        <MessageSquare size={18} />
        <span>Liên hệ</span>
      </a>

    </div>
  );
}
