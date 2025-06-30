I want to plan the implementation for Github issue: $ARGUMENTS. Your role is to THINK about a solution for the given issue and generate a TODO list in a file called .claude/workspace/issue-$ARGUMENTS-plan.md that includes all the context needed for Claude Code to be able to carry out the implementation of the Github issue.

CRITICAL: Do NOT implement the ticket. Your ONLY role is to analyze and plan. You must STOP after writing the plan to the file.

## Process:

1. **Analyze Context**: Review the `docs/PROJECT_OVERVIEW.md` and `ARCHITECTURE.md` files to understand the project context
2. **Review Issue**: Use the Github CLI (`gh issue view $ARGUMENTS`) to get the full issue details
3. **Research Codebase**: Use search tools to understand the relevant parts of the codebase
4. **Create Plan**: Develop a comprehensive implementation plan with detailed tasks
5. **Present Plan**: Show the plan and ask for feedback
6. **Write Plan File**: Once approved, write the plan to `.claude/workspace/issue-$ARGUMENTS-plan.md`
7. **STOP**: Do not proceed with implementation - that's a separate task

## Plan Requirements:

- Break down the issue into specific, actionable tasks
- Include context about existing code patterns and architecture
- Use Test Driven Development approach (write tests before implementation)
- Specify files to create/modify
- Include validation and error handling requirements
- Add testing strategy and acceptance criteria

IMPORTANT: After writing the plan file, your task is COMPLETE. Do not start implementing the code.
