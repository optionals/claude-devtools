
import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { Project } from '@main/types';

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelect }) => {
  if (projects.length === 0) {
    return <Text color="yellow">No projects found in ~/.claude/projects</Text>;
  }

  const items = projects.map((p) => ({
    label: `${p.name} (${p.sessions.length} sessions)`,
    value: p.id,
  }));

  const handleSelect = (item: { value: string }) => {
    const project = projects.find((p) => p.id === item.value);
    if (project) {
      onSelect(project);
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Select a Project:</Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={handleSelect}
      />
    </Box>
  );
};
