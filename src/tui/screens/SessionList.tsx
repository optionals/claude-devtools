
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { ProjectScanner } from '@main/services/discovery/ProjectScanner';
import type { Project, Session } from '@main/types';

interface SessionListProps {
  scanner: ProjectScanner;
  project: Project;
  onSelect: (session: Session) => void;
}

export const SessionList: React.FC<SessionListProps> = ({ scanner, project, onSelect }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    scanner.listSessions(project.id).then((list) => {
      if (mounted) {
        setSessions(list);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [project.id, scanner]);

  if (loading) {
    return <Text>Loading sessions...</Text>;
  }

  if (sessions.length === 0) {
    return <Text color="yellow">No sessions found.</Text>;
  }

  const items = sessions.map((s) => ({
    label: `${new Date(s.createdAt).toLocaleString()} - ${s.firstMessage ? s.firstMessage.substring(0, 50) + '...' : '(No content)'} [${s.messageCount} msgs]`,
    value: s.id,
  }));

  const handleSelect = (item: { value: string }) => {
    const session = sessions.find((s) => s.id === item.value);
    if (session) {
      onSelect(session);
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Sessions for {project.name}:</Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={handleSelect}
      />
    </Box>
  );
};
