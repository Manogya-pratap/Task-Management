import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card, Navbar, Nav } from 'react-bootstrap';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleLearnMoreClick = () => {
    const featuresSection = document.querySelector('.features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Global CSS to prevent flickering */}
      <style>{`
        /* Reset all animations and transforms */
        * {
          -webkit-transform: none !important;
          -moz-transform: none !important;
          -ms-transform: none !important;
          -o-transform: none !important;
          transform: none !important;
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -ms-transition: none !important;
          -o-transition: none !important;
          transition: none !important;
          -webkit-animation: none !important;
          -moz-animation: none !important;
          -ms-animation: none !important;
          -o-animation: none !important;
          animation: none !important;
        }

        /* Simple button styles */
        .simple-btn {
          cursor: pointer !important;
          border: none !important;
          outline: none !important;
          user-select: none !important;
        }

        .simple-btn:hover,
        .simple-btn:focus,
        .simple-btn:active {
          cursor: pointer !important;
          outline: none !important;
        }

        /* Maroon theme colors */
        .maroon-bg {
          background: linear-gradient(135deg, #800020 0%, #A0002A 50%, #B33A3A 100%);
        }

        .maroon-dark-bg {
          background: #600018;
        }

        .maroon-text {
          color: #800020;
        }

        /* Navigation */
        .top-nav {
          background: linear-gradient(135deg, #800020 0%, #A0002A 100%);
          padding: 1rem 0;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
        }

        .nav-brand {
          color: white !important;
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none !important;
          cursor: default !important;
        }

        .nav-login-btn {
          background: transparent !important;
          border: 2px solid rgba(255, 255, 255, 0.5) !important;
          color: white !important;
          font-weight: 600;
          padding: 0.5rem 1.5rem;
          border-radius: 25px;
          cursor: pointer !important;
        }

        .nav-login-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          cursor: pointer !important;
        }

        /* Hero section */
        .hero {
          background: linear-gradient(135deg, #800020 0%, #A0002A 50%, #B33A3A 100%);
          color: white;
          min-height: 100vh;
          padding-top: 80px;
        }

        .hero-btn-primary {
          background: white !important;
          color: #800020 !important;
          border: none !important;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          cursor: pointer !important;
        }

        .hero-btn-primary:hover {
          background: #f8f9fa !important;
          color: #800020 !important;
          cursor: pointer !important;
        }

        .hero-btn-secondary {
          background: transparent !important;
          border: 2px solid rgba(255, 255, 255, 0.5) !important;
          color: white !important;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          cursor: pointer !important;
        }

        .hero-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          cursor: pointer !important;
        }

        /* Features section */
        .features {
          background: #f8f9fa;
          padding: 5rem 0;
        }

        .feature-icon {
          color: #800020;
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }

        .feature-title {
          color: #800020;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        /* CTA section */
        .cta {
          background: linear-gradient(135deg, #600018 0%, #800020 50%, #A0002A 100%);
          color: white;
          padding: 5rem 0;
        }

        .cta-btn {
          background: white !important;
          color: #800020 !important;
          border: none !important;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          cursor: pointer !important;
        }

        .cta-btn:hover {
          background: #f8f9fa !important;
          color: #800020 !important;
          cursor: pointer !important;
        }

        /* Footer */
        .footer {
          background: #600018;
          color: #adb5bd;
          padding: 2rem 0;
        }

        /* Dashboard preview */
        .preview-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          max-width: 500px;
          margin: 0 auto;
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

        .preview-content {
          padding: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .stat-card i {
          font-size: 1.5rem;
          color: #800020;
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

        .chart-bars {
          display: flex;
          align-items: end;
          gap: 0.5rem;
          height: 100px;
          margin-top: 1rem;
        }

        .chart-bar {
          flex: 1;
          background: linear-gradient(to top, #800020, #B33A3A);
          border-radius: 4px 4px 0 0;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2rem;
          }
          
          .hero h2 {
            font-size: 1.5rem;
          }
          
          .hero-btn-primary,
          .hero-btn-secondary {
            display: block;
            width: 100%;
            margin-bottom: 1rem;
          }
        }
      `}</style>

      <div className="landing-page">
        {/* Top Navigation */}
        <Navbar className="top-nav" expand="lg">
          <Container>
            <Navbar.Brand className="nav-brand">
              <i className="fas fa-building me-2"></i>
              Yantrik Automation Pvt. Ltd.
            </Navbar.Brand>
            
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ms-auto">
                <Button 
                  className="nav-login-btn simple-btn"
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
        <section className="hero">
          <Container>
            <Row className="min-vh-100 align-items-center">
              <Col lg={6} className="text-center text-lg-start">
                <div className="mb-4">
                  <i className="fas fa-building fa-3x text-white mb-3"></i>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'white' }}>
                    Yantrik Automation Pvt. Ltd.
                  </h1>
                </div>
                
                <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1.5rem', color: 'white' }}>
                  Daily Activity Tracker
                </h2>
                
                <p style={{ fontSize: '1.25rem', opacity: '0.9', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Streamline your workflow, manage projects efficiently, and boost team productivity 
                  with our comprehensive task management system.
                </p>
                
                <div className="mb-4">
                  <Button 
                    className="hero-btn-primary simple-btn me-3 mb-3"
                    size="lg"
                    onClick={handleLoginClick}
                  >
                    <i className="fas fa-sign-in-alt me-2"></i>
                    Employee Login
                  </Button>
                  
                  <Button 
                    className="hero-btn-secondary simple-btn mb-3"
                    size="lg"
                    onClick={handleLearnMoreClick}
                  >
                    <i className="fas fa-info-circle me-2"></i>
                    Learn More
                  </Button>
                </div>
                
                <Row className="mt-5">
                  <Col xs={4} className="text-center">
                    <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#ffd700' }}>100+</h3>
                    <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>Projects</p>
                  </Col>
                  <Col xs={4} className="text-center">
                    <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#ffd700' }}>50+</h3>
                    <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>Team Members</p>
                  </Col>
                  <Col xs={4} className="text-center">
                    <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#ffd700' }}>99%</h3>
                    <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>Uptime</p>
                  </Col>
                </Row>
              </Col>
              
              <Col lg={6} className="text-center">
                <div className="preview-card">
                  <div className="preview-header">
                    <div className="preview-dots">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                    </div>
                    <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem' }}>
                      Task Management Dashboard
                    </div>
                  </div>
                  <div className="preview-content">
                    <div className="stat-card">
                      <i className="fas fa-project-diagram"></i>
                      <div>
                        <div className="stat-value">24</div>
                        <div className="stat-name">Active Projects</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <i className="fas fa-tasks"></i>
                      <div>
                        <div className="stat-value">156</div>
                        <div className="stat-name">Tasks</div>
                      </div>
                    </div>
                    <div className="chart-bars">
                      <div className="chart-bar" style={{height: '60%'}}></div>
                      <div className="chart-bar" style={{height: '80%'}}></div>
                      <div className="chart-bar" style={{height: '45%'}}></div>
                      <div className="chart-bar" style={{height: '90%'}}></div>
                      <div className="chart-bar" style={{height: '70%'}}></div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        {/* Features Section */}
        <section className="features features-section">
          <Container>
            <Row className="text-center mb-5">
              <Col>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#800020', marginBottom: '1rem' }}>
                  Powerful Features
                </h2>
                <p style={{ fontSize: '1.1rem', color: '#6c757d', maxWidth: '600px', margin: '0 auto' }}>
                  Everything you need to manage your projects and team effectively
                </p>
              </Col>
            </Row>
            
            <Row>
              <Col md={4} className="mb-4">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body className="text-center p-4">
                    <i className="fas fa-project-diagram feature-icon"></i>
                    <h5 className="feature-title">Project Management</h5>
                    <p style={{ color: '#6c757d', lineHeight: '1.6' }}>
                      Create, organize, and track projects with intuitive tools and real-time updates.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={4} className="mb-4">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body className="text-center p-4">
                    <i className="fas fa-users feature-icon"></i>
                    <h5 className="feature-title">Team Collaboration</h5>
                    <p style={{ color: '#6c757d', lineHeight: '1.6' }}>
                      Foster teamwork with shared workspaces, comments, and real-time notifications.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={4} className="mb-4">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body className="text-center p-4">
                    <i className="fas fa-chart-line feature-icon"></i>
                    <h5 className="feature-title">Analytics & Reports</h5>
                    <p style={{ color: '#6c757d', lineHeight: '1.6' }}>
                      Get insights into productivity with detailed analytics and progress reports.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="cta">
          <Container>
            <Row className="text-center">
              <Col>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
                  Ready to Get Started?
                </h2>
                <p style={{ fontSize: '1.1rem', opacity: '0.9', marginBottom: '2rem' }}>
                  Join your team and start managing projects more efficiently today.
                </p>
                <Button 
                  className="cta-btn simple-btn"
                  size="lg"
                  onClick={handleLoginClick}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Access Your Dashboard
                </Button>
              </Col>
            </Row>
          </Container>
        </section>

        {/* Footer */}
        <footer className="footer">
          <Container>
            <Row className="align-items-center">
              <Col md={6}>
                <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'white', marginBottom: '0.5rem' }}>
                  <i className="fas fa-building me-2"></i>
                  <strong>Yantrik Automation Pvt. Ltd.</strong>
                </div>
                <p style={{ fontSize: '0.9rem', opacity: '0.8', marginBottom: '0' }}>
                  Empowering teams with intelligent automation solutions.
                </p>
              </Col>
              <Col md={6} className="text-md-end">
                <Button 
                  variant="link" 
                  className="text-light p-0 me-3"
                  onClick={handleLoginClick}
                  style={{ textDecoration: 'none' }}
                >
                  Employee Login
                </Button>
                <span style={{ fontSize: '0.9rem', opacity: '0.75' }}>
                  © 2024 Yantrik Automation. All rights reserved.
                </span>
              </Col>
            </Row>
          </Container>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;