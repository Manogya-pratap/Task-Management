import React from 'react';
import { Container, Row, Col, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import MyDailyLogs from '../components/logs/MyDailyLogs';
import TeamDailyLogs from '../components/logs/TeamDailyLogs';

const DailyLogsPage = () => {
  const { user } = useAuth();
  const canViewTeamLogs = ['TEAM_LEAD', 'MD', 'ADMIN'].includes(user?.role);

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          {canViewTeamLogs ? (
            <Tabs defaultActiveKey="my-logs" className="mb-3">
              <Tab eventKey="my-logs" title="My Logs">
                <MyDailyLogs />
              </Tab>
              <Tab eventKey="team-logs" title="Team Logs">
                <TeamDailyLogs userRole={user?.role} />
              </Tab>
            </Tabs>
          ) : (
            <MyDailyLogs />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default DailyLogsPage;
