import type { ReactNode } from 'react'
import PageContainer, { PageBody, PageHeader } from '../components/PageContainer'

/**
 * Standard feature page: the shared measure, a quiet header, then the body.
 *
 * Layout and rhythm come entirely from PageContainer, so every page in the app
 * is set to the same column and the same vertical spacing.
 */
export default function SectionPage({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: string
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <PageContainer>
      <PageHeader icon={icon} title={title} description={description} action={action} />
      <PageBody>{children}</PageBody>
    </PageContainer>
  )
}
