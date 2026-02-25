
import React, { useState, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import { ProjectScanner } from '@main/services/discovery/ProjectScanner';
import { SessionParser } from '@main/services/parsing/SessionParser';
import { LocalFileSystemProvider } from '@main/services/infrastructure/LocalFileSystemProvider';
import { ProjectList } from './screens/ProjectList';
import { SessionList } from './screens/SessionList';
import { SessionDetail } from './screens/SessionDetail';
import type { Project, Session } from '@main/types';

type View = 'projects' | 'sessions' | 'detail';

export default function App() {
  const [view, setView] = useState<View>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Services
  const [scanner] = useState(() => new ProjectScanner(undefined, undefined, new LocalFileSystemProvider()));
  const [parser] = useState(() => new SessionParser(scanner));

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await scanner.scan();
      setProjects(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (view === 'detail') {
        setView('sessions');
        setSelectedSession(null);
      } else if (view === 'sessions') {
        setView('projects');
        setSelectedProject(null);
      } else {
        process.exit(0);
      }
    }
  });

  if (loading && view === 'projects') {
    return <Text>Loading projects...</Text>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">Claude DevTools TUI</Text>
        <Text> | </Text>
        <Text color="gray">ESC to go back/exit</Text>
      </Box>

      {view === 'projects' && (
        <ProjectList
          projects={projects}
          onSelect={(project) => {
            setSelectedProject(project);
            setView('sessions');
          }}
        />
      )}

      {view === 'sessions' && selectedProject && (
        <SessionList
          scanner={scanner}
          project={selectedProject}
          onSelect={(session) => {
            setSelectedSession(session);
            setView('detail');
          }}
        />
      )}

      {view === 'detail' && selectedProject && selectedSession && (
        <SessionDetail
          parser={parser}
          project={selectedProject}
          session={selectedSession}
        />
      )}
    </Box>
  );
}
