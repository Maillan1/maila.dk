import Link from 'next/link'
import {settingsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export default async function Header() {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
  })

  return (
    <header className="fixed z-50 h-24 inset-0 bg-white/95 flex items-center backdrop-blur-lg border-b border-warm-200 shadow-sm">
      <div className="container py-6 px-2 sm:px-6">
        <div className="flex items-center justify-between gap-5">
          <Link className="flex items-center gap-2 group" href="/">
            <span className="text-2xl sm:text-3xl pl-2 font-bold text-purple-600 group-hover:text-coral-500 transition-colors duration-300">
              {settings?.title || 'Maila Walmod'}
            </span>
          </Link>

          <nav>
            <ul
              role="list"
              className="flex items-center gap-6 md:gap-8 leading-5 text-sm sm:text-base tracking-tight"
            >
              <li>
                <Link
                  href="/"
                  className="text-warm-800 hover:text-purple-600 transition-colors duration-200 font-medium"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/posts"
                  className="text-warm-800 hover:text-purple-600 transition-colors duration-200 font-medium"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-warm-800 hover:text-purple-600 transition-colors duration-200 font-medium"
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
