# Contributing to AIC²

AIC² uses a modular adapter pattern that makes it easy to add new AI CLI tools.

## Project Structure

```
src/
├── adapters/
│   ├── base.ts              # ToolAdapter interface & registry
│   ├── claude.ts            # Claude Code adapter
│   ├── gemini.ts            # Gemini CLI adapter
│   ├── index.ts             # Exports all adapters
│   └── template.ts.example  # Template for new adapters
├── sdk-session.ts           # Interactive session & command handling
├── index.ts                 # CLI entry point
├── config.ts                # Configuration management (~/.aic/)
├── utils.ts                 # Utility functions
└── version.ts               # Version (reads from package.json)
```

## Development Setup

```bash
git clone https://github.com/jacob-bd/ai-code-connect.git
cd ai-code-connect
npm install
npm run build
npm link  # Makes 'aic' available globally
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run in development mode (tsx) |
| `npm run build` | Compile TypeScript |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npx tsc --noEmit` | Type-check without building |

## Adding New AI CLI Tools

### Step 1: Create the Adapter

Copy the template and create your adapter:

```bash
cp src/adapters/template.ts.example src/adapters/codex.ts
```

Edit `src/adapters/codex.ts`:

```typescript
import { ToolAdapter, SendOptions } from './base.js';
import { commandExists, stripAnsi } from '../utils.js';
import { spawn } from 'child_process';

export class CodexAdapter implements ToolAdapter {
  readonly name = 'codex';           // Used in /codex command
  readonly displayName = 'OpenAI Codex';  // Shown in UI
  
  private hasActiveSession = false;

  async isAvailable(): Promise<boolean> {
    return commandExists('codex');  // Check if CLI is installed
  }

  getCommand(prompt: string, options?: SendOptions): string[] {
    const args: string[] = [];
    
    // Add your tool's session continuation flag
    if (this.hasActiveSession) {
      args.push('--continue');  // Adjust for your tool
    }

    args.push(prompt);
    return ['codex', ...args];
  }

  async send(prompt: string, options?: SendOptions): Promise<string> {
    // Implement sending prompt and capturing response
    // See template.ts.example for full implementation
  }

  resetContext(): void {
    this.hasActiveSession = false;
  }

  hasSession(): boolean {
    return this.hasActiveSession;
  }

  setHasSession(value: boolean): void {
    this.hasActiveSession = value;
  }
}
```

### Step 2: Register the Adapter

Edit `src/adapters/index.ts`:

```typescript
export { ToolAdapter, SendOptions, AdapterRegistry } from './base.js';
export { ClaudeAdapter } from './claude.js';
export { GeminiAdapter } from './gemini.js';
export { CodexAdapter } from './codex.js';  // Add this line
```

Edit `src/index.ts`:

```typescript
import { AdapterRegistry, ClaudeAdapter, GeminiAdapter, CodexAdapter } from './adapters/index.js';

const registry = new AdapterRegistry();
registry.register(new ClaudeAdapter());
registry.register(new GeminiAdapter());
registry.register(new CodexAdapter());  // Add this line
```

### Step 3: Add to SDK Session

Edit `src/sdk-session.ts`. There are several places to update:

**Quick summary of changes needed:**
- Add to `AVAILABLE_TOOLS` array
- Add to `activeTool` type union
- Add session tracking flag
- Add to `sendToTool()` if/else
- Create `sendToCodex()` method (copy from `sendToClaude`)
- Add to command menu
- Add to `handleMetaCommand` switch

**Tip for AI-assisted development:** If you're using Claude Code or similar, just say:
> "Add a new tool called 'codex' for OpenAI Codex CLI. Follow the pattern used for claude and gemini in sdk-session.ts"

The AI will find all the relevant locations and make the changes.

**Manual steps if needed:**

1. **Add to AVAILABLE_TOOLS array** (search for `AVAILABLE_TOOLS`):
```typescript
{ name: 'codex', displayName: 'OpenAI Codex', color: colors.brightGreen },
```

2. **Add session flag** (search for `claudeHasSession`):
```typescript
private codexHasSession = false;
```

3. **Add send method** - Copy `sendToClaude()` and modify:
   - Change spinner text
   - Change CLI command and flags for Codex
   - Update session flag name

4. **Add to sendToTool()** (search for `sendToTool`):
```typescript
} else if (this.activeTool === 'codex') {
  response = await this.sendToCodex(message);
}
```

5. **Add to command menu** (search for `AIC_COMMANDS`):
```typescript
{ value: '/codex', name: '/codex         Switch to Codex', description: 'Switch to OpenAI Codex' },
```

6. **Add to handleMetaCommand** (search for `case 'gemini'`):
```typescript
case 'codex':
  this.activeTool = 'codex';
  console.log(`● Switched to ${colors.brightGreen}OpenAI Codex${colors.reset}`);
  break;
```

### Step 4: Build and Test

```bash
npm run build
aic tools  # Verify new tool shows up
aic        # Test switching to new tool with /codex
```

## Key Considerations

### Session Continuation
Each CLI tool handles session continuation differently:
- **Claude Code**: `--continue` flag
- **Gemini CLI**: `--resume latest` flag
- **Your tool**: Check your tool's documentation

### Forward Behavior
The `/forward` command behavior changes based on how many tools are registered:
- **2 tools**: `/forward` auto-selects the other tool (no argument needed)
- **3+ tools**: User must specify target: `/forward <tool> [message]`

This is handled automatically—no additional code needed when adding tools.

### Interactive Mode
For interactive mode (`/i`), the tool needs to support running in a PTY.
Most CLI tools do, but check if yours has any special requirements.

### Colors
Pick a distinctive color for your tool's UI elements.
Available: `brightCyan`, `brightMagenta`, `brightYellow`, `brightGreen`, `brightBlue`, `brightRed`

## Example: Full Codex Integration

See the template file for a complete working example:
```
src/adapters/template.ts.example
```

## Code Guidelines

### Versioning

Version is managed in `package.json` only. The `src/version.ts` file reads from package.json at runtime, ensuring a single source of truth.

```typescript
// src/version.ts - DO NOT hardcode versions elsewhere
import { VERSION } from './version.js';
```

### Code Style

- **TypeScript**: Use strict types, avoid `any`
- **Imports**: Use `.js` extensions for relative imports (ESM requirement)
- **Async**: Use `async/await` over raw promises
- **Constants**: Extract magic numbers to named constants
- **Cleanup**: Always use `try/finally` for resource cleanup

### Testing

Tests live alongside source files with `.test.ts` suffix:

```bash
npm test           # Run once
npm run test:watch # Watch mode
```

Add tests for any new utility functions. Integration tests for adapters are optional but appreciated.

### Security Considerations

- **Input validation**: Validate command names before shell execution
- **No shell interpolation**: Use `spawn()` with arrays, not `exec()` with strings
- **File permissions**: Config files should use mode `0o600`

## Questions?

The adapter pattern is designed to be flexible. If your tool has unique requirements,
you can extend the `ToolAdapter` interface or add tool-specific methods.

Open an issue at [github.com/jacob-bd/ai-code-connect/issues](https://github.com/jacob-bd/ai-code-connect/issues) for questions or feature requests.
