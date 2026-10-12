/**
 * HelpPage — composer for /app/help (Phase 5, HELP-01, HELP-02, D-08).
 *
 * Lists all help articles grouped by topic. Includes a live-debounced search
 * input (150ms via @mantine/hooks useDebouncedValue per D-08) that filters
 * articles by title + keywords + summary (body is NOT searched per D-08).
 *
 * Search behavior:
 *   - Empty query: render all articles via HelpList (topic-grouped).
 *   - Non-empty query with matches: render filtered articles via HelpList.
 *   - Non-empty query with zero matches: render HelpNoResultsState.
 *
 * No CRUD — Help content is static (D-09 static module, no localStorage key).
 *
 * Router note (D-07): HelpArticlePage is mounted as a flat sibling route
 * (/app/help/:slug) NOT a nested child, because this component has no
 * <Outlet /> — nesting would show both the list and detail simultaneously.
 * The flat sibling shape is explicitly accepted per UI-SPEC line 840.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { Stack, Title } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { pendo } from '../../../pendo/track'
import { listHelpArticles } from '../../../help/helpArticles'
import type { HelpArticle } from '../../../help/types'
import { HelpSearchInput } from '../../../help/components/HelpSearchInput'
import { HelpList } from '../../../help/components/HelpList'
import { HelpNoResultsState } from '../../../help/components/HelpNoResultsState'

/**
 * D-08 search: case-insensitive match over title + keywords joined + summary;
 * body is NOT searched. A blank query matches every article.
 */
function searchArticles(
  articles: readonly HelpArticle[],
  query: string,
): readonly HelpArticle[] {
  const needle = query.toLowerCase().trim()
  if (needle === '') return articles
  return articles.filter((a) => {
    const haystack = `${a.title} ${a.keywords.join(' ')} ${a.summary}`.toLowerCase()
    return haystack.includes(needle)
  })
}

export function HelpPage(): React.JSX.Element {
  const [query, setQuery] = useState('')
  // D-08: 150ms debounce — second element (cancel fn) is intentionally unused.
  const [debouncedQuery] = useDebouncedValue(query, 150)

  // Read once at mount — static module is reload-stable via faker.seed(42) (D-09).
  const allArticles = useMemo(() => listHelpArticles(), [])

  const filtered = useMemo(
    () => searchArticles(allArticles, debouncedQuery),
    [allArticles, debouncedQuery],
  )

  // Pendo `help_search_performed`: the 150ms results debounce settles
  // mid-typing, so tracking waits for a 1s pause and reports each settled,
  // normalized query once (clearing the box re-arms the same query).
  const [trackedQuery] = useDebouncedValue(query, 1000)
  const lastTrackedQueryRef = useRef('')
  useEffect(() => {
    const needle = trackedQuery.toLowerCase().trim()
    if (needle === '') {
      lastTrackedQueryRef.current = ''
      return
    }
    if (needle === lastTrackedQueryRef.current) return
    lastTrackedQueryRef.current = needle
    const results = searchArticles(allArticles, needle)
    pendo.track('help_search_performed', {
      query: needle.slice(0, 100),
      queryLength: needle.length,
      resultsCount: results.length,
      hasResults: results.length > 0,
      totalArticles: allArticles.length,
      matchedTopics: [...new Set(results.map((a) => a.topic))],
    })
  }, [trackedQuery, allArticles])

  return (
    <Stack gap="lg">
      <Title order={3}>Help</Title>
      <HelpSearchInput value={query} onChange={setQuery} />
      {filtered.length === 0 && debouncedQuery.trim() !== ''
        ? <HelpNoResultsState query={debouncedQuery} onClear={() => setQuery('')} />
        : <HelpList articles={filtered} />
      }
    </Stack>
  )
}
