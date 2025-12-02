import {Suspense} from 'react'
import {PortableText} from '@portabletext/react'

import {AllPosts} from '@/app/components/Posts'
import Sidebar from '@/app/components/Sidebar'
import {settingsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export default async function Page() {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
  })

  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-50 via-cream to-coral-50">
        <div className="container">
          <div className="relative min-h-[40vh] mx-auto max-w-4xl pt-32 pb-20 space-y-6 flex flex-col items-center justify-center text-center">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-coral-500 to-amber-500 bg-clip-text text-transparent">
              {settings?.title || 'Maila Walmod'}
            </h1>
            {settings?.description && (
              <div className="prose prose-lg text-warm-700 max-w-2xl">
                <PortableText value={settings.description} />
              </div>
            )}
            <div className="h-1 w-24 bg-gradient-to-r from-purple-500 to-coral-500 rounded-full mt-4"></div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="bg-white">
        <div className="container py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
            {/* Blog Posts */}
            <main>
              <h2 className="text-3xl font-bold text-warm-900 mb-8">Seneste indlæg</h2>
              <Suspense fallback={<div className="text-warm-600">Indlæser indlæg...</div>}>
                {await AllPosts()}
              </Suspense>
            </main>

            {/* Sidebar */}
            <Suspense fallback={<div className="text-warm-600">Indlæser...</div>}>
              {await Sidebar()}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
