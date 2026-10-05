# GraphQL quota recovery

When a GitHub command reports exhausted GraphQL quota, switch the required reads to REST through `gh api` instead of retrying the same command.

1. Read `gh api rate_limit` once with a 30-second timeout. Check `resources.core.remaining` and `reset`; REST has its own quota. If it is exhausted, report the reset time and the pending read.
2. Set a request and page budget before fetching (for example, five requests total, one page per endpoint, 30 seconds per request). Drop `--paginate` and pass `per_page` and `page` explicitly so each request stays within the budget. Use explicit owner/repo and PR number. Read `repos/<owner>/<repo>/pulls/<n>` to pin `.head.sha` and current PR state.
3. Fetch only what the task needs: `repos/<owner>/<repo>/pulls/<n>/reviews`, `repos/<owner>/<repo>/pulls/<n>/comments`, `repos/<owner>/<repo>/issues/<n>/comments`, `repos/<owner>/<repo>/commits/<sha>/check-runs?per_page=100`, or `repos/<owner>/<repo>/commits/<sha>/status?per_page=100`. Compare returned counts and pagination links with the data read; report incomplete coverage when the budget cannot cover all pages. Check results apply only to the pinned head.
4. Stop on REST quota denial or another API error and report it. Re-read the PR head before using the results for an integration decision; a changed head invalidates the old checks. Reserve that read within the budget. REST recovery supplies evidence; publication and merge still require their existing authority and gates.
