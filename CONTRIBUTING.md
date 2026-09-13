# Contributing

Contributions are welcome on the schema and on anything that is plainly a bug.

## Terms

By submitting a pull request, issue, patch, suggestion or other contribution to
this repository, you agree that:

1. **You wrote it, or you have the right to submit it.** If it is someone
   else's work, say so and name the licence it came under.

2. **Your contribution is licensed to the project under this repository's
   terms**, as set out in `LICENSE` — MIT for `freshcontext.schema.json`, and a
   perpetual, worldwide, irrevocable, royalty-free licence to use, modify and
   distribute it as part of this project for everything else.

3. **No compensation, equity, ownership interest, revenue share or future
   consideration of any kind arises from contributing.** Contributions are
   voluntary. Nothing in this repository, and no discussion about it, creates a
   partnership, joint venture, employment or agency relationship.

4. **Feedback is not a contribution of ownership.** Comments, ideas, bug
   reports, feature suggestions and review remarks may be used freely and
   without attribution or payment.

Point 3 and point 4 are stated because they are usually left implicit, and
"usually implicit" is exactly what becomes expensive to establish years later.
They are not a comment on anyone who has contributed — at the time of writing,
every commit in this repository was authored by the maintainer.

## Practically

- Run `npm ci` then `npm run check` before opening a pull request.
- The schema is a **mirror**. Its canonical copy lives in `freshcontext-mcp`
  beside the specification and the validator. Change it there and copy it
  across; CI fails the pull request if the two disagree.
- A pull request gets a Cloudflare preview URL, so a visual change can be
  looked at rather than guessed at.
