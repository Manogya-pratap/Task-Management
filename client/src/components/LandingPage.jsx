import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card, Navbar, Nav } from 'react-bootstrap';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="landing-page">
      {/* Top Navigation Bar */}
      <Navbar expand="lg" className="custom-navbar" fixed="top">
        <Container>
          <Navbar.Brand className="navbar-brand-custom">
            <i className="fas fa-building me-2"></i>
            <span className="brand-text">Yantrik Automation</span>
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Button 
                variant="outline-light" 
                className="login-btn-nav"
                onClick={handleLoginClick}
              >
                <i className="fas fa-sign-in-alt me-2"></i>
                Login
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <Container>
            <Row className="min-vh-100 align-items-center" style={{ paddingTop: '80px' }}>
              <Col lg={6} className="text-center text-lg-start">
                <div className="hero-content">
                  <div className="company-logo mb-4">
                    <i className="fas fa-building fa-3x text-white mb-3"></i>
                    <h1 className="company-name">Yantrik Automation Pvt. Ltd.</h1>
                  </div>
                  
                  <h2 className="hero-title mb-4">
                    Daily Activity Tracker
                  </h2>
                  
                  <p className="hero-subtitle mb-4">
                    Streamline your workflow, manage projects efficiently, and boost team productivity 
                    with our comprehensive task management system.
                  </p>
                  
                  <div className="hero-buttons">
                    <Button 
                      variant="light" 
                      size="lg" 
                      className="me-3 mb-3 hero-btn-primary"
                      onClick={handleLoginClick}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Employee Login
                    </Button>
                    
                    <Button 
                      variant="outline-light" 
                      size="lg" 
                      className="mb-3 hero-btn-secondary"
                      onClick={() => {
                        const featuresSection = document.querySelector('.features-section');
                        if (featuresSection) {
                          featuresSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="fas fa-info-circle me-2"></i>
                      Learn More
                    </Button>
                  </div>
                  
                  <div className="hero-stats mt-5">
                    <Row>
                      <Col xs={4} className="text-center">
                        <div className="stat-item">
                          <h3 className="stat-number">100+</h3>
                          <p className="stat-label">Projects</p>
                        </div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="stat-item">
                          <h3 className="stat-number">50+</h3>
                          <p className="stat-label">Team Members</p>
                        </div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="stat-item">
                          <h3 className="stat-number">99%</h3>
                          <p className="stat-label">Uptime</p>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
              
              <Col lg={6} className="text-center">
                <div className="hero-image">
                  <div className="dashboard-preview">
                    <div className="preview-card">
                      <div className="preview-header">
                        <div className="preview-dots">
                          <span className="dot red"></span>
                          <span className="dot yellow"></span>
                          <span className="dot green"></span>
                        </div>
                        <div className="preview-title">Task Management Dashboard</div>
                      </div>
                      <div className="preview-content">
                        <div className="preview-stats">
                          <div className="stat-card">
                            <i className="fas fa-project-diagram text-maroon"></i>
                            <div>
                              <div className="stat-value">24</div>
                              <div className="stat-name">Active Projects</div>
                            </div>
                          </div>
                          <div className="stat-card">
                            <i className="fas fa-tasks text-maroon-light"></i>
                            <div>
                              <div className="stat-value">156</div>
                              <div className="stat-name">Tasks</div>
                            </div>
                          </div>
                        </div>
                        <div className="preview-chart">
                          <div className="chart-bar" style={{height: '60%'}}></div>
                          <div className="chart-bar" style={{height: '80%'}}></div>
                          <div className="chart-bar" style={{height: '45%'}}></div>
                          <div className="chart-bar" style={{height: '90%'}}></div>
                          <div className="chart-bar" style={{height: '70%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Powerful Features</h2>
              <p className="section-subtitle">
                Everything you need to manage your projects and team effectively
              </p>
            </Col>
          </Row>
          
          <Row>
            <Col md={4} className="mb-4">
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-project-diagram fa-3x text-maroon"></i>
                  </div>
                  <h5 className="feature-title">Project Management</h5>
                  <p className="feature-description">
                    Create, organize, and track projects with intuitive tools and real-time updates.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-users fa-3x text-maroon"></i>
                  </div>
                  <h5 className="feature-title">Team Collaboration</h5>
                  <p className="feature-description">
                    Foster teamwork with shared workspaces, comments, and real-time notifications.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="feature-card h-100 border-0 shadow-sm">
                <Card.Body className="text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-chart-line fa-3x text-maroon"></i>
                  </div>
                  <h5 className="feature-title">Analytics & Reports</h5>
                  <p className="feature-description">
                    Get insights into productivity with detailed analytics and progress reports.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section py-5">
        <Container>
          <Row className="text-center">
            <Col>
              <div className="cta-content">
                <h2 className="cta-title mb-4">Ready to Get Started?</h2>
                <p className="cta-subtitle mb-4">
                  Join your team and start managing projects more efficiently today.
                </p>
                <Button 
                  variant="light" 
                  size="lg"
                  className="cta-btn"
                  onClick={handleLoginClick}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Access Your Dashboard
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="footer-section py-4">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <div className="footer-brand">
                <i className="fas fa-building me-2"></i>
                <strong>Yantrik Automation Pvt. Ltd.</strong>
              </div>
              <p className="footer-text mb-0">
                Empowering teams with intelligent automation solutions.
              </p>
            </Col>
            <Col md={6} className="text-md-end">
              <div className="footer-links">
                <Button 
                  variant="link" 
                  className="text-light p-0 me-3"
                  onClick={handleLoginClick}
                >
                  Employee Login
                </Button>
                <span className="text-light opacity-75">
                  © 2024 Yantrik Automation. All rights reserved.
                </span>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        .landing-page {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Global button cursor fix */
        .landing-page button,
        .landing-page .btn,
        .landing-page [role="button"] {
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }

        .landing-page button *,
        .landing-page .btn *,
        .landing-page [role="button"] * {
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }

        .landing-page button:hover,
        .landing-page .btn:hover,
        .landing-page [role="button"]:hover {
          cursor: pointer !important;
        }

        .landing-page button:focus,
        .landing-page .btn:focus,
        .landing-page [role="button"]:focus {
          cursor: pointer !important;
        }

        .landing-page button:active,
        .landing-page .btn:active,
        .landing-page [role="button"]:active {
          cursor: pointer !important;
        }

        /* Prevent text selection on interactive elements */
        .landing-page .navbar-brand-custom,
        .landing-page .company-name,
        .landing-page .hero-title,
        .landing-page .section-title,
        .landing-page .cta-title {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        /* Custom Maroon Color Variables */
        :root {
          --maroon-primary: #800020;
          --maroon-secondary: #A0002A;
          --maroon-light: #B33A3A;
          --maroon-dark: #600018;
        }

        .text-maroon {
          color: var(--maroon-primary) !important;
        }

        .text-maroon-light {
          color: var(--maroon-light) !important;
        }

        /* Top Navigation */
        .custom-navbar {
          background: linear-gradient(135deg, var(--maroon-primary) 0%, var(--maroon-secondary) 100%);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 20px rgba(128, 0, 32, 0.3);
          padding: 1rem 0;
        }

        .navbar-brand-custom {
          color: white !important;
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none;
          cursor: default;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .navbar-brand-custom:hover {
          color: white !important;
          text-decoration: none;
          cursor: default;
        }

        .navbar-brand-custom:focus {
          color: white !important;
          text-decoration: none;
          outline: none;
          cursor: default;
        }

        .brand-text {
          background: linear-gradient(45deg, #fff, #f8f9fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-btn-nav {
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
          color: white !important;
          background: transparent !important;
          font-weight: 600;
          padding: 0.5rem 1.5rem;
          border-radius: 25px;
          transition: background-color 0.2s ease, border-color 0.2s ease !important;
          cursor: pointer !important;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          transform: none !important;
        }

        .login-btn-nav:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
          color: white !important;
          cursor: pointer !important;
          transform: none !important;
        }

        .login-btn-nav:focus {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3) !important;
          cursor: pointer !important;
          transform: none !important;
        }

        .login-btn-nav:active {
          cursor: pointer !important;
          transform: none !important;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, var(--maroon-primary) 0%, var(--maroon-secondary) 50%, var(--maroon-light) 100%);
          color: white;
          position: relative;
          overflow: hidden;
          min-height: 100vh;
        }

        .hero-background::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .company-name {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0;
          background: linear-gradient(45deg, #fff, #f8f9fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .hero-subtitle {
          font-size: 1.25rem;
          opacity: 0.9;
          line-height: 1.6;
        }

        .hero-btn-primary {
          background: white !important;
          color: var(--maroon-primary) !important;
          border: none !important;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: box-shadow 0.2s ease, background-color 0.2s ease !important;
          cursor: pointer !important;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          transform: none !important;
        }

        .hero-btn-primary:hover {
          background: #f8f9fa !important;
          color: var(--maroon-primary) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
          cursor: pointer !important;
          transform: none !important;
        }

        .hero-btn-primary:focus {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.3) !important;
          cursor: pointer !important;
          transform: none !important;
        }

        .hero-btn-primary:active {
          cursor: pointer !important;
          transform: none !important;
        }

        .hero-btn-secondary {
          border: 2px solid rgba(255, 255, 255, 0.5) !important;
          color: white !important;
          background: transparent !important;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          transition: background-color 0.2s ease, border-color 0.2s ease !important;
          cursor: pointer !important;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          transform: none !important;
        }

        .hero-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: white !important;
          color: white !important;
          cursor: pointer !important;
          transform: none !important;
        }

        .hero-btn-secondary:focus {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3) !important;
          cursor: pointer !important;
          transform: none !important;
        }

        .hero-btn-secondary:active {
          cursor: pointer !important;
          transform: none !important;
        }

        .stat-item {
          padding: 1rem;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #ffd700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-bottom: 0;
        }

        /* Dashboard Preview */
        .dashboard-preview {
          position: relative;
          z-index: 2;
          max-width: 500px;
          margin: 0 auto;
        }

        .preview-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
          transition: transform 0.3s ease;
        }

        .preview-card:hover {
          transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
        }

        .preview-header {
          background: #f8f9fa;
          padding: 1rem;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #e9ecef;
        }

        .preview-dots {
          display: flex;
          gap: 0.5rem;
          margin-right: 1rem;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27ca3f; }

        .preview-title {
          font-weight: 600;
          color: #495057;
          font-size: 0.9rem;
        }

        .preview-content {
          padding: 2rem;
        }

        .preview-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-card i {
          font-size: 1.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #495057;
        }

        .stat-name {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .preview-chart {
          display: flex;
          align-items: end;
          gap: 0.5rem;
          height: 100px;
        }

        .chart-bar {
          flex: 1;
          background: linear-gradient(to top, var(--maroon-primary), var(--maroon-light));
          border-radius: 4px 4px 0 0;
          animation: growUp 1s ease-out;
        }

        @keyframes growUp {
          from { height: 0; }
          to { height: var(--height); }
        }

        /* Features Section */
        .features-section {
          background: #f8f9fa;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--maroon-primary);
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: #6c757d;
          max-width: 600px;
          margin: 0 auto;
        }

        .feature-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid rgba(128, 0, 32, 0.1);
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(128, 0, 32, 0.2) !important;
        }

        .feature-icon {
          margin-bottom: 1.5rem;
        }

        .feature-title {
          font-weight: 600;
          color: var(--maroon-primary);
          margin-bottom: 1rem;
        }

        .feature-description {
          color: #6c757d;
          line-height: 1.6;
        }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, var(--maroon-dark) 0%, var(--maroon-primary) 50%, var(--maroon-secondary) 100%);
          color: white;
        }

        .cta-title {
          font-size: 2.5rem;
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .cta-subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .cta-btn {
          background: white;
          color: var(--maroon-primary);
          border: none;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .cta-btn:hover {
          background: #f8f9fa;
          color: var(--maroon-primary);
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          cursor: pointer;
        }

        .cta-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.3);
          cursor: pointer;
        }

        .cta-btn:active {
          transform: translateY(-1px);
          cursor: pointer;
        }

        /* Footer */
        .footer-section {
          background: var(--maroon-dark);
          color: #adb5bd;
        }

        .footer-brand {
          font-size: 1.1rem;
          font-weight: 500;
          color: white;
        }

        .footer-text {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .footer-links {
          font-size: 0.9rem;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }

          .company-name {
            font-size: 1.8rem;
          }

          .section-title {
            font-size: 2rem;
          }

          .cta-title {
            font-size: 2rem;
          }

          .preview-stats {
            flex-direction: column;
          }

          .hero-buttons .btn {
            display: block;
            width: 100%;
            margin-bottom: 1rem;
          }

          .custom-navbar {
            padding: 0.5rem 0;
          }

          .navbar-brand-custom {
            font-size: 1.2rem;
          }
        }

        /* Prevent cursor flickering and animation conflicts */
        .landing-page * {
          -webkit-backface-visibility: hidden;
          -moz-backface-visibility: hidden;
          -ms-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        /* Remove all transform animations that cause flickering */
        .landing-page button,
        .landing-page .btn {
          will-change: auto !important;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          transform: none !important;
        }

        .landing-page button:hover,
        .landing-page .btn:hover {
          transform: none !important;
        }

        .landing-page button:active,
        .landing-page .btn:active {
          transform: none !important;
        }

        .landing-page button:focus,
        .landing-page .btn:focus {
          transform: none !important;
        }

        /* Override Bootstrap button transforms */
        .btn:hover,
        .btn:focus,
        .btn:active {
          transform: none !important;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;