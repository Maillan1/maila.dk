import Link from 'next/link'
import {sanityFetch} from '@/sanity/lib/live'
import {allPostsQuery} from '@/sanity/lib/queries'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default async function Sidebar() {
  const {data: posts} = await sanityFetch({
    query: allPostsQuery,
    params: {},
  })

  // Get the 5 most recent posts for the sidebar
  const recentPosts = posts?.slice(0, 5) || []

  return (
    <aside className="space-y-8">
      {/* About Section */}
      <div className="bg-cream border border-warm-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-purple-900 mb-3">Om Maila</h3>
        <p className="text-warm-700 text-sm leading-relaxed">
          Velkommen til mit kreative rum, hvor jeg deler tanker, historier og inspiration.
          Følg med på denne rejse af udforskning og opdagelse.
        </p>
      </div>

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div className="bg-cream border border-warm-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-purple-900 mb-4">Seneste indlæg</h3>
          <ul className="space-y-4">
            {recentPosts.map((post) => (
              <li key={post._id}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group block"
                >
                  <h4 className="font-medium text-warm-900 group-hover:text-purple-600 transition-colors duration-200 line-clamp-2">
                    {post.title}
                  </h4>
                  {post.date && (
                    <time className="text-xs text-warm-500 mt-1 block">
                      {formatDate(post.date)}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categories/Tags - Placeholder for future enhancement */}
      <div className="bg-gradient-to-br from-purple-50 to-coral-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-purple-900 mb-3">Hold kontakt</h3>
        <p className="text-warm-700 text-sm mb-4">
          Følg med for opdateringer og nye indlæg.
        </p>
        <div className="flex gap-3">
          <a
            href="#"
            className="flex-1 text-center py-2 px-3 bg-white border border-warm-300 rounded-lg text-warm-700 hover:border-purple-400 hover:text-purple-600 transition-all duration-200 text-sm font-medium"
          >
            Abonner
          </a>
        </div>
      </div>
    </aside>
  )
}
