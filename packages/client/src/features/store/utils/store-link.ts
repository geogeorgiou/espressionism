import type { SearchResult } from '@espressionism/store'

import type { StoreSearch } from '../constants'
import { storeFormSchema } from '../constants'
import { agentSearchToForm, compactSearch, formToSearch } from './query'

/**
 * A store link's search params for an agent's search: the filters as the
 * store page would show them had the agent picked them by hand (a rating
 * between the select's steps shows the next one down), minus the defaults.
 * Use with `<Link to="/store" search={…}>`.
 */
export function storeLink(
  search: Pick<SearchResult, 'filters' | 'sort'>,
): StoreSearch {
  const form = storeFormSchema.parse(agentSearchToForm(search))
  return compactSearch(formToSearch(form))
}
