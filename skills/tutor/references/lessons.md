# Lessons, reference documents, and assets

How to build the HTML a tutoring workspace accumulates. Lessons carry new knowledge; the Socratic loop in the chat builds skill and earns levels, so a lesson quiz is practice and never level evidence on its own.

## Lessons

- One self-contained HTML file in `lessons/`, named `0001-slug.html`, numbered one past the highest existing lesson.
- Short enough to finish in one sitting, teaching one tightly scoped thing that gives the user one tangible win toward the mission. Working memory is small, so include only the knowledge the target skill needs.
- Cite every claim with a link to a source in `RESOURCES.md`, and recommend one primary source to read or watch next.
- Link to related lessons and reference documents with HTML anchors.
- Use glossary terms. Follow `NOTES.md`.
- Include practice with immediate feedback: a quiz, a small in-browser task, or a list of real-world steps (poses, exercises, commands) with what success looks like.
- Close by reminding the user to bring questions back to the chat, where practice continues.
- Clean typography that prints well (think Tufte), because the user returns to these.
- Open the file for the user with a CLI command when one is available.

## Quizzes

- Give every option in a question the same number of words, and the same number of characters where possible.
- Shuffle the correct option's position across questions, ideally with a shared quiz component in `assets/` that randomizes order at render time.
- Keep formatting identical across options, so neither styling nor order reveals the answer.

## Reference documents

`reference/*.html` holds the compressed essence of the lessons, built for quick lookup: cheat sheets, syntax, algorithms and flowcharts, routines, glossaries rendered for print. Users rarely reopen lessons but return to these, so update them as lessons add material.

## Assets

`assets/` holds reusable components: the shared stylesheet, quiz widgets, simulators, diagram helpers. Read `assets/` before writing a lesson and build from what is there. When a lesson needs something a later lesson could reuse, write it as a component and link it. The shared stylesheet comes first, so every lesson looks like part of one course.
