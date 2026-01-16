import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import PendingApprovalsPanel from '../components/approvals/PendingApprovalsPanel';

const ApprovalsPage = () => {
  const { user } = useAuth();

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <PendingApprovalsPanel userRole={user?.role} />
        </Col>
      </Row>
    </Container>
  );
};

export default ApprovalsPage;
