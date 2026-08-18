import { AppShell } from '../components/layout/AppShell'

export default function FoundationPage({ title }: { title: string }) {
  return (
    <AppShell>
      <section className="foundation-page" aria-labelledby="foundation-title">
        <h1 id="foundation-title">{title}</h1>
        <p>This route is ready for migration in a later phase.</p>
      </section>
    </AppShell>
  )
}
