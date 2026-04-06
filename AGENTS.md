# Agent Instructions

## Release Workflow

When committing changes to this repo, always:

1. Commit the changes
2. Tag the commit as `v{next version}` (check existing tags with `git tag`)
3. Push with tags to `origin` (GitHub)
4. Create a GitHub release: `gh release create v{version} --generate-notes`
