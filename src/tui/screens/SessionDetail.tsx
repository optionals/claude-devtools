
import React, { useEffect, useState } from 'react';
import { Box, Text, Newline } from 'ink';
import type { SessionParser, ParsedSession } from '@main/services/parsing/SessionParser';
import type { Project, Session } from '@main/types';

interface SessionDetailProps {
  parser: SessionParser;
  project: Project;
  session: Session;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({ parser, project, session }) => {
  const [data, setData] = useState<ParsedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    parser.parseSession(project.id, session.id)
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [project.id, session.id, parser]);

  if (loading) return <Text>Parsing session...</Text>;
  if (error) return <Text color="red">Error: {error}</Text>;
  if (!data) return <Text>No data.</Text>;

  const { metrics, messages } = data;

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold underline>Session Detail: {session.id}</Text>
      <Newline />

      <Box flexDirection="column" marginBottom={1}>
        <Text color="green">Metrics:</Text>
        <Text>Duration: {(metrics.durationMs / 1000).toFixed(2)}s</Text>
        <Text>Total Tokens: {metrics.totalTokens}</Text>
        <Text>Cost: ${(metrics.costUsd ?? 0).toFixed(4)}</Text>
        <Text>Messages: {metrics.messageCount}</Text>
      </Box>

      <Text color="cyan">Last 3 Messages:</Text>
      <Box flexDirection="column">
        {messages.slice(-3).map((msg, i) => (
          <Box key={msg.uuid || i} borderStyle="single" flexDirection="column" paddingX={1}>
            <Text bold color={msg.type === 'user' ? 'blue' : 'magenta'}>
              {msg.type.toUpperCase()} ({msg.role || 'unknown'})
            </Text>
            <Text>
              {typeof msg.content === 'string'
                ? msg.content.substring(0, 200)
                : Array.isArray(msg.content)
                  ? JSON.stringify(msg.content).substring(0, 200)
                  : ''}
              ...
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
