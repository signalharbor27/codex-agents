# Tracer Bullets

Read this when greenfield or large feature work needs the first production-shaped slice.

Source: Hunt and Thomas, *The Pragmatic Programmer*.

## Rule

A tracer bullet is not a throwaway prototype. It becomes part of the system.

## Shape

- Use the real entrypoint.
- Cross the real integration boundary.
- Include minimal persistence or state when that is part of the real flow.
- Prove one narrow behavior end to end with one verification command.
- Keep scope thin enough to finish and learn from before architecture hardens.

## Use It To Learn

- integration shape
- workflow and developer ergonomics
- verification command
- module and interface pressure
- what can stay simple

## Avoid

- horizontal layer scaffolding with no end-to-end behavior
- fake interfaces that will be thrown away
- locking broad architecture before the first real path works
