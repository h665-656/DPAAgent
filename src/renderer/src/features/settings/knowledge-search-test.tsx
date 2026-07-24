import type { FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { KnowledgeSearchResultInfo } from '@shared/ipc-contract'

export function KnowledgeSearchTest({
  query,
  results,
  searching,
  onQueryChange,
  onSearch,
}: {
  query: string
  results: KnowledgeSearchResultInfo[] | null
  searching: boolean
  onQueryChange: (value: string) => void
  onSearch: () => void
}) {
  const { t } = useTranslation()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch()
  }

  return (
    <section className="mt-7 border-t border-border/50 pt-5">
      <div className="text-[14px] font-semibold">{t('settings:knowledge.testTitle')}</div>
      <p className="mt-1 text-[11px] text-muted-foreground/75">
        {t('settings:knowledge.testDescription')}
      </p>
      <form className="mt-3 flex gap-2" onSubmit={submit}>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('settings:knowledge.searchPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-[12px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5" />
          {searching ? t('settings:knowledge.searching') : t('settings:knowledge.search')}
        </button>
      </form>
      {results !== null ? (
        results.length ? (
          <div className="mt-3 space-y-2">
            {results.map((result, index) => (
              <article key={`${result.filePath}-${index}`} className="rounded-lg border border-border/50 bg-muted/15 p-3">
                <div className="text-[11px] font-medium">
                  {index + 1}. {result.sourceName} / {result.title}
                </div>
                <div className="mt-1 truncate font-mono text-[9px] text-muted-foreground/60" title={result.filePath}>
                  {result.filePath}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {result.excerpt}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
            {t('settings:knowledge.noResults')}
          </div>
        )
      ) : null}
    </section>
  )
}
