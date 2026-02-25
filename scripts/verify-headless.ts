
import { ProjectScanner } from '@main/services/discovery/ProjectScanner';
import { SessionParser } from '@main/services/parsing/SessionParser';
import { LocalFileSystemProvider } from '@main/services/infrastructure/LocalFileSystemProvider';
import { createLogger } from '@shared/utils/logger';

async function main() {
  console.log('Verifying headless execution...');

  // Initialize services
  const fsProvider = new LocalFileSystemProvider();
  const scanner = new ProjectScanner(undefined, undefined, fsProvider);
  const parser = new SessionParser(scanner);

  console.log('ProjectScanner and SessionParser initialized.');

  // Check if projects directory exists
  const projectsDir = scanner.getProjectsDir();
  console.log(`Scanning projects directory: ${projectsDir}`);
  const exists = await scanner.projectsDirExists();
  console.log(`Projects directory exists: ${exists}`);

  if (exists) {
    console.log('Scanning for projects...');
    const projects = await scanner.scan();
    console.log(`Found ${projects.length} projects.`);

    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log(`First Project: ${firstProject.name} (${firstProject.id})`);

      console.log('Listing sessions for first project...');
      const sessions = await scanner.listSessions(firstProject.id);
      console.log(`Found ${sessions.length} sessions.`);

      if (sessions.length > 0) {
        const firstSession = sessions[0];
        console.log(`Parsing session: ${firstSession.id}`);
        // We need to resolve the project path properly, handled by parser internally via scanner
        // But parser.parseSession takes (projectId, sessionId)
        const parsed = await parser.parseSession(firstProject.id, firstSession.id);

        console.log('Session parsed successfully!');
        console.log(`Message Count: ${parsed.metrics.messageCount}`);
        console.log(`Duration: ${parsed.metrics.durationMs}ms`);
      }
    }
  } else {
    console.log('No projects directory found. This is expected in a fresh environment.');
  }

  console.log('Headless verification complete.');
}

main().catch(err => {
  console.error('Headless verification failed:', err);
  process.exit(1);
});
