# Contributing to Diamond

We're thrilled you're interested in contributing to Diamond! This guide will help you get started.

## Quick Start

1. **Fork and clone**
   ```bash
   gh repo fork basalt-ai/diamond --clone
   cd diamond
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Make your changes and test**
   ```bash
   npm run build
   npm run lint
   npm test
   ```

## Development Setup

### Prerequisites

- **Node.js** 20+ and npm
- **TypeScript** 5.7+
- **Git** with GitHub CLI (`gh`) recommended

### Project Structure

```
diamond/
├── src/
│   ├── core/          # Core domain and scenario logic
│   ├── evolution/     # Dataset evolution engine
│   ├── analysis/      # Coverage and heterogeneity analysis
│   ├── export/        # Export to evaluation platforms
│   └── cli/           # Command-line interface
├── examples/          # Example scenarios and domains
├── docs/              # Documentation
└── tests/             # Test files
```

### Running Locally

```bash
# Build and watch for changes
npm run dev

# Run CLI locally
./bin/diamond.js --help

# Run specific tests
npm test -- --grep "scenario generation"
```

## What We're Looking For

### High Priority
- **New domain templates** for common use cases (e.g., code generation, summarization)
- **Export integrations** for evaluation platforms (Weights & Biases, MLflow, etc.)
- **Evolution algorithms** for smarter dataset updates from logs
- **Performance optimizations** for large-scale scenario generation

### Medium Priority
- **Documentation improvements** and examples
- **CLI UX enhancements** 
- **Test coverage** improvements
- **Bug fixes** and error handling

### Low Priority
- **New analysis metrics** for dataset quality
- **UI components** for the review interface
- **Integration examples** with ML frameworks

## Contribution Guidelines

### Code Style

We use Biome for linting and formatting:

```bash
# Check formatting and lints
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

**Key conventions:**
- Use TypeScript with strict settings
- Prefer composition over inheritance
- Write self-documenting code with clear variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add coverage analysis for multi-dimensional domains
fix: handle empty scenario templates gracefully  
docs: update quickstart with log evolution example
test: add integration tests for scenario generation
```

### Pull Request Process

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make focused changes** - one feature/fix per PR

3. **Add tests** for new functionality
   ```bash
   # Add tests in tests/
   npm test -- --coverage
   ```

4. **Update docs** if you change APIs or add features

5. **Ensure CI passes**
   - All tests pass
   - Linting passes  
   - Type checking passes
   - Coverage doesn't decrease

6. **Write a clear PR description**
   - What does this change?
   - Why is it needed?
   - How was it tested?
   - Any breaking changes?

### Testing

We use Jest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/scenario.test.ts

# Generate coverage report
npm test -- --coverage
```

**Test categories:**
- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test component interactions  
- **E2E tests**: Test CLI and full workflows
- **Snapshot tests**: Test generated outputs

### Documentation

Update docs when you:
- Add new features or APIs
- Change existing behavior
- Fix bugs that affect usage

```bash
# Build docs locally
npm run docs:build

# Serve docs for development
npm run docs:dev
```

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/basalt-ai/diamond/discussions)
- **Found a bug?** [File an issue](https://github.com/basalt-ai/diamond/issues)
- **Need real-time help?** Join our [Discord](https://discord.gg/yW2RyZKY)

## Code of Conduct

Be respectful, inclusive, and constructive. We're building tools to make AI development better for everyone.

Key principles:
- **Be kind** - Assume good intent
- **Be helpful** - Share knowledge generously
- **Be professional** - Keep discussions on-topic
- **Be patient** - Not everyone has the same experience level

## Recognition

Contributors are recognized in:
- **README.md** - Major contributors listed
- **Release notes** - Contributors credited for their changes
- **Discord** - Special contributor role and channel access

## Questions?

Don't hesitate to ask! Open a discussion, join Discord, or ping @basalt-ai in your PR.

Thanks for contributing to Diamond! 🚀